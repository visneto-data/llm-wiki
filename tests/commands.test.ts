import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { createSuccessResponse, createErrorResponse, formatOutput, APP_VERSION } from '../src/utils/output.ts';

describe('output utility', () => {
  describe('createSuccessResponse', () => {
    it('should create a success response with data', () => {
      const response = createSuccessResponse('list', { total: 5, pages: [] });
      
      expect(response.command).toBe('list');
      expect(response.version).toBe(APP_VERSION);
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ total: 5, pages: [] });
      expect(response.timestamp).toBeDefined();
    });

    it('should include meta when provided', () => {
      const response = createSuccessResponse('query', { answer: 'test' }, { iterations: 2 });
      
      expect(response.meta).toEqual({ iterations: 2 });
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response with code and message', () => {
      const response = createErrorResponse('query', 'NOT_FOUND', 'File not found');
      
      expect(response.command).toBe('query');
      expect(response.success).toBe(false);
      expect(response.error).toEqual({
        code: 'NOT_FOUND',
        message: 'File not found',
        details: undefined
      });
      expect(response.data).toBeNull();
    });

    it('should include details when provided', () => {
      const response = createErrorResponse('query', 'NOT_FOUND', 'File not found', { path: '/test.md' });
      
      expect(response.error?.details).toEqual({ path: '/test.md' });
    });
  });

  describe('formatOutput', () => {
    it('should format as JSON when requested', () => {
      const data = { test: 'value' };
      const output = formatOutput(data, 'json');
      
      expect(JSON.parse(output)).toEqual(data);
    });

    it('should format as YAML when requested', () => {
      const data = { test: 'value', nested: { key: 'val' } };
      const output = formatOutput(data, 'yaml');
      
      expect(output).toContain('test: value');
      expect(output).toContain('nested:');
    });

    it('should handle string data in text mode', () => {
      const output = formatOutput('hello world', 'text');
      expect(output).toBe('hello world');
    });
  });
});

describe('wiki list command', () => {
  const testWikiDir = './test-wiki-temp';
  
  beforeEach(async () => {
    await fs.ensureDir(testWikiDir);
    await fs.ensureDir(path.join(testWikiDir, 'wiki'));
    await fs.ensureDir(path.join(testWikiDir, 'raw', 'untracked'));
    await fs.ensureDir(path.join(testWikiDir, 'raw', 'ingested'));
  });

  afterEach(async () => {
    await fs.remove(testWikiDir);
  });

  it('should list pages in JSON format', async () => {
    const config = {
      wikiRoot: testWikiDir,
      paths: { wiki: 'wiki', raw: 'raw', templates: 'templates' }
    };
    
    await fs.writeFile(
      path.join(testWikiDir, 'wiki', 'test-page.md'),
      '---\ntitle: Test\n---\n# Test\nContent'
    );

    const { default: listCmd } = await import('../src/commands/list.ts');
    let output = '';
    const originalConsoleLog = console.log;
    console.log = vi.fn((msg) => { output = msg; });
    
    await listCmd(config, 'pages', '', { format: 'json' });
    
    console.log = originalConsoleLog;
    
    const parsed = JSON.parse(output);
    expect(parsed.success).toBe(true);
    expect(parsed.data.type).toBe('pages');
    expect(parsed.data.total).toBe(1);
    expect(parsed.data.pages[0].name).toBe('test-page');
  });

  it('should list raw sources correctly', async () => {
    const config = {
      wikiRoot: testWikiDir,
      paths: { wiki: 'wiki', raw: 'raw', templates: 'templates' }
    };
    
    await fs.writeFile(
      path.join(testWikiDir, 'raw', 'untracked', 'article.md'),
      '# Article content'
    );

    let output = '';
    const originalConsoleLog = console.log;
    console.log = vi.fn((msg) => { output = msg; });
    
    const { default: listCmd } = await import('../src/commands/list.ts');
    await listCmd(config, 'raw', '', { format: 'json' });
    
    console.log = originalConsoleLog;
    
    const parsed = JSON.parse(output);
    expect(parsed.data.total).toBe(1);
    expect(parsed.data.untracked).toContain('raw/untracked/article.md');
  });
});

