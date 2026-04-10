import OpenAI from 'openai';
import type { Config, LLMConfig } from '../types/index.ts';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class LLMClient {
  private config: Config;
  private fallbacks: LLMConfig[];
  private maxRetries: number;
  private retryDelay: number;
  private retryableErrors: number[];

  constructor(config: Config) {
    this.config = config;
    this.fallbacks = config.llm.fallbacks || [];
    this.maxRetries = config.llm.maxRetries ?? 1;
    this.retryDelay = config.llm.retryDelay ?? 1000;
    this.retryableErrors = config.llm.retryableErrors ?? [429, 500, 503];
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
      temperature: this.config.llm.temperature ?? 0.3,
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
        const result = await this.executeChatWithRetry(model, messages);
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

  private async executeChatWithRetry(config: LLMConfig, messages: ChatMessage[]): Promise<string | null> {
    const apiKey = config.apiKey || this.config.llm.apiKey || process.env.OPENAI_API_KEY;
    const baseUrl = config.baseUrl || this.config.llm.baseUrl;
    const temperature = config.temperature ?? this.config.llm.temperature ?? 0.3;
    const maxRetries = this.maxRetries;
    const retryDelay = this.retryDelay;
    const retryableErrors = this.retryableErrors;

    const client = new OpenAI({
      apiKey,
      baseURL: baseUrl,
    });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model: config.model,
          messages,
          temperature,
          thinking: config.thinking,
        } as any);

        return response.choices[0]?.message?.content || null;
      } catch (error: any) {
        const status = error?.status || error?.response?.status;

        if (attempt < maxRetries && retryableErrors.includes(status)) {
          console.warn(`[LLM] Retryable error ${status}, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await this.sleep(retryDelay);
          continue;
        }
        throw error;
      }
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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