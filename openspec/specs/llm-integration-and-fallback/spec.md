# LLM Integration and Fallback

## Functional Requirements

**The system SHALL integrate with OpenRouter API for LLM completions using the openai SDK.**  
- **Success Scenario:**  
  GIVEN a valid API key and model configuration  
  WHEN sending a prompt to the LLM  
  THEN it MUST return a completion response within timeout limits.  
- **Edge-Case Scenario:**  
  GIVEN the primary model fails with a 429 rate limit error  
  WHEN processing the request  
  THEN it MUST automatically retry with configured fallback models.

**The system SHALL implement retry logic with configurable delay and error codes.**  
- **Success Scenario:**  
  GIVEN maxRetries set to 2 and retryableErrors include 500  
  WHEN the LLM returns a 500 error  
  THEN it MUST retry up to 2 times with the specified delay.  
- **Edge-Case Scenario:**  
  GIVEN all retries exhausted and no fallbacks available  
  WHEN handling the final failure  
  THEN it MUST log the error and return a user-friendly failure message.

## Technical Constraints
- openai SDK 6.33.0 for API integration
- requests library in Python for model testing
- HTTP timeout handling for API calls