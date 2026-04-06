import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import type { Config } from '../types/index.ts';
import { createSuccessResponse, formatOutput } from '../utils/output.ts';

interface SearchResult {
  file: string;
  lines: number[];
  snippet: string;
}

async function scanMdFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  if (!(await fs.pathExists(dir))) return results;
  
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await scanMdFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function searchInFile(filePath: string, query: string, contextLines: number): Promise<SearchResult | null> {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split('\n');
  const queryLower = query.toLowerCase();
  const matchingLineIndices: number[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes(queryLower)) {
      matchingLineIndices.push(i + 1);
    }
  }
  
  if (matchingLineIndices.length === 0) {
    return null;
  }
  
  const snippets: string[] = [];
  for (const lineNum of matchingLineIndices.slice(0, 3)) {
    const start = Math.max(0, lineNum - contextLines - 1);
    const end = Math.min(lines.length, lineNum + contextLines);
    const snippet = lines.slice(start, end).join('\n');
    snippets.push(snippet);
  }
  
  return {
    file: filePath,
    lines: matchingLineIndices,
    snippet: snippets.join('\n...\n')
  };
}

export default async function searchCmd(
  config: Config,
  query: string,
  options: {
    limit?: string;
    format?: string;
    type?: string;
    context?: string;
  }
) {
  if (!query || query.trim() === '') {
    console.log(chalk.red('Please provide a search query.'));
    return;
  }
  
  const wikiDir = path.join(config.wikiRoot, config.paths.wiki);
  const rawDir = path.join(config.wikiRoot, config.paths.raw);
  const limit = parseInt(options.limit || '20', 10);
  const context = parseInt(options.context || '2', 10);
  const searchType = options.type || 'all';
  
  let searchDirs: string[] = [];
  if (searchType === 'all' || searchType === 'pages') {
    searchDirs.push(wikiDir);
  }
  if (searchType === 'all' || searchType === 'raw') {
    searchDirs.push(path.join(rawDir, 'untracked'));
    searchDirs.push(path.join(rawDir, 'ingested'));
  }
  if (searchType === 'all' || searchType === 'answers') {
    searchDirs.push(path.join(wikiDir, 'answers'));
  }
  
  const allFiles: string[] = [];
  for (const dir of searchDirs) {
    const files = await scanMdFiles(dir);
    allFiles.push(...files);
  }
  
  const results: SearchResult[] = [];
  for (const file of allFiles) {
    if (results.length >= limit) break;
    
    const result = await searchInFile(file, query, context);
    if (result) {
      results.push(result);
    }
  }
  
  if (options.format === 'json') {
    const response = createSuccessResponse('search', {
      query,
      total: results.length,
      results: results.map(r => ({
        file: path.relative(config.wikiRoot, r.file),
        lines: r.lines,
        snippet: r.snippet.slice(0, 200) + (r.snippet.length > 200 ? '...' : '')
      }))
    });
    
    console.log(formatOutput(response, 'json'));
    return;
  }
  
  if (results.length === 0) {
    console.log(chalk.gray(`No results found for "${query}".`));
    return;
  }
  
  console.log(chalk.bold.cyan(`\n--- Search Results for "${query}" ---\n`));
  for (const result of results) {
    const relativePath = path.relative(config.wikiRoot, result.file);
    console.log(chalk.green(relativePath) + chalk.gray(` (lines: ${result.lines.join(', ')})`));
    console.log(chalk.white(result.snippet.slice(0, 150) + (result.snippet.length > 150 ? '...' : '')));
    console.log('');
  }
  console.log(chalk.gray(`Total: ${results.length} results\n`));
}