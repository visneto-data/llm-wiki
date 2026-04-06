import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { jsonrepair } from 'jsonrepair';
import { LLMClient } from '../core/llmClient.ts';
import { PromptBuilder } from '../core/promptBuilder.ts';
import { WikiManager } from '../core/wikiManager.ts';
import type { Config } from '../types/index.ts';
import { createSuccessResponse, createErrorResponse, formatOutput } from '../utils/output.ts';

interface QueryOptions {
  save?: boolean;
  page?: string;
  noSave?: boolean;
  debug?: boolean;
  output?: string;
  format?: string;
  iterations?: string;
  context?: string;
}

export default async function queryCmd(config: Config, question: string | undefined, options: QueryOptions) {
  let finalQuestion = question;
  
  if (!finalQuestion) {
    const answers = await inquirer.prompt([{
      type: 'input',
      name: 'q',
      message: 'What do you want to know about your wiki?'
    }]);
    finalQuestion = answers.q;
  }

  if (!finalQuestion || finalQuestion.trim() === '') {
    console.log(chalk.red('No question provided.'));
    return;
  }

  const llm = new LLMClient(config);
  const pb = new PromptBuilder();
  const wm = new WikiManager(config);

  const indexContent = await wm.getIndexContent();
  const loadedPages: Array<{name: string, content: string}> = [];
  const sourceFiles: Array<{path: string, type: string, title?: string}> = [];
  let answerContent = '';
  
  let iteration = 0;
  const MAX_ITERATIONS = options.iterations ? parseInt(options.iterations, 10) : 4;

  while (iteration < MAX_ITERATIONS) {
     iteration++;
     
     const promptText = await pb.buildQueryAgentPrompt({ 
        question: finalQuestion, 
        indexContent, 
        loadedPages 
     });
     
     if (options.debug) {
       console.log(chalk.magenta(`\n[DEBUG] Iteration ${iteration} - Loaded ${loadedPages.length} pages in context.`));
     }

     const spinner = ora(`Agent is thinking (Iteration ${iteration})...`).start();
     let response: string | null = '';
     try {
        response = await llm.chatWithFallback([{ role: 'user', content: promptText }]);
        spinner.stop();
     } catch (err) {
        spinner.stop();
        if (options.format === 'json') {
          const errorResp = createErrorResponse('query', 'LLM_API_ERROR', `Agent request failed: ${err}`);
          console.log(formatOutput(errorResp, 'json'));
          return;
        }
        console.error(chalk.red('\nAgent request failed:'), err);
        return;
     }

     if (!response) {
        if (options.format === 'json') {
          const errorResp = createErrorResponse('query', 'EMPTY_RESPONSE', 'Agent returned an empty response');
          console.log(formatOutput(errorResp, 'json'));
          return;
        }
        console.log(chalk.red('\nAgent returned an empty response.'));
        return;
     }

     const jsonStart = response.indexOf('{');
     const jsonEnd = response.lastIndexOf('}');
     if (jsonStart === -1 || jsonEnd === -1) {
        if (options.format === 'json') {
          const errorResp = createErrorResponse('query', 'MALFORMED_JSON', 'Agent failed to format output as JSON');
          console.log(formatOutput(errorResp, 'json'));
          return;
        }
        console.log(chalk.yellow('\nAgent failed to format output as JSON.'));
        if (options.debug) console.log(response);
        return;
     }

     let actionData: any;
     const rawJson = response.substring(jsonStart, jsonEnd + 1);
     try {
         actionData = JSON.parse(rawJson);
     } catch(e) {
         try {
             actionData = JSON.parse(jsonrepair(rawJson));
         } catch(e2) {
            if (options.format === 'json') {
              const errorResp = createErrorResponse('query', 'JSON_REPAIR_FAILED', 'Agent produced malformed JSON that could not be repaired');
              console.log(formatOutput(errorResp, 'json'));
              return;
            }
            console.log(chalk.red('\nAgent produced malformed JSON that could not be repaired.'));
            if (options.debug) console.log(rawJson);
            return;
         }
     }

     if (actionData.action === 'read') {
         if (options.debug) console.log(chalk.magenta(`[DEBUG] Agent Reasoning: ${actionData.reasoning || '(none)'}`));
         console.log(chalk.blue(`Agent wants to read: ${actionData.pages.join(', ')}`));
         
         const newPages = await wm.getPageContents(actionData.pages);
         const existingNames = new Set(loadedPages.map(p => p.name));
         let addedCount = 0;
         
         for (const p of newPages) {
             if (!existingNames.has(p.name)) {
                 loadedPages.push(p);
                 sourceFiles.push({ path: p.name, type: 'concept', title: p.name });
                 addedCount++;
             }
         }
         
         if (addedCount === 0) {
             console.log(chalk.yellow(`Agent requested pages we couldn't find or already read.`));
             if (iteration === MAX_ITERATIONS - 1) {
                 console.log(chalk.red("Too many recursive misses. Stopping."));
             }
         }
      } else if (actionData.action === 'answer') {
         if (options.debug) console.log(chalk.magenta(`[DEBUG] Agent Reasoning: ${actionData.reasoning || '(none)'}`));
         answerContent = actionData.content;
         break;
      } else {
         if (options.format === 'json') {
            const errorResp = createErrorResponse('query', 'UNKNOWN_ACTION', `Unknown action from Agent: ${actionData.action}`);
            console.log(formatOutput(errorResp, 'json'));
            return;
         }
         console.log(chalk.red(`Unknown action from Agent: ${actionData.action}`));
         return;
      }
  }

  if (!answerContent) {
      if (options.format === 'json') {
        const errorResp = createErrorResponse('query', 'MAX_ITERATIONS', 'Failed to generate an answer within the iteration limit');
        console.log(formatOutput(errorResp, 'json'));
        return;
      }
      console.log(chalk.red("Failed to generate an answer within the iteration limit."));
      return;
  }

  const model = config.llm?.model || 'unknown';
  let savedTo: string | undefined;

  if (options.format === 'json') {
    const response = createSuccessResponse('query', {
      question: finalQuestion,
      answer: answerContent,
      sources: sourceFiles,
      iterations: iteration,
      model: model
    });
    
    console.log(formatOutput(response, 'json'));
    
    if (options.output) {
      await fs.writeFile(options.output, answerContent, 'utf8');
      console.log(chalk.green(`Answer saved to ${options.output}`));
    }
    
    await wm.appendLog('query', `Question: "${finalQuestion}" | Iterations: ${iteration} | Pages read: ${loadedPages.length}`);
    return;
  }

  console.log(chalk.cyan(`\n================= ANSWER =================\n`));
  console.log(answerContent);
  console.log(chalk.cyan(`\n==========================================\n`));
  
  await wm.appendLog('query', `Question: "${finalQuestion}" | Iterations: ${iteration} | Pages read: ${loadedPages.length}`);

  if (options.output) {
    await fs.writeFile(options.output, answerContent, 'utf8');
    console.log(chalk.green(`Answer saved to ${options.output}`));
  }

  if (options.noSave) return;

  let confirmSave = options.save;
  if (!confirmSave) {
     const savePrompt = await inquirer.prompt([{
       type: 'confirm',
       name: 'save',
       message: 'Do you want to save this answer back into the wiki?',
       default: false
     }]);
     confirmSave = savePrompt.save;
  }

  if (confirmSave) {
     let pageName = options.page;
     if (!pageName) {
        const namePrompt = await inquirer.prompt([{
          type: 'input',
          name: 'name',
          message: 'Page title:',
          default: 'Research - ' + finalQuestion.substring(0, 20)
        }]);
        pageName = namePrompt.name;
     }

     const safePageName = String(pageName || 'Unnamed');
     const safeName = safePageName.replace(/[/\\?%*:|"<>]/g, '-');
     const fullPageContent = `---\ntitle: "${safePageName}"\ntype: answer\ndate: ${new Date().toISOString()}\n---\n\n# ${safePageName}\n\n**Question:** ${finalQuestion}\n\n${answerContent}`;

     await wm.executeOperations([{
         type: 'create',
         path: `wiki/answers/${safeName}.md`,
         content: fullPageContent
     }]);
     
     savedTo = `wiki/answers/${safeName}.md`;
     console.log(chalk.green(`\n✔ Saved answer to ${savedTo}`));
  }
}
