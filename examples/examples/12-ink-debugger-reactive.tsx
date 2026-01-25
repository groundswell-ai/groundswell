#!/usr/bin/env node
/**
 * Integration Example: Reactive Workflow Tree Debugger
 *
 * This example demonstrates:
 * - Creating a workflow with parent-child relationships
 * - Attaching WorkflowTreeDebugger to observe execution
 * - Rendering reactive Ink component that updates in real-time
 * - Using maxFps throttling for smooth updates
 *
 * Run with: tsx examples/examples/12-ink-debugger-reactive.tsx
 * Or: npm run start:reactive-debugger
 */

import React from 'react';
import { render } from 'ink';
import { Workflow, Step, Task, WorkflowTreeDebugger } from '../../src/index.js';
import { WorkflowTreeDebuggerUI } from '../components/WorkflowTreeDebuggerUI.js';

/**
 * Install Dependencies workflow
 */
class InstallDepsWorkflow extends Workflow {
  @Step({ trackTiming: true })
  async npmInstall(): Promise<void> {
    this.logger.info('Installing packages...');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  @Step({ trackTiming: true })
  async npmAudit(): Promise<void> {
    this.logger.info('Auditing packages...');
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  async run(): Promise<void> {
    this.setStatus('running');
    await this.npmInstall();
    await this.npmAudit();
    this.setStatus('completed');
  }
}

/**
 * Run Tests workflow
 */
class RunTestsWorkflow extends Workflow {
  @Step({ trackTiming: true })
  async unitTests(): Promise<void> {
    this.logger.info('Running unit tests...');
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  @Step({ trackTiming: true })
  async integrationTests(): Promise<void> {
    this.logger.info('Running integration tests...');
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  async run(): Promise<void> {
    this.setStatus('running');
    await this.unitTests();
    await this.integrationTests();
    this.setStatus('completed');
  }
}

/**
 * Build Project workflow (root)
 */
class BuildProjectWorkflow extends Workflow {
  @Task()
  async spawnDeps(): Promise<InstallDepsWorkflow> {
    this.logger.info('Creating Install Dependencies workflow');
    return new InstallDepsWorkflow('Install Dependencies', this);
  }

  @Task()
  async spawnTests(): Promise<RunTestsWorkflow> {
    this.logger.info('Creating Run Tests workflow');
    return new RunTestsWorkflow('Run Tests', this);
  }

  @Step({ trackTiming: true })
  async initialize(): Promise<void> {
    this.logger.info('Initializing build...');
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  async run(): Promise<void> {
    this.setStatus('running');
    this.logger.info('Starting build process...');

    await this.initialize();

    // Create and run child workflows
    const deps = await this.spawnDeps();
    await deps.run();

    const tests = await this.spawnTests();
    await tests.run();

    this.setStatus('completed');
    this.logger.info('Build process completed!');
  }
}

// Create the workflow instance
const workflow = new BuildProjectWorkflow('Build Project');

// Attach treeDebugger to workflow (debugger is a reserved keyword)
const treeDebugger = new WorkflowTreeDebugger(workflow);

// Start workflow in background (non-blocking)
// This allows the UI to render immediately and update as the workflow executes
workflow.run().catch((err) => {
  console.error('Workflow failed:', err);
});

// Render the reactive UI with throttling (maxFps: 30) to prevent flickering
render(
  <WorkflowTreeDebuggerUI treeDebugger={treeDebugger} />,
  { exitOnCtrlC: true, maxFps: 30 }
);
