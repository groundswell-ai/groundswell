import { describe, it, expect } from 'vitest';
import { Workflow, WorkflowObserver, WorkflowNode, LogEntry, WorkflowEvent, ObservedState, getObservedState } from '../../index.js';

class SimpleWorkflow extends Workflow {
  async run(): Promise<string> {
    this.setStatus('running');
    this.logger.info('Running simple workflow');
    this.setStatus('completed');
    return 'done';
  }
}

describe('Workflow Name Validation', () => {
  it('should reject empty string name', () => {
    expect(() => new SimpleWorkflow('')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should reject whitespace-only name (spaces)', () => {
    expect(() => new SimpleWorkflow('   ')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should reject whitespace-only name (tabs)', () => {
    expect(() => new SimpleWorkflow('\t\t')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should reject whitespace-only name (newlines)', () => {
    expect(() => new SimpleWorkflow('\n\n')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should reject whitespace-only name (mixed whitespace)', () => {
    expect(() => new SimpleWorkflow('  \t\n  ')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should reject name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    expect(() => new SimpleWorkflow(longName)).toThrow('Workflow name cannot exceed 100 characters');
  });

  it('should accept name with exactly 100 characters', () => {
    const exactly100 = 'a'.repeat(100);
    const wf = new SimpleWorkflow(exactly100);
    expect(wf.getNode().name).toBe(exactly100);
    expect(wf.getNode().name.length).toBe(100);
  });

  it('should accept valid names with leading/trailing whitespace', () => {
    const wf1 = new SimpleWorkflow('  MyWorkflow  ');
    expect(wf1.getNode().name).toBe('  MyWorkflow  ');

    const wf2 = new SimpleWorkflow('\tValidName\t');
    expect(wf2.getNode().name).toBe('\tValidName\t');
  });

  it('should use class name when name is undefined', () => {
    const wf = new SimpleWorkflow();
    expect(wf.getNode().name).toBe('SimpleWorkflow');
  });

  it('should use class name when name is null', () => {
    const wf = new SimpleWorkflow(null as any);
    expect(wf.getNode().name).toBe('SimpleWorkflow');
  });

  it('should validate both constructor patterns - class-based with empty name', () => {
    expect(() => new SimpleWorkflow('')).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should validate both constructor patterns - functional with empty name', () => {
    expect(() => new Workflow({ name: '' }, async () => {})).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should validate both constructor patterns - functional with whitespace name', () => {
    expect(() => new Workflow({ name: '   ' }, async () => {})).toThrow('Workflow name cannot be empty or whitespace only');
  });

  it('should validate both constructor patterns - functional with name exceeding 100 characters', () => {
    const longName = 'a'.repeat(101);
    expect(() => new Workflow({ name: longName }, async () => {})).toThrow('Workflow name cannot exceed 100 characters');
  });

  it('should accept valid name in functional pattern', () => {
    const wf = new Workflow({ name: 'ValidFunctionalWorkflow' }, async () => 'done');
    expect(wf.getNode().name).toBe('ValidFunctionalWorkflow');
  });

  // Security validation tests
  const INVALID_NAME_MESSAGE =
    'Invalid workflow name. Names may contain letters, numbers, spaces, hyphens, underscores, and emoji.';

  describe('Security - Control Characters', () => {
    it('should reject names with null byte', () => {
      expect(() => new SimpleWorkflow('test\x00name')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with bell character', () => {
      expect(() => new SimpleWorkflow('test\x07name')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with escape character', () => {
      expect(() => new SimpleWorkflow('test\x1bname')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with delete character', () => {
      expect(() => new SimpleWorkflow('test\x7fname')).toThrow(INVALID_NAME_MESSAGE);
    });

    // Parameterized tests for all ASCII control characters (0x00-0x1F, 0x7F)
    it.each([
      ['\x00', 'null byte'],
      ['\x01', 'start of heading'],
      ['\x02', 'start of text'],
      ['\x03', 'end of text'],
      ['\x04', 'end of transmission'],
      ['\x05', 'enquiry'],
      ['\x06', 'acknowledge'],
      ['\x07', 'bell'],
      ['\x08', 'backspace'],
      ['\x09', 'horizontal tab'],
      ['\x0A', 'line feed'],
      ['\x0B', 'vertical tab'],
      ['\x0C', 'form feed'],
      ['\x0D', 'carriage return'],
      ['\x0E', 'shift out'],
      ['\x0F', 'shift in'],
      ['\x10', 'data link escape'],
      ['\x11', 'device control 1'],
      ['\x12', 'device control 2'],
      ['\x13', 'device control 3'],
      ['\x14', 'device control 4'],
      ['\x15', 'negative acknowledge'],
      ['\x16', 'synchronous idle'],
      ['\x17', 'end of transmission block'],
      ['\x18', 'cancel'],
      ['\x19', 'end of medium'],
      ['\x1A', 'substitute'],
      ['\x1B', 'escape'],
      ['\x1C', 'file separator'],
      ['\x1D', 'group separator'],
      ['\x1E', 'record separator'],
      ['\x1F', 'unit separator'],
      ['\x7F', 'delete'],
    ])('should reject names with %s character (0x%s)', (char, name) => {
      const charCode = char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
      expect(() => new SimpleWorkflow(`test${char}name`)).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject control characters at the beginning', () => {
      expect(() => new SimpleWorkflow('\x00MyWorkflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject control characters at the end', () => {
      expect(() => new SimpleWorkflow('MyWorkflow\x1B')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject multiple control characters', () => {
      expect(() => new SimpleWorkflow('test\x00\x07\x1Bname')).toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe('Security - HTML/JavaScript Injection', () => {
    it('should reject names with script tags', () => {
      expect(() => new SimpleWorkflow('<script>alert("xss")</script>')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with iframe tags', () => {
      expect(() => new SimpleWorkflow('<iframe>evil</iframe>')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with javascript: protocol', () => {
      expect(() => new SimpleWorkflow('javascript:alert(1)')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with JAVASCRIPT: (uppercase)', () => {
      expect(() => new SimpleWorkflow('JAVASCRIPT:alert(1)')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with JavaScript event handlers', () => {
      expect(() => new SimpleWorkflow('<img onerror=alert(1)>')).toThrow(INVALID_NAME_MESSAGE);
    });

    // Parameterized tests for comprehensive XSS coverage
    it.each([
      ['<script>alert("xss")</script>', 'script tag'],
      ['<script>evil()</script>', 'script tag lowercase'],
      ['<SCRIPT>evil()</SCRIPT>', 'script tag uppercase'],
      ['<iframe>evil</iframe>', 'iframe tag'],
      ['<IFRAME>evil</IFRAME>', 'iframe tag uppercase'],
      ['<img src=x onerror=alert(1)>', 'img with onerror'],
      ['<img src=x onerror="alert(1)">', 'img with onerror quoted'],
      ['<svg onload=alert(1)>', 'svg with onload'],
      ['<body onload=alert(1)>', 'body with onload'],
      ['<input onfocus=alert(1)>', 'input with onfocus'],
      ['<select onfocus=alert(1)>', 'select with onfocus'],
      ['<textarea onfocus=alert(1)>', 'textarea with onfocus'],
      ['<a href="javascript:alert(1)">link</a>', 'anchor with javascript'],
      ['<A HREF="javascript:alert(1)">link</A>', 'anchor with javascript uppercase'],
      ['<div onclick="alert(1)">click</div>', 'div with onclick'],
      ['<DIV ONCLICK="alert(1)">click</DIV>', 'div with onclick uppercase'],
      ['<span onmouseover="alert(1)">hover</span>', 'span with onmouseover'],
      ['<details ontoggle="alert(1)">', 'details with ontoggle'],
      ['<marquee onstart="alert(1)">', 'marquee with onstart'],
      ['<isindex action="javascript:alert(1)">', 'isindex with javascript action'],
      ['<style>body{background:red}</style>', 'style tag'],
      ['<STYLE>body{background:red}</STYLE>', 'style tag uppercase'],
      ['<link rel="stylesheet" href="evil.css">', 'link tag'],
      ['<link REL="stylesheet" href="evil.css">', 'link tag uppercase'],
      ['<meta http-equiv="refresh" content="0;url=javascript:alert(1)">', 'meta with refresh'],
      ['<object data="javascript:alert(1)">', 'object with javascript data'],
      ['<embed src="javascript:alert(1)">', 'embed with javascript src'],
      ['javascript:alert(1)', 'javascript protocol'],
      ['JAVASCRIPT:alert(1)', 'javascript protocol uppercase'],
      ['JavaSCriPt:alert(1)', 'javascript protocol mixed case'],
      ['JaVaScRiPt:alert(1)', 'javascript protocol random case'],
      ['javascript:void(0)', 'javascript void'],
      ['javascript:/*comment*/alert(1)', 'javascript with comment'],
      ['<script>alert(String.fromCharCode(88,83,83))</script>', 'script with char codes'],
      ['<img src=x onerror="&#97;&#108;&#101;&#114;&#116;(1)">', 'img with html entity encoding'],
      ['<img src=x onerror="\\x61\\x6c\\x65\\x72\\x74(1)">', 'img with hex encoding'],
      ['<script src="evil.js"></script>', 'script with external src'],
      ['<script/SRC="evil.js"></script>', 'script with src and slash'],
      ['<script>alert(/xss/)</script>', 'script with regex'],
      ['<!--<script>alert(1)</script>-->', 'script in html comment'],
    ])('should reject XSS payload: %s', (payload, description) => {
      expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject partial HTML tags', () => {
      expect(() => new SimpleWorkflow('<script')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('script>')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('<img')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('<>')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject HTML tags at beginning', () => {
      expect(() => new SimpleWorkflow('<script>workflow</script>')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject HTML tags at end', () => {
      expect(() => new SimpleWorkflow('workflow<img onerror=alert(1)>')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject HTML tags in middle', () => {
      expect(() => new SimpleWorkflow('my<div>xss</div>workflow')).toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe('Security - Path Traversal', () => {
    it('should reject names with ../ pattern', () => {
      expect(() => new SimpleWorkflow('../etc/passwd')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with ..\\ pattern', () => {
      expect(() => new SimpleWorkflow('..\\windows\\system32')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with multiple .. patterns', () => {
      expect(() => new SimpleWorkflow('../../etc/passwd')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with .. in the middle', () => {
      expect(() => new SimpleWorkflow('my../workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    // Parameterized tests for comprehensive path traversal coverage
    it.each([
      ['../etc/passwd', 'Unix parent directory'],
      ['..\\windows\\system32', 'Windows parent directory'],
      ['../../etc/passwd', 'double parent Unix'],
      ['..\\..\\windows\\system32', 'double parent Windows'],
      ['../../../etc/passwd', 'triple parent Unix'],
      ['..\\..\\..\\windows\\system32', 'triple parent Windows'],
      ['./../etc/passwd', 'current then parent'],
      ['..\\./windows\\system32', 'mixed separators'],
      ['./../', 'current then parent with trailing slash'],
      ['./..\\', 'mixed separators with trailing'],
      ['my../workflow', 'embedded parent reference'],
      ['workflow..../test', 'trailing parent reference'],
      ['my..workflow', 'double dot in middle'],
      ['.../test', 'multiple dots with forward slash'],
      ['....\\test', 'multiple dots with backslash'],
      ['...../test', 'five dots with slash'],
      ['/../test', 'absolute path with parent'],
      ['\\..\\test', 'Windows absolute with parent'],
      ['/../../etc/passwd', 'absolute with multiple parents'],
      ['..', 'just double dot'],
      ['...', 'three dots'],
      ['....', 'four dots'],
      ['.. /test', 'double dot with space'],
      ['.. ./test', 'double dot space dot'],
      ['..../test', 'triple dot with slash'],
      ['../', 'parent directory with trailing slash'],
      ['..\\', 'parent directory with trailing backslash'],
      ['../.', 'parent then current'],
      ['../..', 'parent then parent'],
      ['./..', 'current then parent'],
      ['././..', 'current current parent'],
      ['a/../b', 'parent in middle of path'],
      ['a/../../b', 'double parent in middle'],
    ])('should reject path traversal: %s', (payload, description) => {
      expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject path traversal at beginning', () => {
      expect(() => new SimpleWorkflow('..../workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject path traversal at end', () => {
      expect(() => new SimpleWorkflow('workflow../..')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject path traversal in middle', () => {
      expect(() => new SimpleWorkflow('my../workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject consecutive double dots', () => {
      expect(() => new SimpleWorkflow('....')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('.....')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('......')).toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe('Security - File System Characters', () => {
    it('should reject names with forward slash', () => {
      expect(() => new SimpleWorkflow('my/workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with backslash', () => {
      expect(() => new SimpleWorkflow('my\\workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with colon', () => {
      expect(() => new SimpleWorkflow('my:workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with asterisk', () => {
      expect(() => new SimpleWorkflow('my*workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with question mark', () => {
      expect(() => new SimpleWorkflow('my?workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with double quote', () => {
      expect(() => new SimpleWorkflow('my"workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with angle brackets', () => {
      expect(() => new SimpleWorkflow('my<wor>flow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with pipe', () => {
      expect(() => new SimpleWorkflow('my|workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    // Parameterized tests for all file system characters
    it.each([
      ['/', 'forward slash', 'my/workflow'],
      ['\\', 'backslash', 'my\\workflow'],
      [':', 'colon', 'my:workflow'],
      ['*', 'asterisk', 'my*workflow'],
      ['?', 'question mark', 'my?workflow'],
      ['"', 'double quote', 'my"workflow'],
      ['<', 'less than', 'my<workflow'],
      ['>', 'greater than', 'my>workflow'],
      ['|', 'pipe', 'my|workflow'],
    ])('should reject names with %s', (char, name, payload) => {
      expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject file system characters at beginning', () => {
      expect(() => new SimpleWorkflow('/workflow')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('\\workflow')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow(':workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject file system characters at end', () => {
      expect(() => new SimpleWorkflow('workflow/')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('workflow\\')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('workflow:')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject multiple file system characters', () => {
      expect(() => new SimpleWorkflow('my//workflow')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('my\\\\workflow')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('my**workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject combinations of file system characters', () => {
      expect(() => new SimpleWorkflow('my/\\workflow')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('my:*workflow')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('my<>workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should handle names that look like Windows reserved device names', () => {
      // CON, PRN, AUX, NUL, COM1-9, LPT1-9 are reserved on Windows
      // These contain valid characters per our allowlist, so they are accepted
      // OS-specific reserved name validation would be a separate concern
      expect(() => new SimpleWorkflow('CON')).not.toThrow();
      expect(() => new SimpleWorkflow('PRN')).not.toThrow();
      expect(() => new SimpleWorkflow('AUX')).not.toThrow();
      expect(() => new SimpleWorkflow('NUL')).not.toThrow();
      expect(() => new SimpleWorkflow('COM1')).not.toThrow();
      expect(() => new SimpleWorkflow('LPT1')).not.toThrow();
      // Note: OS-specific reserved name validation is not part of current implementation
    });
  });

  describe('Security - Allowed Characters (Positive Cases)', () => {
    it('should accept alphanumeric names', () => {
      expect(() => new SimpleWorkflow('Workflow123')).not.toThrow();
      expect(new SimpleWorkflow('Workflow123').getNode().name).toBe('Workflow123');
    });

    it('should accept names with spaces', () => {
      expect(() => new SimpleWorkflow('My Workflow')).not.toThrow();
      expect(new SimpleWorkflow('My Workflow').getNode().name).toBe('My Workflow');
    });

    it('should accept names with hyphens', () => {
      expect(() => new SimpleWorkflow('my-workflow')).not.toThrow();
      expect(new SimpleWorkflow('my-workflow').getNode().name).toBe('my-workflow');
    });

    it('should accept names with underscores', () => {
      expect(() => new SimpleWorkflow('my_workflow')).not.toThrow();
      expect(new SimpleWorkflow('my_workflow').getNode().name).toBe('my_workflow');
    });

    it('should accept names with mixed allowed characters', () => {
      expect(() => new SimpleWorkflow('My_Workflow-123 Test')).not.toThrow();
      expect(new SimpleWorkflow('My_Workflow-123 Test').getNode().name).toBe('My_Workflow-123 Test');
    });

    it('should accept uppercase letters', () => {
      expect(() => new SimpleWorkflow('UPPERCASE')).not.toThrow();
    });

    it('should accept lowercase letters', () => {
      expect(() => new SimpleWorkflow('lowercase')).not.toThrow();
    });

    it('should accept numbers', () => {
      expect(() => new SimpleWorkflow('123456')).not.toThrow();
    });

    it('should accept consecutive allowed characters', () => {
      expect(() => new SimpleWorkflow('my--workflow__test  123')).not.toThrow();
    });

    it('should accept names starting with space', () => {
      expect(() => new SimpleWorkflow(' MyWorkflow')).not.toThrow();
    });

    it('should accept names ending with space', () => {
      expect(() => new SimpleWorkflow('MyWorkflow ')).not.toThrow();
    });

    it('should accept names with only hyphens', () => {
      expect(() => new SimpleWorkflow('---')).not.toThrow();
    });

    it('should accept names with only underscores', () => {
      expect(() => new SimpleWorkflow('___')).not.toThrow();
    });

    it('should accept names with only spaces', () => {
      expect(() => new SimpleWorkflow('   ')).toThrow('Workflow name cannot be empty or whitespace only');
    });

    it('should accept single character names', () => {
      expect(() => new SimpleWorkflow('a')).not.toThrow();
      expect(() => new SimpleWorkflow('A')).not.toThrow();
      expect(() => new SimpleWorkflow('1')).not.toThrow();
      expect(() => new SimpleWorkflow('_')).not.toThrow();
      expect(() => new SimpleWorkflow('-')).not.toThrow();
      expect(() => new SimpleWorkflow(' ')).toThrow('Workflow name cannot be empty or whitespace only'); // Single space - fails after trim
    });

    it('should accept names with mixed case', () => {
      expect(() => new SimpleWorkflow('MyWorkflowName')).not.toThrow();
      expect(() => new SimpleWorkflow('camelCaseWorkflow')).not.toThrow();
      expect(() => new SimpleWorkflow('PascalCaseWorkflow')).not.toThrow();
      expect(() => new SimpleWorkflow('snake_case_workflow')).not.toThrow();
      expect(() => new SimpleWorkflow('kebab-case-workflow')).not.toThrow();
    });

    // Parameterized tests for valid names
    it.each([
      ['Workflow123', 'alphanumeric'],
      ['My Workflow', 'with spaces'],
      ['my-workflow', 'with hyphens'],
      ['my_workflow', 'with underscores'],
      ['My-Workflow_123 Test', 'all allowed characters'],
      ['ABC', 'uppercase only'],
      ['abc', 'lowercase only'],
      ['123', 'numbers only'],
      ['a', 'single letter'],
      ['_', 'single underscore'],
      ['-', 'single hyphen'],
      ['MyWorkflowName', 'mixed case'],
      ['workflow with-many_allowed-chars', 'complex valid name'],
      ['  leading space', 'leading space'],
      ['trailing space  ', 'trailing space'],
      ['multiple   spaces', 'multiple spaces'],
      ['a-b_c d', 'single chars with separators'],
    ])('should accept valid name: %s', (name, description) => {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        // Names that are only whitespace should throw empty error
        expect(() => new SimpleWorkflow(name)).toThrow('Workflow name cannot be empty or whitespace only');
      } else {
        expect(() => new SimpleWorkflow(name)).not.toThrow();
        const wf = new SimpleWorkflow(name);
        expect(wf.getNode().name).toBe(name);
      }
    });
  });

  describe('Security - Allowed Characters (Negative Cases)', () => {
    // Parameterized tests for characters not in allowlist
    it.each([
      ['my.workflow', 'period'],
      ['my@workflow', 'at sign'],
      ['my#workflow', 'hash'],
      ['my$workflow', 'dollar sign'],
      ['my%workflow', 'percent'],
      ['my&workflow', 'ampersand'],
      ['my*workflow', 'asterisk'],
      ['my+workflow', 'plus sign'],
      ['my=workflow', 'equals sign'],
      ['my,workflow', 'comma'],
      ['my;workflow', 'semicolon'],
      ['my:workflow', 'colon'],
      ['my!workflow', 'exclamation mark'],
      ['my?workflow', 'question mark'],
      ['my(workflow', 'left parenthesis'],
      ['my)workflow', 'right parenthesis'],
      ['my{workflow', 'left brace'],
      ['my}workflow', 'right brace'],
      ['my[workflow', 'left bracket'],
      ['my]workflow', 'right bracket'],
      ['my|workflow', 'pipe'],
      ['my\\workflow', 'backslash'],
      ['my/workflow', 'forward slash'],
      ['my<workflow', 'less than'],
      ['my>workflow', 'greater than'],
      ["my'workflow", 'single quote'],
      ['my"workflow', 'double quote'],
      ['my`workflow', 'backtick'],
      ['my~workflow', 'tilde'],
      ['my^workflow', 'caret'],
      ['my&workflow', 'ampersand'],
      ['my¬workflow', 'not sign'],
      ['my£workflow', 'pound sign'],
      ['my€workflow', 'euro sign'],
      ['my¥workflow', 'yen sign'],
      ['my¢workflow', 'cent sign'],
      ['my§workflow', 'section sign'],
      ['my€workflow', 'euro sign (currency symbol, not emoji)'],
      ['my@workflow', 'at symbol'],
      ['my#workflow', 'hash/pound'],
      ['my$workflow', 'dollar'],
      ['my%workflow', 'percent'],
      ['my&workflow', 'ampersand'],
      ['my*workflow', 'asterisk'],
      ['my+workflow', 'plus'],
      ['my=workflow', 'equals'],
      ['my,workflow', 'comma'],
      ['my;workflow', 'semicolon'],
      ['my:workflow', 'colon'],
      ['my!workflow', 'exclamation'],
      ['my?workflow', 'question mark'],
      ['my(workflow', 'left paren'],
      ['my)workflow', 'right paren'],
      ['my{workflow', 'left brace'],
      ['my}workflow', 'right brace'],
      ['my[workflow', 'left bracket'],
      ['my]workflow', 'right bracket'],
      ['my|workflow', 'pipe'],
      ['my\\workflow', 'backslash'],
      ['my/workflow', 'forward slash'],
      ['my<workflow', 'less than'],
      ['my>workflow', 'greater than'],
      ["my'workflow", 'single quote'],
      ['my"workflow', 'double quote'],
      ['my`workflow', 'backtick'],
    ])('should reject names with %s', (payload, description) => {
      expect(() => new SimpleWorkflow(payload)).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject names with multiple invalid characters', () => {
      expect(() => new SimpleWorkflow('my.workflow@test')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('my$workflow#test')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('my!workflow?test')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject invalid characters at beginning', () => {
      expect(() => new SimpleWorkflow('.workflow')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('@workflow')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('#workflow')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should reject invalid characters at end', () => {
      expect(() => new SimpleWorkflow('workflow.')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('workflow@')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('workflow#')).toThrow(INVALID_NAME_MESSAGE);
    });

    it('should accept Unicode emoji symbols (©, ®, ™)', () => {
      // These are classified as Unicode emoji and are therefore allowed.
      expect(() => new SimpleWorkflow('workflow©')).not.toThrow();
      expect(() => new SimpleWorkflow('workflow™')).not.toThrow();
      expect(() => new SimpleWorkflow('workflow®')).not.toThrow();
    });

    it('should accept emojis', () => {
      expect(() => new SimpleWorkflow('workflow😀')).not.toThrow();
      expect(() => new SimpleWorkflow('workflow🚀')).not.toThrow();
      expect(() => new SimpleWorkflow('workflow✨')).not.toThrow();
      expect(() => new SimpleWorkflow('workflow❤️')).not.toThrow(); // VS-16 sequence
      expect(() => new SimpleWorkflow('👨‍👩‍👧 Family')).not.toThrow(); // ZWJ sequence
    });

    it('should accept non-ASCII letters from any script', () => {
      expect(() => new SimpleWorkflow('workflowé')).not.toThrow();
      expect(() => new SimpleWorkflow('workflöw')).not.toThrow();
      expect(() => new SimpleWorkflow('workfløw')).not.toThrow();
      expect(() => new SimpleWorkflow('工作流')).not.toThrow();
      expect(() => new SimpleWorkflow('测试工作流')).not.toThrow();
      expect(() => new SimpleWorkflow('العملية')).not.toThrow();
    });

    it('should reject null bytes and other control characters', () => {
      expect(() => new SimpleWorkflow('workflow\x00')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('workflow\x01')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('workflow\x1B')).toThrow(INVALID_NAME_MESSAGE);
      expect(() => new SimpleWorkflow('workflow\x7F')).toThrow(INVALID_NAME_MESSAGE);
    });
  });

  describe('Security - Both Constructor Patterns', () => {
    // Helper function to test both patterns
    const testBothPatterns = (name: string, shouldThrow: boolean, expectedMessage?: string) => {
      const executor = async () => {};

      // Class-based pattern
      if (shouldThrow) {
        expect(() => new SimpleWorkflow(name)).toThrow(expectedMessage || INVALID_NAME_MESSAGE);
      } else {
        expect(() => new SimpleWorkflow(name)).not.toThrow();
        const wf = new SimpleWorkflow(name);
        expect(wf.getNode().name).toBe(name);
      }

      // Functional pattern
      if (shouldThrow) {
        expect(() => new Workflow({ name }, executor)).toThrow(expectedMessage || INVALID_NAME_MESSAGE);
      } else {
        expect(() => new Workflow({ name }, executor)).not.toThrow();
        const wf = new Workflow({ name }, executor);
        expect(wf.getNode().name).toBe(name);
      }
    };

    it('should reject control characters in both patterns', () => {
      testBothPatterns('test\x00name', true);
    });

    it('should reject XSS in both patterns', () => {
      testBothPatterns('<script>alert(1)</script>', true);
    });

    it('should reject path traversal in both patterns', () => {
      testBothPatterns('../etc/passwd', true);
    });

    it('should reject file system characters in both patterns', () => {
      testBothPatterns('my/workflow', true);
    });

    it('should accept valid names in both patterns', () => {
      testBothPatterns('My-Workflow_123', false);
    });

    it('should have consistent error messages across patterns', () => {
      const invalidNames = ['<script>', '../etc/passwd', 'test\x00name', 'my/workflow'];
      const executor = async () => {};

      invalidNames.forEach(name => {
        let classError: Error | undefined;
        let functionalError: Error | undefined;

        try {
          new SimpleWorkflow(name);
        } catch (e) {
          classError = e as Error;
        }

        try {
          new Workflow({ name }, executor);
        } catch (e) {
          functionalError = e as Error;
        }

        expect(classError?.message).toBe(functionalError?.message);
        expect(classError?.message).toBe(INVALID_NAME_MESSAGE);
      });
    });

    // Parameterized tests for both patterns
    describe.each([
      ['control character', 'test\x00name', true],
      ['script tag', '<script>alert(1)</script>', true],
      ['javascript protocol', 'javascript:alert(1)', true],
      ['path traversal', '../etc/passwd', true],
      ['forward slash', 'my/workflow', true],
      ['backslash', 'my\\workflow', true],
      ['asterisk', 'my*workflow', true],
      ['valid alphanumeric', 'Workflow123', false],
      ['valid with spaces', 'My Workflow', false],
      ['valid with hyphens', 'my-workflow', false],
      ['valid with underscores', 'my_workflow', false],
      ['valid complex', 'My-Workflow_123 Test', false],
    ])('Security validation: %s', (description, name, shouldThrow) => {
      const executor = async () => {};

      it('should work in class-based pattern', () => {
        if (shouldThrow) {
          expect(() => new SimpleWorkflow(name)).toThrow(INVALID_NAME_MESSAGE);
        } else {
          expect(() => new SimpleWorkflow(name)).not.toThrow();
          const wf = new SimpleWorkflow(name);
          expect(wf.getNode().name).toBe(name);
        }
      });

      it('should work in functional pattern', () => {
        if (shouldThrow) {
          expect(() => new Workflow({ name }, executor)).toThrow(INVALID_NAME_MESSAGE);
        } else {
          expect(() => new Workflow({ name }, executor)).not.toThrow();
          const wf = new Workflow({ name }, executor);
          expect(wf.getNode().name).toBe(name);
        }
      });
    });

    it('should handle empty string consistently across patterns', () => {
      const executor = async () => {};
      const emptyMessage = 'Workflow name cannot be empty or whitespace only';

      expect(() => new SimpleWorkflow('')).toThrow(emptyMessage);
      expect(() => new Workflow({ name: '' }, executor)).toThrow(emptyMessage);
    });

    it('should handle whitespace consistently across patterns', () => {
      const executor = async () => {};
      const emptyMessage = 'Workflow name cannot be empty or whitespace only';

      expect(() => new SimpleWorkflow('   ')).toThrow(emptyMessage);
      expect(() => new Workflow({ name: '   ' }, executor)).toThrow(emptyMessage);
    });

    it('should handle long names consistently across patterns', () => {
      const executor = async () => {};
      const longMessage = 'Workflow name cannot exceed 100 characters';
      const longName = 'a'.repeat(101);

      expect(() => new SimpleWorkflow(longName)).toThrow(longMessage);
      expect(() => new Workflow({ name: longName }, executor)).toThrow(longMessage);
    });

    it('should handle max length consistently across patterns', () => {
      const executor = async () => {};
      const maxName = 'a'.repeat(100);

      expect(() => new SimpleWorkflow(maxName)).not.toThrow();
      expect(() => new Workflow({ name: maxName }, executor)).not.toThrow();

      const wf1 = new SimpleWorkflow(maxName);
      const wf2 = new Workflow({ name: maxName }, executor);
      expect(wf1.getNode().name).toBe(maxName);
      expect(wf2.getNode().name).toBe(maxName);
    });
  });
});

describe('Workflow', () => {
  it('should create with unique id', () => {
    const wf1 = new SimpleWorkflow();
    const wf2 = new SimpleWorkflow();
    expect(wf1.id).not.toBe(wf2.id);
  });

  it('should use class name as default name', () => {
    const wf = new SimpleWorkflow();
    expect(wf.getNode().name).toBe('SimpleWorkflow');
  });

  it('should use custom name when provided', () => {
    const wf = new SimpleWorkflow('CustomName');
    expect(wf.getNode().name).toBe('CustomName');
  });

  it('should start with idle status', () => {
    const wf = new SimpleWorkflow();
    expect(wf.status).toBe('idle');
    expect(wf.getNode().status).toBe('idle');
  });

  it('should attach child to parent', () => {
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);
    expect(parent.getNode().children).toContain(child.getNode());
  });

  it('should emit logs to observers', async () => {
    const wf = new SimpleWorkflow();
    const logs: LogEntry[] = [];

    const observer: WorkflowObserver = {
      onLog: (entry) => logs.push(entry),
      onEvent: () => {},
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    wf.addObserver(observer);
    await wf.run();

    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].message).toBe('Running simple workflow');
  });

  it('should emit childAttached event', () => {
    const parent = new SimpleWorkflow('Parent');
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    parent.addObserver(observer);
    const child = new SimpleWorkflow('Child', parent);

    const attachEvent = events.find((e) => e.type === 'childAttached');
    expect(attachEvent).toBeDefined();
    expect(attachEvent?.type === 'childAttached' && attachEvent.parentId).toBe(parent.id);
  });

  it('should capture state and logs in functional workflow error', async () => {
    // Arrange: Create observer to capture events
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    // Arrange: Create functional workflow with a step that throws an error
    const workflow = new Workflow<void>(
      { name: 'ErrorCaptureTest' },
      async (ctx) => {
        // Execute a step that will fail
        await ctx.step('failing-step', async () => {
          throw new Error('Test error from step');
        });
      }
    );

    // Act: Attach observer and run workflow
    workflow.addObserver(observer);
    await expect(workflow.run()).rejects.toThrow('Test error from step');

    // Assert: Verify error event was emitted
    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);

    // Assert: Verify error structure
    const errorEvent = errorEvents[0];
    expect(errorEvent.error).toBeDefined();
    expect(errorEvent.error.message).toBe('Test error from step');

    // Assert: Verify logs array was captured (even if empty for step errors)
    expect(errorEvent.error.logs).toBeDefined();
    expect(Array.isArray(errorEvent.error.logs)).toBe(true);

    // Assert: Verify state was captured (may be empty object for pure functional workflows)
    expect(errorEvent.error.state).toBeDefined();
    expect(typeof errorEvent.error.state).toBe('object');

    // Assert: Verify workflow status
    expect(workflow.status).toBe('failed');

    // Assert: Verify workflowId is captured
    expect(errorEvent.error.workflowId).toBe(workflow.id);
  });

  it('should capture @ObservedState fields in workflow error state', async () => {
    // Test workflow class with @ObservedState decorated fields
    // Using functional pattern (executor) so error events are emitted via runFunctional()
    class StatefulWorkflowClass extends Workflow {
      @ObservedState()
      stepCount: number = 0;

      @ObservedState({ redact: true })
      apiKey: string = 'secret-key-123';

      @ObservedState({ hidden: true })
      internalCounter: number = 42;
    }

    // Arrange: Create observer to capture error events
    const events: WorkflowEvent[] = [];

    const observer: WorkflowObserver = {
      onLog: () => {},
      onEvent: (event) => events.push(event),
      onStateUpdated: () => {},
      onTreeChanged: () => {},
    };

    // Arrange: Create workflow with @ObservedState fields using functional pattern
    const workflow = new StatefulWorkflowClass(
      { name: 'StatefulErrorTest' },
      async (ctx) => {
        // Modify @ObservedState fields on the workflow instance
        (workflow as any).stepCount = 5;
        (workflow as any).apiKey = 'updated-key';
        (workflow as any).internalCounter = 99;

        // Execute a step that will fail
        await ctx.step('failing-step', async () => {
          throw new Error('Error after state update');
        });
      }
    );

    // Act: Attach observer and trigger error
    workflow.addObserver(observer);
    await expect(workflow.run()).rejects.toThrow('Error after state update');

    // Assert: Verify error event was emitted
    const errorEvents = events.filter((e) => e.type === 'error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);

    // Assert: Verify error structure
    const errorEvent = errorEvents[0];
    expect(errorEvent.error).toBeDefined();
    expect(errorEvent.error.message).toBe('Error after state update');

    // Assert: Verify @ObservedState fields were captured
    expect(errorEvent.error.state).toBeDefined();
    expect(typeof errorEvent.error.state).toBe('object');

    // Assert: Verify public field value is captured
    expect(errorEvent.error.state.stepCount).toBe(5);

    // Assert: Verify redacted field shows '***'
    expect(errorEvent.error.state.apiKey).toBe('***');

    // Assert: Verify hidden field is NOT in state
    expect('internalCounter' in errorEvent.error.state).toBe(false);

    // Assert: Verify logs array is present (may be empty)
    expect(errorEvent.error.logs).toBeDefined();
    expect(Array.isArray(errorEvent.error.logs)).toBe(true);

    // Assert: Verify workflow status
    expect(workflow.status).toBe('failed');

    // Assert: Verify workflowId is captured
    expect(errorEvent.error.workflowId).toBe(workflow.id);
  });

  it('should detect circular parent relationship', () => {
    // Arrange: Create parent and child workflows
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Act: Create circular reference manually
    // This simulates a bug or malicious input that creates a cycle
    parent.parent = child;

    // Assert: getRoot() should throw error for circular reference
    // Note: getRoot() is protected, so we cast to any to access it
    expect(() => (parent as any).getRoot()).toThrow(
      'Circular parent-child relationship detected'
    );
  });

  it('should detect circular relationship in getRootObservers', () => {
    // Arrange: Create parent and child workflows
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Act: Create circular reference manually
    // This simulates a bug or malicious input that creates a cycle
    parent.parent = child;

    // Assert: getRootObservers() should throw error for circular reference
    // Note: getRootObservers() is private, so we cast to any to access it
    expect(() => (parent as any).getRootObservers()).toThrow(
      'Circular parent-child relationship detected'
    );
  });

  it('should throw error when duplicate attachment attempted', () => {
    // Arrange: Create parent and child workflows with first attachment
    const parent = new SimpleWorkflow('Parent');
    const child = new SimpleWorkflow('Child', parent);

    // Act & Assert: Second attachment attempt should throw error
    expect(() => parent.attachChild(child)).toThrow(
      'Child already attached to this workflow'
    );
  });

  it('should emit treeUpdated event when status changes', () => {
    // Arrange: Create workflow instance
    const wf = new SimpleWorkflow();

    // Arrange: Create arrays to track event emissions and callback invocations
    const events: WorkflowEvent[] = [];
    const treeChangedCalls: WorkflowNode[] = [];

    // Arrange: Create observer with callbacks
    const observer: WorkflowObserver = {
      onLog: () => {},  // Empty - not testing logs
      onEvent: (event) => events.push(event),  // Capture events
      onStateUpdated: () => {},  // Empty - not testing state updates
      onTreeChanged: (root) => treeChangedCalls.push(root),  // Capture tree changes
    };

    // Act: Attach observer and trigger status change
    wf.addObserver(observer);
    wf.setStatus('running');

    // Assert: Verify treeUpdated event was emitted
    const treeUpdatedEvent = events.find((e) => e.type === 'treeUpdated');
    expect(treeUpdatedEvent).toBeDefined();

    // Assert: Verify event payload contains root node (type narrowing for discriminated union)
    expect(treeUpdatedEvent?.type === 'treeUpdated' && treeUpdatedEvent.root).toBe(wf.getNode());

    // Assert: Verify onTreeChanged callback was invoked with root node
    expect(treeChangedCalls).toHaveLength(1);
    expect(treeChangedCalls[0]).toBe(wf.getNode());
  });
});
