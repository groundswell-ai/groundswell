import { describe, it, expect, vi } from 'vitest';
import { WorkflowContextImpl } from '../../core/workflow-context.js';
import { createSuccessResponse, createErrorResponse } from '../../types/agent.js';
import type { PromptLike, AgentLike } from '../../types/workflow-context.js';
import type { WorkflowNode, WorkflowEvent } from '../../types/index.js';

describe('WorkflowContextImpl.replaceLastPromptResult', () => {
  const createMockWorkflow = (): {
    workflow: {
      id: string;
      node: WorkflowNode;
      emitEvent: (event: WorkflowEvent) => void;
      setStatus: (status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled') => void;
      attachChild: (child: any) => void;
    };
    events: WorkflowEvent[];
  } => {
    const events: WorkflowEvent[] = [];
    return {
      workflow: {
        id: 'test-workflow-id',
        node: {
          id: 'root-node',
          name: 'TestWorkflow',
          parent: null,
          children: [],
          status: 'running',
          logs: [],
          events: [],
          stateSnapshot: null,
        },
        emitEvent: (event: WorkflowEvent) => events.push(event),
        setStatus: vi.fn(),
        attachChild: vi.fn(),
      },
      events,
    };
  };

  const createMockAgent = (): AgentLike => {
    return {
      prompt: vi.fn(),
    };
  };

  const createMockPrompt = <T>(id: string): PromptLike<T> => {
    return {
      id,
      buildUserMessage: () => `Mock prompt ${id}`,
      validateResponse: (data: unknown) => data as T,
    };
  };

  describe('success response handling', () => {
    it('should extract data from successful AgentResponse', async () => {
      // Arrange
      const { workflow } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();
      const prompt = createMockPrompt<string>('prompt-1');
      const expectedData = 'test-result';

      const mockResponse = createSuccessResponse(expectedData, {
        agentId: 'test-agent',
        timestamp: Date.now(),
      });

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act
      const result = await context.replaceLastPromptResult(prompt, agent);

      // Assert
      expect(result).toBe(expectedData);
      expect(agent.prompt).toHaveBeenCalledWith(prompt);
    });

    it('should extract complex data from successful AgentResponse', async () => {
      // Arrange
      const { workflow } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();
      const prompt = createMockPrompt<{ name: string; value: number }>('prompt-2');

      const expectedData = { name: 'test', value: 42 };

      const mockResponse = createSuccessResponse(expectedData, {
        agentId: 'test-agent',
        timestamp: Date.now(),
      });

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act
      const result = await context.replaceLastPromptResult(prompt, agent);

      // Assert
      expect(result).toEqual(expectedData);
      expect(result.name).toBe('test');
      expect(result.value).toBe(42);
    });

    it('should mark revision node as completed on success', async () => {
      // Arrange
      const { workflow, events } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();
      const prompt = createMockPrompt<string>('prompt-3');

      const mockResponse = createSuccessResponse('success', {
        agentId: 'test-agent',
        timestamp: Date.now(),
      });

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act
      await context.replaceLastPromptResult(prompt, agent);

      // Assert
      const stepEndEvents = events.filter((e) => e.type === 'stepEnd');
      expect(stepEndEvents.length).toBeGreaterThan(0);

      const revisionNode = workflow.node.children.find(
        (c) => c.name === `revision:${prompt.id}`
      );
      expect(revisionNode?.status).toBe('completed');
    });

    it('should emit stepEnd event on success', async () => {
      // Arrange
      const { workflow, events } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();
      const prompt = createMockPrompt<string>('prompt-4');

      const mockResponse = createSuccessResponse('data', {
        agentId: 'test-agent',
        timestamp: Date.now(),
      });

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act
      await context.replaceLastPromptResult(prompt, agent);

      // Assert
      const stepEndEvents = events.filter((e) => e.type === 'stepEnd');
      expect(stepEndEvents.length).toBeGreaterThan(0);
      expect(stepEndEvents[0].step).toBe(`revision:${prompt.id}`);
    });
  });

  describe('error response handling', () => {
    it('should throw exception with error message on error response', async () => {
      // Arrange
      const { workflow } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();
      const prompt = createMockPrompt<string>('prompt-error-1');

      const mockResponse = createErrorResponse(
        'VALIDATION_FAILED',
        'Response validation failed'
      );

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(context.replaceLastPromptResult(prompt, agent)).rejects.toThrow(
        '[VALIDATION_FAILED] Response validation failed'
      );
    });

    it('should preserve error code in thrown exception', async () => {
      // Arrange
      const { workflow } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();
      const prompt = createMockPrompt<string>('prompt-error-2');

      const mockResponse = createErrorResponse(
        'API_REQUEST_FAILED',
        'External API error'
      );

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(context.replaceLastPromptResult(prompt, agent)).rejects.toThrow(
        '[API_REQUEST_FAILED] External API error'
      );
    });

    it('should mark revision node as failed on error response', async () => {
      // Arrange
      const { workflow, events } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();
      const prompt = createMockPrompt<string>('prompt-error-3');

      const mockResponse = createErrorResponse(
        'EXECUTION_FAILED',
        'Agent execution failed'
      );

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(context.replaceLastPromptResult(prompt, agent)).rejects.toThrow();

      const revisionNode = workflow.node.children.find(
        (c) => c.name === `revision:${prompt.id}`
      );
      expect(revisionNode?.status).toBe('failed');
    });

    it('should emit error event on error response', async () => {
      // Arrange
      const { workflow, events } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();
      const prompt = createMockPrompt<string>('prompt-error-4');

      const mockResponse = createErrorResponse(
        'TOOL_EXECUTION_FAILED',
        'Tool call failed'
      );

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(context.replaceLastPromptResult(prompt, agent)).rejects.toThrow();

      const errorEvents = events.filter((e) => e.type === 'error');
      expect(errorEvents.length).toBeGreaterThan(0);
      expect(errorEvents[0].error?.message).toContain('[TOOL_EXECUTION_FAILED]');
    });

    it('should preserve error details in thrown exception name', async () => {
      // Arrange
      const { workflow } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();
      const prompt = createMockPrompt<string>('prompt-error-5');

      const mockResponse = createErrorResponse(
        'INVALID_RESPONSE_FORMAT',
        'Invalid JSON response'
      );

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act & Assert
      await expect(context.replaceLastPromptResult(prompt, agent)).rejects.toThrow(
        expect.objectContaining({
          name: 'AgentPromptError',
        })
      );
    });
  });

  describe('revision node behavior', () => {
    it('should mark previous completed node as revised', async () => {
      // Arrange
      const { workflow } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();

      // Add a previous completed node
      const previousNode: WorkflowNode = {
        id: 'previous-node',
        name: 'previous-step',
        parent: workflow.node,
        children: [],
        status: 'completed',
        logs: [],
        events: [],
        stateSnapshot: null,
      };
      workflow.node.children.push(previousNode);

      const prompt = createMockPrompt<string>('prompt-revision-1');

      const mockResponse = createSuccessResponse('revised-result', {
        agentId: 'test-agent',
        timestamp: Date.now(),
      });

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act
      await context.replaceLastPromptResult(prompt, agent);

      // Assert
      expect(previousNode.logs.length).toBeGreaterThan(0);
      expect(previousNode.logs[0].message).toContain('Revised by');
    });

    it('should attach revision node as sibling', async () => {
      // Arrange
      const { workflow } = createMockWorkflow();
      const context = new WorkflowContextImpl(workflow);
      const agent = createMockAgent();
      const prompt = createMockPrompt<string>('prompt-revision-2');

      const mockResponse = createSuccessResponse('result', {
        agentId: 'test-agent',
        timestamp: Date.now(),
      });

      vi.mocked(agent.prompt).mockResolvedValue(mockResponse);

      // Act
      await context.replaceLastPromptResult(prompt, agent);

      // Assert
      const revisionNode = workflow.node.children.find(
        (c) => c.name === `revision:${prompt.id}`
      );
      expect(revisionNode).toBeDefined();
      expect(revisionNode?.parent).toBe(workflow.node);
    });
  });
});
