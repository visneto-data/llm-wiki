import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import type { Config } from '../types/index.ts';
import { createSuccessResponse, formatOutput } from '../utils/output.ts';

interface LogEntry {
  timestamp: string;
  action: string;
  details: string;
}

async function parseLogFile(logPath: string): Promise<LogEntry[]> {
  if (!await fs.pathExists(logPath)) {
    return [];
  }
  
  const content = await fs.readFile(logPath, 'utf8');
  const entries: LogEntry[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\s*\|\s*(\w+)\s*\|\s*(.*)$/);
    if (match) {
      entries.push({
        timestamp: match[1],
        action: match[2],
        details: match[3]
      });
    } else {
      const otherMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\s*-\s*(\w+)\s*-\s*(.*)$/);
      if (otherMatch) {
        entries.push({
          timestamp: otherMatch[1],
          action: otherMatch[2],
          details: otherMatch[3]
        });
      }
    }
  }
  
  return entries.reverse();
}

export default async function logCmd(
  config: Config, 
  filter: string | undefined, 
  options: {
    limit?: string;
    format?: string;
    action?: string;
    since?: string;
    until?: string;
  }
) {
  const logPath = path.join(config.wikiRoot, config.paths.wiki, 'log.md');
  let entries = await parseLogFile(logPath);
  
  if (filter) {
    entries = entries.filter(e => 
      e.action.toLowerCase().includes(filter.toLowerCase()) ||
      e.details.toLowerCase().includes(filter.toLowerCase())
    );
  }
  
  if (options.action) {
    entries = entries.filter(e => e.action.toLowerCase() === options.action!.toLowerCase());
  }
  
  if (options.since) {
    const sinceDate = new Date(options.since);
    entries = entries.filter(e => new Date(e.timestamp) >= sinceDate);
  }
  
  if (options.until) {
    const untilDate = new Date(options.until);
    entries = entries.filter(e => new Date(e.timestamp) <= untilDate);
  }
  
  const limit = parseInt(options.limit || '10', 10);
  entries = entries.slice(0, limit);
  
  if (options.format === 'json' || options.format === 'yaml') {
    const response = createSuccessResponse('log', {
      entries,
      total: entries.length,
      filtered: !!(filter || options.action || options.since || options.until)
    });
    
    console.log(formatOutput(response, options.format));
    return;
  }
  
  if (entries.length === 0) {
    console.log(chalk.gray('No log entries found.'));
    return;
  }
  
  console.log(chalk.bold.cyan('\n--- Operation Log ---\n'));
  for (const entry of entries) {
    const actionColor = entry.action === 'ingest' ? chalk.yellow :
                       entry.action === 'query' ? chalk.blue :
                       entry.action === 'create' ? chalk.green :
                       chalk.white;
    console.log(`${chalk.gray(entry.timestamp)} ${actionColor(entry.action.padEnd(10))} ${entry.details}`);
  }
  console.log(chalk.gray(`\nTotal: ${entries.length} entries\n`));
}