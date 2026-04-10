import type { Config } from '../types/index.ts';

export const defaultConfig: Config = {
  wikiRoot: '.',
  llm: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.3,
    thinking: {
      type: 'disabled',
    },
    maxRetries: 1,
    retryDelay: 1000,
    retryableErrors: [429, 500, 503],
  },
  paths: {
    raw: 'raw',
    wiki: 'wiki',
    templates: 'templates',
  },
};