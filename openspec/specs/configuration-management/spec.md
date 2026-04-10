# Configuration Management

## Functional Requirements

**The system SHALL support loading LLM configuration from YAML files using cosmiconfig.**  
- **Success Scenario:**  
  GIVEN a valid .wikirc.yaml file in the project root or user home directory  
  WHEN the application starts  
  THEN it MUST load the configuration and use the specified provider, model, and API key.  
- **Edge-Case Scenario:**  
  GIVEN multiple configuration files exist (e.g., .wikirc.yaml in project and home)  
  WHEN loading configuration  
  THEN it MUST prioritize the project-level file over global ones.

**The system SHALL generate OpenRouter LLM configurations via Python script with interactive or CLI options.**  
- **Success Scenario:**  
  GIVEN OPENROUTER_API_KEY is set and model selection provided  
  WHEN running the generate script  
  THEN it MUST create a .wikirc.yaml with primary model, fallbacks, retries, and temperature settings.  
- **Edge-Case Scenario:**  
  GIVEN invalid model key provided  
  WHEN generating configuration  
  THEN it MUST default to the first available model and notify the user.

## Technical Constraints
- Python 3.6+ for configuration generation script
- cosmiconfig library for configuration loading
- YAML 2.8.3 for parsing configuration files