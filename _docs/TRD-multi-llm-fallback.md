# TRD: Multi-LLM Fallback Support

**Date**: 2026-04-06
**Status**: Implemented
**Priority**: High

---

## 1. Problem Statement

Currently, the wiki system only supports a single LLM configuration. When the primary LLM fails (rate limits, unavailable, errors), there is no fallback to alternative models.

## 2. Requirements

### 2.1 YAML Configuration

Support multiple LLM configurations in `.wikirc.yaml`:

```yaml
llm:
  # Primary LLM (required)
  model: google/gemma-3-27b-it
  apiKey: YOUR_OPENROUTER_API_KEY
  baseUrl: https://openrouter.ai/api/v1
  temperature: 0.3
  thinking:
    type: disabled

  # Fallback LLMs (optional)
  fallbacks:
    - model: meta-llama/llama-3.1-8b-instruct
      apiKey: YOUR_OPENROUTER_API_KEY
      baseUrl: https://openrouter.ai/api/v1
      
    - model: mistralai/mistral-7b-instruct
      apiKey: YOUR_OPENROUTER_API_KEY
      baseUrl: https://openrouter.ai/api/v1
```

### 2.2 Fallback Strategy

- **Sequential failover**: Try primary model first, then fallbacks in order
- **Retry on transient errors**: 429 (rate limit), 503 (unavailable), network errors
- **No retry on auth errors**: Invalid API key (fail immediately)
- **Max retries**: 1 attempt per fallback model

### 2.3 TypeScript Types

```typescript
interface LLMConfig {
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  thinking?: {
    type: 'disabled' | 'enabled';
    budget_tokens?: number;
  };
}

interface Config {
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
```

### 2.4 Logging

Log fallback events:
- `[LLM] Attempting fallback model: <model>`
- `[LLM] Primary model failed: <error>`
- `[LLM] Fallback succeeded: <model>`
- `[LLM] All LLMs failed`

## 3. Implementation Plan

### 3.1 Phase 1: Update Types

**File**: `src/types/index.ts`
- Extend `LLMConfig` interface
- Add `fallbacks` array to `Config.llm`

### 3.2 Phase 2: Update LLMClient

**File**: `src/core/llmClient.ts`
- Accept `fallbacks` in constructor
- Implement `chatWithFallback()` method
- Handle error classification (retryable vs non-retryable)
- Implement sequential failover logic

```typescript
class LLMClient {
  private client: OpenAI;
  private config: Config;
  private fallbacks: LLMConfig[];

  constructor(config: Config) {
    this.config = config;
    this.fallbacks = config.llm.fallbacks || [];
    // Initialize primary client
  }

  async chatWithFallback(messages: ChatMessage[]): Promise<string | null> {
    const models = [this.config.llm, ...this.fallbacks];
    
    for (const model of models) {
      try {
        const result = await this.executeChat(model, messages);
        if (result) return result;
      } catch (error) {
        if (isNonRetryableError(error)) {
          throw error; // Auth errors - don't retry
        }
        console.warn(`[LLM] Model ${model.model} failed:`, error);
        continue;
      }
    }
    
    return null; // All models failed
  }

  private async executeChat(config: LLMConfig, messages: ChatMessage[]): Promise<string | null> {
    const client = new OpenAI({
      apiKey: config.apiKey || this.config.llm.apiKey,
      baseURL: config.baseUrl || this.config.llm.baseUrl,
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
    return error?.status === 401 || 
           error?.status === 403 ||
           error?.code === 'invalid_api_key';
  }
}
```

### 3.3 Phase 3: Update Commands

**Files**:
- `src/commands/query.ts`
- `src/commands/ingest.ts`
- `src/commands/lint.ts`
- Any command using LLM

Replace `llmClient.chat()` with `llmClient.chatWithFallback()`.

### 3.4 Phase 4: Config Loading

**File**: `src/config/loadConfig.ts`
- Already handles nested `llm` config
- `fallbacks` array will be merged automatically

## 4. Error Handling

| Error Code | Type | Retry with Fallback? |
|-----------|------|---------------------|
| 401 | Invalid API key | No |
| 403 | Forbidden | No |
| 429 | Rate limit | Yes |
| 500 | Server error | Yes |
| 503 | Service unavailable | Yes |
| ETIMEDOUT | Network timeout | Yes |
| ENOTFOUND | DNS error | Yes |

## 5. Backward Compatibility

- Existing `.wikirc.yaml` with single LLM continues to work
- `fallbacks` is optional
- Default behavior unchanged if no fallbacks defined

## 6. Testing

### 6.1 Unit Tests

- Test fallback trigger on 429 error
- Test no fallback on 401 error
- Test fallback chain exhaustion
- Test backward compatibility

### 6.2 Integration Tests

- Mock primary LLM to return 429, verify fallback used
- Mock all LLMs to fail, verify error handling

## 7. Out of Scope

- Load balancing across multiple LLMs
- Parallel LLM calls
- Circuit breaker pattern
- LLM health monitoring

## 8. Acceptance Criteria

1. [ ] YAML config accepts `fallbacks` array
2. [ ] Primary LLM failure triggers fallback
3. [ ] Auth errors do not trigger fallback
4. [ ] All fallback failures logged
5. [ ] Backward compatibility maintained
6. [ ] Existing tests pass