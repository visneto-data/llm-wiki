#!/usr/bin/env node
declare const __PKG_VERSION__: string;
import { Command } from 'commander';
import { cosmiconfig } from 'cosmiconfig';
import YAML from 'yaml';
import { loadConfig } from '../src/config/loadConfig.ts';
import initCmd from '../src/commands/init.ts';
import rawCmd from '../src/commands/raw.ts';
import ingestCmd from '../src/commands/ingest.ts';
import queryCmd from '../src/commands/query.ts';
import lintCmd from '../src/commands/lint.ts';
import listCmd from '../src/commands/list.ts';
import logCmd from '../src/commands/log.ts';
import searchCmd from '../src/commands/search.ts';

const program = new Command();

async function main() {
  // Add --config option early so commander doesn't reject it
  program.option('-c, --config <path>', 'Path to config file');
  
  // Extract --config from argv manually
  let configPath: string | undefined;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-c' || argv[i] === '--config') {
      configPath = argv[i + 1];
      break;
    }
  }

  let config = await loadConfig();
  
  if (configPath) {
    const explorer = cosmiconfig('wiki', {
      loaders: {
        '.yaml': (filePath, content) => YAML.parse(content),
        '.yml': (filePath, content) => YAML.parse(content),
      },
    });
    const result = await explorer.load(configPath);
    if (result && result.config) {
      config = {
        ...config,
        ...result.config,
        llm: { ...config.llm, ...result.config?.llm },
        paths: { ...config.paths, ...result.config?.paths },
      };
    }
  }

  program
    .name('wiki')
    .description('LLM Wiki CLI')
    .version(__PKG_VERSION__)
    .option('-v, --verbose', 'Include debug info in output')
    .option('-q, --quiet', 'Suppress non-essential output')
    .option('-o, --output <file>', 'Write output to file')
    .option('--format <type>', 'Output format: text, json, yaml');

  program
    .command('init')
    .description('Initialize a new LLM wiki repository')
    .option('-f, --force', 'Force overwrite existing directories')
    .action((options) => initCmd(config, { ...program.opts(), ...options }));

  program
    .command('raw')
    .description('Add a raw source document interactively')
    .option('--content <text>', 'Direct content input')
    .option('--source <string>', 'Source description')
    .option('--type <type>', 'Type of raw source')
    .option('--no-editor', 'Use terminal to paste directly')
    .option('--url <url>', 'Fetch content from a URL and convert to markdown')
    .option('--batch <dir>', 'Batch import from directory')
    .option('--stdin', 'Read content from stdin')
    .option('-q, --quiet', 'Suppress success messages')
    .action((options) => rawCmd(config, { ...program.opts(), ...options }));

  program
    .command('ingest')
    .description('Ingest raw documents into the wiki')
    .argument('[file]', 'Specific file to ingest')
    .option('--all', 'Ingest all pending files')
    .option('-y, --yes', 'Skip confirmation')
    .option('--dry-run', 'Show logic plan without writing')
    .option('-d, --debug', 'Print debug payload sent to LLM')
    .option('--batch', 'Process multiple files in single LLM call')
    .option('--continue', 'Resume after previous failure')
    .option('--limit <number>', 'Limit number of files to process')
    .option('--skip-existing', 'Skip already ingested sources')
    .option('--parallel <number>', 'Number of parallel LLM calls')
    .action((file, options) => ingestCmd(config, file, { ...program.opts(), ...options }));

  program
    .command('query')
    .description('Query the wiki via the LLM')
    .argument('[question]', 'The question')
    .option('--save', 'Save answer without asking')
    .option('--page <name>', 'Name of the saved page')
    .option('--no-save', 'Do not save answer')
    .option('-d, --debug', 'Print debug context info (e.g., accessed pages)')
    .option('-o, --output <file>', 'Save answer directly to file')
    .option('--format <type>', 'Output format: markdown, plain, json')
    .option('-i, --interactive', 'Enter REPL mode for multiple queries')
    .option('--iterations <number>', 'Override max iterations')
    .option('--context <file>', 'Additional context file to include')
    .action((question, options) => queryCmd(config, question, { ...program.opts(), ...options }));

  program
    .command('lint')
    .description('Analyze the wiki for inconsistencies or orphans')
    .option('--fix', 'Automatically apply simple fixes')
    .option('--skip-llm', 'Only run static analysis, skip LLM call')
    .option('--watch', 'Continuous monitoring mode')
    .option('-o, --output <file>', 'Save report to file')
    .option('--severity <level>', 'Filter by severity: error, warning, info')
    .option('--format <type>', 'Output format: text, json, yaml')
    .action((options) => lintCmd(config, { ...program.opts(), ...options }));

  program
    .command('list')
    .description('List wiki items')
    .argument('[type]', 'raw / pages / orphans / backlinks', 'pages')
    .argument('[target]', 'Target page for backlinks (optional)', '')
    .option('--format <type>', 'Output format: text, json, yaml')
    .option('--sort <field>', 'Sort by: name, date, size')
    .option('--limit <number>', 'Limit number of results')
    .option('--offset <number>', 'Offset for pagination')
    .action((type, target, options) => listCmd(config, type, target, { ...program.opts(), ...options }));

  program
    .command('log')
    .description('View operation history')
    .argument('[filter]', 'Optional filter (e.g., "ingest", "query")')
    .option('-n, --limit <number>', 'Number of entries to show', '10')
    .option('--format <type>', 'Output format: text, json, yaml')
    .option('--action <type>', 'Filter by action type')
    .option('--since <date>', 'Filter entries since date (ISO8601)')
    .option('--until <date>', 'Filter entries until date (ISO8601)')
    .action((filter, options) => logCmd(config, filter, { ...program.opts(), ...options }));

  program
    .command('search')
    .description('Keyword search across wiki content')
    .argument('<query>', 'Search query')
    .option('-n, --limit <number>', 'Maximum results to return', '20')
    .option('--format <type>', 'Output format: text, json')
    .option('--type <scope>', 'Search scope: all, pages, raw, answers', 'all')
    .option('-c, --context <number>', 'Lines of context around matches', '2')
    .action((query, options) => searchCmd(config, query, { ...program.opts(), ...options }));

  program.parseAsync(process.argv);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
