# Template Rendering

## Functional Requirements

**The system SHALL render templates using handlebars.**  
- **Success Scenario:**  
  GIVEN a handlebars template and data object  
  WHEN rendering  
  THEN it MUST produce the expected output with variables substituted.  
- **Edge-Case Scenario:**  
  GIVEN template with undefined variables  
  WHEN rendering  
  THEN it MUST handle missing data gracefully (e.g., render as empty strings).

## Technical Constraints
- handlebars 4.7.9 for template rendering
- chalk 5.6.2 for colored output in templates