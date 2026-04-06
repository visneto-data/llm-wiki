export interface LLMConfig {
  provider?: 'openai';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  thinking?: {
    type: 'disabled' | 'enabled';
    budget_tokens?: number;
  };
}

export interface Config {
  wikiRoot: string;
  llm: LLMConfig & {
    fallbacks?: LLMConfig[];
  };
  paths: {
    raw: string;
    wiki: string;
    templates: string;
  };
}