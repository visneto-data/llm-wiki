import OpenAI from 'openai';
import type { Config, LLMConfig } from '../types/index.ts';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMClient {
  private config: Config;
  private fallbacks: LLMConfig[];

  constructor(config: Config) {
    this.config = config;
    this.fallbacks = config.llm.fallbacks || [];
  }

  async chat(messages: ChatMessage[]): Promise<string | null> {
    const apiKey = this.config.llm.apiKey || process.env.OPENAI_API_KEY;
    const baseUrl = this.config.llm.baseUrl;

    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });

    const response = await client.chat.completions.create({
      model: this.config.llm.model,
      messages,
      temperature: this.config.llm.temperature,
      thinking: this.config.llm.thinking,
    } as any);

    return response.choices[0]?.message?.content || null;
  }

  async chatWithFallback(messages: ChatMessage[]): Promise<string | null> {
    const models = [this.config.llm, ...this.fallbacks];

    let lastError: Error | null = null;
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      const isPrimary = i === 0;

      try {
        console.log(`[LLM] ${isPrimary ? 'Using primary' : 'Using fallback'} model: ${model.model}`);
        const result = await this.executeChat(model, messages);
        if (result) {
          if (!isPrimary) {
            console.log(`[LLM] Fallback succeeded: ${model.model}`);
          }
          return result;
        }
      } catch (error: any) {
        lastError = error as Error;

        if (this.isNonRetryableError(error)) {
          console.error(`[LLM] Non-retryable error with ${model.model}:`, error.message);
          throw error;
        }

        console.warn(`[LLM] ${isPrimary ? 'Primary' : 'Fallback'} model ${model.model} failed:`, error.message);
        continue;
      }
    }

    console.error(`[LLM] All ${models.length} models failed. Last error:`, lastError?.message);
    return null;
  }

  private async executeChat(config: LLMConfig, messages: ChatMessage[]): Promise<string | null> {
    const apiKey = config.apiKey || this.config.llm.apiKey || process.env.OPENAI_API_KEY;
    const baseUrl = config.baseUrl || this.config.llm.baseUrl;

    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });

    const response = await client.chat.completions.create({
      model: config.model,
      messages,
      temperature: config.temperature,
      thinking: config.thinking,
    } as any);

    return response.choices[0]?.message?.content || null;
  }

  private isNonRetryableError(error: any): boolean {
    const status = error?.status || error?.response?.status;
    const code = error?.code;
    return (
      status === 401 ||
      status === 403 ||
      code === 'invalid_api_key' ||
      code === 'insufficient_quota'
    );
  }
}