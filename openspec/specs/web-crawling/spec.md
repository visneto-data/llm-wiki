# Web Crawling

## Functional Requirements

**The system SHALL crawl web content using @just-every/crawl library.**  
- **Success Scenario:**  
  GIVEN a valid URL provided  
  WHEN initiating crawl  
  THEN it MUST retrieve and return the page content.  
- **Edge-Case Scenario:**  
  GIVEN a URL that returns a 404 error  
  WHEN crawling  
  THEN it MUST handle the error gracefully and log the issue without crashing.

## Technical Constraints
- @just-every/crawl 1.0.8 library
- Node.js environment for execution