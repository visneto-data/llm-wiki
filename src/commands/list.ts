import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import type { Config } from '../types/index.ts';
import { createSuccessResponse, formatOutput } from '../utils/output.ts';

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

function canonicalize(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
}

export default async function listCmd(config: Config, type: string, target: string, options: any) {
  const wikiDir = path.join(config.wikiRoot, config.paths.wiki);
  const rawUntrackedDir = path.join(config.wikiRoot, config.paths.raw, 'untracked');
  const rawIngestedDir = path.join(config.wikiRoot, config.paths.raw, 'ingested');

  const format = options.format === 'json' || options.format === 'yaml' ? options.format : 'text';
  const limit = options.limit ? parseInt(options.limit, 10) : undefined;
  const offset = options.offset ? parseInt(options.offset, 10) : 0;

  switch (type.toLowerCase()) {
    case 'raw': {
      const untracked = await scanMdFiles(rawUntrackedDir);
      const ingested = await scanMdFiles(rawIngestedDir);
      
      const rawData = {
        type: 'raw',
        total: untracked.length + ingested.length,
        untracked: untracked.map(f => path.relative(config.wikiRoot, f)),
        ingested: ingested.map(f => path.relative(config.wikiRoot, f))
      };

      if (format === 'json' || format === 'yaml') {
        const response = createSuccessResponse('list', rawData);
        console.log(formatOutput(response, format));
        return;
      }
      
      console.log(chalk.bold.cyan('\n--- Raw Sources ---'));
      console.log(chalk.yellow(`\nPending / Untracked (${untracked.length}):`));
      untracked.forEach(f => console.log(`  - ${path.relative(config.wikiRoot, f)}`));
      console.log(chalk.green(`\nIngested (${ingested.length}):`));
      ingested.forEach(f => console.log(`  - ${path.relative(config.wikiRoot, f)}`));
      console.log('');
      break;
    }
    
    case 'pages': {
      const allWikiFiles = await scanMdFiles(wikiDir);
      const filtered = allWikiFiles.filter(f => !['index.md', 'log.md'].includes(path.basename(f)));
      
      const pages = filtered.map(async f => {
        const stats = await fs.stat(f);
        return {
          name: path.basename(f, '.md'),
          path: path.relative(config.wikiRoot, f),
          modified: stats.mtime.toISOString(),
          size: stats.size
        };
      });
      const resolvedPages = await Promise.all(pages);

      const sortedPages = options.sort === 'date' 
        ? resolvedPages.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
        : options.sort === 'size'
        ? resolvedPages.sort((a, b) => b.size - a.size)
        : resolvedPages.sort((a, b) => a.name.localeCompare(b.name));

      const paginatedPages = offset > 0 ? sortedPages.slice(offset) : sortedPages;
      const limitedPages = limit ? paginatedPages.slice(0, limit) : paginatedPages;

      if (format === 'json' || format === 'yaml') {
        const response = createSuccessResponse('list', {
          type: 'pages',
          total: resolvedPages.length,
          pages: limitedPages
        });
        console.log(formatOutput(response, format));
        return;
      }
      
      console.log(chalk.bold.cyan('\n--- Wiki Pages ---'));
      limitedPages.forEach(p => {
         console.log(`  📄 ${chalk.green(p.name)} ${chalk.gray(`(${p.path})`)}`);
      });
      console.log(chalk.gray(`\nTotal: ${resolvedPages.length} pages\n`));
      break;
    }
    
    case 'orphans': {
      const allWikiFiles = await scanMdFiles(wikiDir);
      const pageFiles = allWikiFiles.filter(f => !['index.md', 'log.md'].includes(path.basename(f)));
      
      const pageInfo = pageFiles.map(f => { 
         const name = path.basename(f, '.md');
         return { name, canon: canonicalize(name) };
      });
      const orphans = new Set(pageInfo.map(i => i.name));

      const allContentFiles = [path.join(wikiDir, 'index.md'), ...pageFiles];
      
      for (const file of allContentFiles) {
        if (!(await fs.pathExists(file))) continue;
        const content = await fs.readFile(file, 'utf8');
        
        const matches = [...content.matchAll(/\[\[(.*?)\]\]/g)];
        for (const match of matches) {
           const linkedCanon = canonicalize(match[1]);
           const pInfo = pageInfo.find(i => i.canon === linkedCanon || linkedCanon.includes(i.canon));
           if (pInfo) {
              orphans.delete(pInfo.name);
           }
        }
      }

      const orphanList = Array.from(orphans);

      if (format === 'json' || format === 'yaml') {
        const response = createSuccessResponse('list', {
          type: 'orphans',
          total: orphanList.length,
          orphans: orphanList
        });
        console.log(formatOutput(response, format));
        return;
      }

      if (orphanList.length === 0) {
         console.log(chalk.green('\nNo orphan pages found! Every page is linked. 🎉\n'));
      } else {
         console.log(chalk.yellow(`\nFound ${orphanList.length} orphan pages (no incoming links):\n`));
         orphanList.forEach(name => console.log(`  - ${name}`));
         console.log(chalk.gray(`\nTip: You can use 'wiki lint' to have the LLM automatically restructure or connect them.\n`));
      }
      break;
    }
    
    case 'backlinks': {
       if (!target) {
          console.log(chalk.red('Please provide a target page name. Usage: wiki list backlinks "Page Name"'));
          return;
       }
       
       const targetCanon = canonicalize(target);
       const allWikiFiles = await scanMdFiles(wikiDir);
       const backlinks: Record<string, string[]> = {};

       for (const file of allWikiFiles) {
          if (!(await fs.pathExists(file))) continue;
          const content = await fs.readFile(file, 'utf8');
          const matches = [...content.matchAll(/\[\[(.*?)\]\]/g)];
          
          const hasLink = matches.some(match => {
              const linkedCanon = canonicalize(match[1]);
              return linkedCanon === targetCanon || linkedCanon.includes(targetCanon);
          });

          if (hasLink) {
             const pageName = path.basename(file, '.md');
             if (!backlinks[target]) backlinks[target] = [];
             backlinks[target].push(pageName);
          }
       }

       if (format === 'json' || format === 'yaml') {
         const response = createSuccessResponse('list', {
           type: 'backlinks',
           total: Object.values(backlinks).flat().length,
           backlinks
         });
         console.log(formatOutput(response, format));
         return;
       }

       console.log(chalk.bold.cyan(`\n--- Backlinks for "[[${target}]]" ---`));
       const found = backlinks[target] || [];
       
       if (found.length === 0) {
          console.log(chalk.gray(`\nNo pages link to "[[${target}]]".\n`));
       } else {
          found.forEach(page => console.log(`  🔗 ${chalk.green(page)}`));
          console.log(chalk.gray(`\nTotal: ${found.length} referring pages\n`));
       }
       break;
    }

    default:
      console.log(chalk.red(`\nUnknown list type: ${type}`));
      console.log(`Supported types: raw, pages, orphans, backlinks\n`);
  }
}