describe('wiki log command', () => {
  const testWikiDir = './test-wiki-log';
  
  beforeEach(async () => {
    await fs.ensureDir(testWikiDir);
    await fs.ensureDir(path.join(testWikiDir, 'wiki'));
    await fs.writeFile(
      path.join(testWikiDir, 'wiki', 'log.md'),
      '2025-04-05 20:30 | ingest | Source: article.md | Status: success\n2025-04-05 18:15 | query | Question: "test" | Iterations: 2'
    );
  });

  afterEach(async () => {
    await fs.remove(testWikiDir);
  });

  it('should parse and output log entries in JSON format', async () => {
    const config = {
      wikiRoot: testWikiDir,
      paths: { wiki: 'wiki', raw: 'raw', templates: 'templates' }
    };

    let output = '';
    const originalConsoleLog = console.log;
    console.log = vi.fn((msg) => { output = msg; });
    
    const { default: logCmd } = await import('../src/commands/log.ts');
    await logCmd(config, undefined, { limit: '10', format: 'json' });
    
    console.log = originalConsoleLog;
    
    const parsed = JSON.parse(output);
    expect(parsed.success).toBe(true);
    expect(parsed.data.total).toBe(2);
    expect(parsed.data.entries[0].action).toBe('query');
  });

  it('should filter log entries by action', async () => {
    const config = {
      wikiRoot: testWikiDir,
      paths: { wiki: 'wiki', raw: 'raw', templates: 'templates' }
    };

    let output = '';
    const originalConsoleLog = console.log;
    console.log = vi.fn((msg) => { output = msg; });
    
    const { default: logCmd } = await import('../src/commands/log.ts');
    await logCmd(config, undefined, { limit: '10', format: 'json', action: 'query' });
    
    console.log = originalConsoleLog;
    
    const parsed = JSON.parse(output);
    expect(parsed.data.total).toBe(1);
    expect(parsed.data.entries[0].action).toBe('query');
  });
});

describe('wiki search command', () => {
  const testWikiDir = './test-wiki-search';
  
  beforeEach(async () => {
    await fs.ensureDir(testWikiDir);
    await fs.ensureDir(path.join(testWikiDir, 'wiki'));
    await fs.writeFile(
      path.join(testWikiDir, 'wiki', 'test.md'),
      '# Test Page\nThis is a test page about testing.'
    );
  });

  afterEach(async () => {
    await fs.remove(testWikiDir);
  });

  it('should search and return results in JSON format', async () => {
    const config = {
      wikiRoot: testWikiDir,
      paths: { wiki: 'wiki', raw: 'raw', templates: 'templates' }
    };

    let output = '';
    const originalConsoleLog = console.log;
    console.log = vi.fn((msg) => { output = msg; });
    
    const { default: searchCmd } = await import('../src/commands/search.ts');
    await searchCmd(config, 'test', { limit: '20', format: 'json' });
    
    console.log = originalConsoleLog;
    
    const parsed = JSON.parse(output);
    expect(parsed.success).toBe(true);
    expect(parsed.data.query).toBe('test');
    expect(parsed.data.total).toBe(1);
    expect(parsed.data.results[0].file).toContain('test.md');
  });

  it('should return empty results for non-matching query', async () => {
    const config = {
      wikiRoot: testWikiDir,
      paths: { wiki: 'wiki', raw: 'raw', templates: 'templates' }
    };

    let output = '';
    const originalConsoleLog = console.log;
    console.log = vi.fn((msg) => { output = msg; });
    
    const { default: searchCmd } = await import('../src/commands/search.ts');
    await searchCmd(config, 'nonexistent', { limit: '20', format: 'json' });
    
    console.log = originalConsoleLog;
    
    const parsed = JSON.parse(output);
    expect(parsed.success).toBe(true);
    expect(parsed.data.total).toBe(0);
    expect(parsed.data.results).toHaveLength(0);
  });
});
