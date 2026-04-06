import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { fetchMarkdown } from '@just-every/crawl';
import type { Config } from '../types/index.ts';

async function fetchUrlContent(url: string): Promise<string> {
  const markdown = await fetchMarkdown(url);
  
  if (!markdown) {
    throw new Error(`Failed to crawl URL: no content returned`);
  }
  
  return markdown;
}

export default async function rawCmd(config: Config, options: { content?: string; source?: string; type?: string; editor?: boolean; url?: string }) {
  let content = options.content;
  
  if (options.url) {
    try {
      console.log(chalk.cyan(`Fetching content from ${options.url}...`));
      content = await fetchUrlContent(options.url);
      console.log(chalk.green('Content fetched successfully!'));
    } catch (error) {
      console.log(chalk.red(`Error fetching URL: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return;
    }
  }
  
  if (!content) {
    if (options.editor !== false) {
      const answers = await inquirer.prompt([{
        type: 'editor',
        name: 'body',
        message: 'Enter the raw content document',
      }]);
      content = answers.body;
    } else {
      console.log(chalk.yellow('Direct terminal entry not currently supported via --no-editor. Use --content instead.'));
      return;
    }
  }

  if (!content || content.trim() === '') {
    console.log(chalk.red('No content provided.'));
    return;
  }

  const metaAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'source',
      message: 'Source description:',
      when: !options.source
    },
    {
      type: 'rawlist',
      name: 'type',
      message: 'Content type (Select a number):',
      choices: ['article', 'conversation', 'note', 'book-excerpt', 'code-snippet', 'other'],
      when: !options.type
    }
  ]);

  const finalSource = options.source || metaAnswers.source;
  const finalType = options.type || metaAnswers.type;
  const dateStr = new Date().toISOString();
  
  const frontmatter = `---
source: "${finalSource}"
date: ${dateStr}
type: ${finalType}
---\n\n`;

  const fullContent = frontmatter + content;

  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const slug = finalSource.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '').substring(0, 40);
  
  const rawFileName = `${dd}-${slug}.md`;
  const untrackedDir = path.resolve(config.wikiRoot, config.paths.raw, 'untracked', yyyy, mm);
  await fs.ensureDir(untrackedDir);
  
  const targetPath = path.join(untrackedDir, rawFileName);
  let finalPath = targetPath;
  if (await fs.pathExists(finalPath)) {
    let counter = 2;
    while (await fs.pathExists(finalPath)) {
      finalPath = path.join(untrackedDir, `${dd}-${slug}-${counter}.md`);
      counter++;
    }
  }
  
  await fs.writeFile(finalPath, fullContent, 'utf8');

  const relPath = path.relative(config.wikiRoot, finalPath);
  console.log(chalk.green(`\nSaved raw document to ${relPath}`));
  console.log(chalk.cyan(`Run 'wiki ingest' next to process it!\n`));
}