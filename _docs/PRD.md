# Product Requirements Document (PRD)

## LLM-Wiki: LLM-Powered Personal Knowledge Base CLI

**Version:** 0.1.2  
**Date:** April 2025  
**Author:** Technical Product Manager (Inferred from Source Code)

---

## 1. Document Overview

### Purpose
This PRD documents **llm-wiki**, a command-line interface (CLI) tool that enables users to build, maintain, and query a persistent, interlinked personal knowledge base using Large Language Models (LLMs). The product implements Andrej Karpathy's "LLM Wiki" pattern, transforming ephemeral RAG (Retrieval-Augmented Generation) queries into a continuously accumulating knowledge repository.

### Scope
This document covers the functional and non-functional requirements, user personas, system architecture, and technical specifications of the llm-wiki CLI tool. It serves as a comprehensive guide for developers, stakeholders, and users to understand the product's capabilities and constraints.

### Document Conventions
- **Inferred:** Requirements derived directly from source code analysis
- **Assumed:** Requirements based on typical use cases and reasonable expectations when not explicitly defined in code
- **TODO:** Areas requiring further clarification or future development

---

## 2. Objective

### Primary Goal
Enable knowledge workers to incrementally build and query a persistent, interlinked personal wiki by leveraging LLMs to process raw source materials (articles, notes, conversations, etc.) into structured, cited knowledge pages.

### Core Value Propositions
1. **Persistent Knowledge Accumulation:** Unlike traditional RAG where knowledge is re-discovered on each query, llm-wiki compiles knowledge once and maintains it persistently.
2. **Intelligent Cross-Linking:** Automatic discovery and linking of related concepts across the knowledge base.
3. **Multi-Step Reasoning:** ReAct-style agent for deep querying that can traverse multiple documents to synthesize comprehensive answers.
4. **Zero Vendor Lock-in:** Pure Markdown format compatible with Obsidian, VS Code, and any text editor.
5. **Open AI Compatibility:** Works with OpenAI, Anthropic (via proxy), DeepSeek, Ollama, and any OpenAI-compatible API.

---

## 3. Scope

### In-Scope Features

#### File & Content Management
- Initialize wiki directory structure with templates
- Add raw source documents with YAML frontmatter metadata
- Organize sources by date (YYYY/MM/DD structure)
- Track ingestion state (pending vs. ingested)

#### LLM-Powered Ingestion
- Process raw documents into structured wiki pages
- Automatic relevant page discovery during ingestion (keyword matching)
- Cross-link new knowledge with existing pages
- Update central index automatically
- Handle contradictions with blockquote notation

#### Query & Retrieval
- Multi-step ReAct agent for deep questions (max 4 iterations)
- Iterative retrieval: index → concepts → sources
- Source citation tracking `[src: path]`
- Save answers as wiki pages

#### Maintenance & Health
- Static analysis: orphan pages, dead links, index gaps
- LLM semantic analysis: contradictions, missing concepts, shallow pages
- Auto-fix: create concept stubs, update index
- Browse tools: list raw sources, pages, orphans, backlinks

#### Configuration
- YAML-based configuration (`.wikirc.yaml`)
- Support for multiple LLM providers
- Cosmiconfig-based configuration discovery

### Out-of-Scope Features
- Real-time collaboration/multi-user support
- Web-based UI (CLI-only for v1)
- Native embedding/vector search (future roadmap)
- Mobile applications
- Cloud synchronization (git-based workflow assumed)
- Authentication/authorization (local use assumed)

---

## 4. User Personas and Use Cases

### Persona 1: The Researcher
**Profile:** Academic researcher, journalist, or analyst who collects large amounts of source material.

**Needs:**
- Accumulate knowledge from diverse sources (papers, articles, interviews)
- Build interconnected concept maps
- Quickly answer questions based on accumulated knowledge
- Maintain citations for academic integrity

**Goals:**
- Create a personal research database
- Avoid re-reading the same sources multiple times
- Identify contradictions and gaps in knowledge

### Persona 2: The Developer
**Profile:** Software engineer learning new technologies, documenting code patterns, and building technical knowledge.

**Needs:**
- Document code snippets and technical articles
- Track evolving technologies and frameworks
- Build a searchable knowledge base of solutions
- Cross-reference related technologies

**Goals:**
- Build a technical wiki that grows with their learning
- Quickly recall implementation details
- Maintain a "second brain" for technical knowledge

### Persona 3: The Content Creator
**Profile:** Writer, blogger, or content strategist who researches topics and builds domain expertise.

**Needs:**
- Organize research materials
- Discover connections between seemingly unrelated topics
- Generate content ideas from accumulated knowledge
- Maintain a personal knowledge garden

**Goals:**
- Transform raw research into structured knowledge
- Repurpose accumulated knowledge into content
- Never lose a good idea or reference

---

## 5. Use Cases

### Use Case 1: Adding Raw Source Material
**Actor:** User (any persona)
**Trigger:** User wants to add new information to their wiki

**Flow:**
1. User runs `wiki raw`
2. System opens an editor (or accepts direct input via flags)
3. User pastes/enters content
4. System prompts for source description and content type (article, conversation, note, etc.)
5. System generates YAML frontmatter with metadata
6. System saves file to `raw/untracked/YYYY/MM/DD-slug.md`
7. System confirms save location

**Output:** Raw Markdown file with YAML frontmatter in the untracked directory

### Use Case 2: Ingesting Sources into Wiki
**Actor:** User
**Trigger:** User wants to process raw sources into structured wiki pages

**Flow:**
1. User runs `wiki ingest` (interactive), `wiki ingest --all`, or `wiki ingest <file>`
2. System finds relevant existing pages using keyword matching
3. System constructs LLM prompt with:
   - Raw source content
   - Current wiki index
   - Relevant existing pages
4. System sends prompt to LLM
5. LLM returns JSON operations plan (create/update/delete pages, update index)
6. System displays proposed operations with color-coded diff
7. System prompts for confirmation (unless `-y` flag used)
8. On confirmation, system executes file operations atomically
9. System moves source from `untracked` to `ingested`
10. System logs operation to `wiki/log.md`

**Output:** Updated wiki pages, updated index, moved source file

### Use Case 3: Querying the Wiki
**Actor:** User
**Trigger:** User has a question they want answered based on their wiki

**Flow:**
1. User runs `wiki query "question text"`
2. System enters ReAct loop (up to 4 iterations)
3. **Iteration 1:** Agent reads `wiki/index.md` to understand available topics
4. **Iteration 2-N:** Agent decides to:
   - Read more concept pages, OR
   - Read raw source files cited in concepts, OR
   - Provide final answer
5. System displays synthesized answer with `[src: PageName]` citations
6. System prompts to save answer as a wiki page (unless `--save` or `--no-save` specified)

**Output:** Textual answer, optionally saved as `wiki/answers/Title.md`

### Use Case 4: Wiki Health Check
**Actor:** User
**Trigger:** User wants to ensure wiki consistency and completeness

**Flow:**
1. User runs `wiki lint` or `wiki lint --skip-llm`
2. **Phase 1 (Static):**
   - Scan all wiki files
   - Identify orphan pages (no incoming links)
   - Identify dead links (pointing to non-existent pages)
   - Identify pages missing from index
3. **Phase 2 (LLM):** (unless `--skip-llm`)
   - Send all concept pages to LLM
   - LLM identifies contradictions, missing concepts, shallow pages
4. System displays findings with color-coded severity
5. If issues found, system prompts to apply fixes
6. **Phase 3 (Auto-fix):** (if confirmed or `--fix`)
   - Create stub pages for missing concepts
   - Update `wiki/index.md` with new entries

**Output:** Lint report, optionally fixed wiki files

### Use Case 5: Browsing Wiki Contents
**Actor:** User
**Trigger:** User wants to explore wiki without LLM costs

**Variations:**
- `wiki list raw`: Show pending and ingested sources
- `wiki list pages`: List all wiki pages
- `wiki list orphans`: Find pages with no incoming links
- `wiki list backlinks "Page Name"`: Find all pages linking to a specific page

**Output:** Formatted list of requested items

---

## 6. Functional Requirements

### FR-001: CLI Command Structure
**Description:** The system SHALL provide a command-line interface with the following commands
**Input:** User command-line arguments
**Output:** Appropriate command execution
**Constraints:** Node.js 22+ required

| Command | Description | Flags |
|---------|-------------|-------|
| `wiki init` | Initialize wiki structure | `-f, --force` |
| `wiki raw` | Add raw source document | `--content`, `--source`, `--type`, `--no-editor` |
| `wiki ingest` | Process sources into wiki | `[file]`, `--all`, `-y`, `--dry-run`, `-d` |
| `wiki query` | Query the wiki | `[question]`, `--save`, `--page`, `--no-save`, `-d` |
| `wiki lint` | Health check wiki | `--fix`, `--skip-llm` |
| `wiki list` | Browse wiki contents | `[type]`, `[target]` |

**Status:** Inferred from `bin/wiki.ts`

### FR-002: Configuration Management
**Description:** The system SHALL support configuration via `.wikirc.yaml` and environment variables
**Input:** Configuration file or environment
**Output:** Merged configuration object
**Constraints:** Uses cosmiconfig for discovery

**Configuration Schema:**
```yaml
llm:
  provider: openai
  model: gpt-4o
  apiKey: string (or use OPENAI_API_KEY env var)
  baseUrl: https://api.openai.com/v1
  temperature: 0.3
  thinking:
    type: disabled | enabled
    budget_tokens: number
paths:
  raw: raw
  wiki: wiki
  templates: templates
```

**Status:** Inferred from `src/config/loadConfig.ts` and `src/config/defaultConfig.ts`

### FR-003: Raw Source Document Management
**Description:** The system SHALL support adding raw sources with automatic file naming and organization
**Input:** Content, source description, content type
**Output:** Markdown file in `raw/untracked/YYYY/MM/DD-slug.md`
**Constraints:** File names MUST be filesystem-safe

**Frontmatter Schema:**
```yaml
source: "Description of source"
date: ISO8601 timestamp
type: article | conversation | note | book-excerpt | code-snippet | other
```

**Status:** Inferred from `src/commands/raw.ts`

### FR-004: LLM-Powered Ingestion
**Description:** The system SHALL process raw sources using LLM to generate wiki operations
**Input:** Raw content, index, relevant pages
**Output:** JSON operations plan with create/update/delete instructions
**Constraints:** MUST cite sources with `[src: path]` syntax

**Expected JSON Output:**
```json
{
  "operations": [
    { "type": "create", "path": "wiki/concepts/topic.md", "content": "..." },
    { "type": "update", "path": "wiki/index.md", "content": "..." }
  ],
  "log_message": "Description of changes"
}
```

**Status:** Inferred from `src/commands/ingest.ts` and `src/schemas/ingest.prompt.hbs`

### FR-005: Multi-Step Query Agent
**Description:** The system SHALL implement a ReAct-style agent for iterative query resolution
**Input:** User question
**Output:** Synthesized answer with citations
**Constraints:** Maximum 4 iterations; supports Chinese and other languages

**Agent Actions:**
- `read`: Request to read specific pages or source files
- `answer`: Provide final synthesized answer

**Status:** Inferred from `src/commands/query.ts` and `src/schemas/query_agent.prompt.hbs`

### FR-006: Wiki Health Analysis
**Description:** The system SHALL perform static and semantic analysis of wiki health
**Input:** Wiki directory contents
**Output:** Lint report with optional fix operations
**Constraints:** `--skip-llm` available for free static-only analysis

**Static Checks:**
- Orphan pages (no incoming links)
- Dead links (wiki link syntax to non-existent files)
- Index gaps (pages not listed in index)

**Semantic Checks (LLM):**
- Contradictions between pages
- Missing concept stubs
- Shallow/placeholder pages

**Status:** Inferred from `src/commands/lint.ts` and `src/schemas/lint.prompt.hbs`

### FR-007: Cross-Platform Compatibility
**Description:** The system SHALL work on macOS, Linux, and Windows
**Input:** User environment
**Output:** Consistent functionality
**Constraints:** Node.js 22+, ESM modules

**Status:** Assumed from technology choices

---

## 7. Non-Functional Requirements

### Performance

#### NFR-001: Ingestion Response Time
**Description:** LLM-powered ingestion SHOULD complete within 30 seconds for typical documents (<5000 tokens)
**Measurement:** Time from prompt submission to operation plan display
**Target:** <30s for standard sources
**Status:** Assumed (depends on LLM provider latency)

#### NFR-002: Query Response Time
**Description:** Multi-step queries SHOULD complete within 60 seconds total (4 iterations max)
**Measurement:** Time from question submission to answer display
**Target:** <60s for standard queries
**Status:** Assumed

#### NFR-003: Static Analysis Speed
**Description:** Static lint analysis SHOULD complete within 5 seconds for wikis with <1000 pages
**Measurement:** Time to scan all files and report
**Target:** <5s
**Status:** Inferred from implementation (no LLM call)

### Scalability

#### NFR-004: File System Scalability
**Description:** The system SHOULD support wikis with up to 10,000 pages without performance degradation
**Measurement:** Operation completion time vs. page count
**Status:** Assumed (file-system based, no database)

#### NFR-005: Concurrent Operations
**Description:** The system SHALL support concurrent reads; writes SHOULD be atomic
**Measurement:** File operation safety
**Status:** Inferred from `src/core/fileOps.ts` (atomic writes via temp file + rename)

### Security

#### NFR-006: Path Traversal Protection
**Description:** The system SHALL prevent path traversal attacks on all file operations
**Measurement:** All paths resolved and validated against wiki root
**Status:** Inferred from `src/core/wikiManager.ts` (executeOperations method)

#### NFR-007: API Key Protection
**Description:** The system SHALL NOT log or expose API keys
**Measurement:** Config stored in `.gitignore`-dedicated file
**Status:** Inferred from `src/commands/init.ts` (`.wikirc.yaml` in gitignore) and `templates/.wikirc.yaml`

### Maintainability

#### NFR-008: Code Modularity
**Description:** The codebase SHALL follow modular architecture with clear separation of concerns
**Measurement:** Command, core, config, and schemas directories
**Status:** Inferred from directory structure

#### NFR-009: Type Safety
**Description:** The codebase SHALL use TypeScript with strict mode enabled
**Measurement:** `tsconfig.json` strict settings
**Status:** Inferred from `tsconfig.json`

### Usability

#### NFR-010: CLI Feedback
**Description:** The system SHALL provide visual feedback (spinners, colors) for long-running operations
**Measurement:** Use of `ora` and `chalk` libraries
**Status:** Inferred from command implementations

#### NFR-011: Interactive Prompts
**Description:** The system SHALL provide interactive prompts for required user decisions
**Measurement:** Use of `inquirer` library
**Status:** Inferred from command implementations

#### NFR-012: Dry-Run Capability
**Description:** Ingestion SHALL support dry-run mode to preview operations
**Measurement:** `--dry-run` flag support
**Status:** Inferred from `src/commands/ingest.ts`

### Reliability

#### NFR-013: JSON Resilience
**Description:** The system SHALL handle malformed LLM JSON responses gracefully
**Measurement:** Use of `jsonrepair` library for automatic repair
**Status:** Inferred from multiple command files

#### NFR-014: Atomic Writes
**Description:** File writes SHALL be atomic (temp file + rename pattern)
**Measurement:** `safeWriteFile` implementation
**Status:** Inferred from `src/core/fileOps.ts`

### Portability

#### NFR-015: Markdown Compatibility
**Description:** All wiki files SHALL be standard Markdown compatible with Obsidian, VS Code, etc.
**Measurement:** No proprietary syntax except `[[Wiki Links]]`
**Status:** Inferred from template files

---

## 8. Technical Specifications

### 8.1 Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Runtime | Node.js | ≥22.0.0 | Execution environment |
| Language | TypeScript | ^6.0.2 | Type-safe development |
| Module System | ESM | - | ES Module support |
| Bundler | tsup | ^8.5.1 | Build and packaging |
| CLI Framework | Commander | ^14.0.3 | Command-line parsing |
| Configuration | Cosmiconfig | ^9.0.1 | Config file discovery |
| YAML Parsing | yaml | ^2.8.3 | Config file parsing |
| LLM Integration | OpenAI SDK | ^6.33.0 | LLM API communication |
| Templating | Handlebars | ^4.7.9 | Prompt templating |
| Interactive CLI | Inquirer | ^13.3.2 | User prompts |
| Styling | Chalk | ^5.6.2 | Terminal colors |
| Spinners | Ora | ^9.3.0 | Loading indicators |
| File System | fs-extra | ^11.3.4 | Enhanced file operations |
| JSON Repair | jsonrepair | ^3.13.3 | LLM output resilience |
| Markdown | remark | ^15.0.1 | Markdown processing |

### 8.2 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLI Layer                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  bin/wiki.ts (Entry Point)                                │   │
│  │  - Command registration                                   │   │
│  │  - Config initialization                                  │   │
│  └─────────────────────────┬─────────────────────────────────┘   │
└────────────────────────────┼───────────────────────────────────┘
                             │
┌────────────────────────────┼───────────────────────────────────┐
│                    Command Layer                              │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │ init.ts │ │ raw.ts   │ │ingest.ts│ │query.ts │ │lint.ts  ││
│  │   (1)   │ │   (2)    │ │   (3)   │ │   (4)   │ │   (5)   ││
│  └─────────┘ └──────────┘ └─────────┘ └─────────┘ └─────────┘│
│  ┌─────────┐                                                   │
│  │list.ts  │                                                   │
│  │   (6)   │                                                   │
│  └─────────┘                                                   │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────┼───────────────────────────────────┐
│                     Core Services Layer                        │
│  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────────┐  │
│  │ WikiManager │ │  LLMClient   │ │    PromptBuilder        │  │
│  │             │ │              │ │                         │  │
│  │ - File Ops  │ │ - OpenAI API │ │ - Handlebars Templates  │  │
│  │ - Index Mgmt│ │ - Chat Comp. │ │ - Schema Loading        │  │
│  │ - Page Query│ │              │ │                         │  │
│  └─────────────┘ └──────────────┘ └─────────────────────────┘  │
│  ┌─────────────┐ ┌──────────────┐                              │
│  │  fileOps.ts │ │ loadConfig.ts│                              │
│  │ - Safe Write│ │ - Cosmiconfig│                              │
│  └─────────────┘ └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                     Schema/Prompt Layer                        │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────────────┐│
│  │ agent.md     │ │ingest.prompt.hbs│ │query_agent.prompt.hbs││
│  │(System Rules)│ │ (Ingestion)     │ │ (Query Agent)        ││
│  └──────────────┘ └────────────────┘ └──────────────────────┘│
│  ┌────────────────┐                                            │
│  │lint.prompt.hbs │                                            ││
│  │ (Linting)      │                                            ││
│  └────────────────┘                                            ││
└────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────┐
│                     File System Layer                          │
│                                                                │
│   my-wiki/                                                     │
│   ├── .wikirc.yaml          (Configuration)                    │
│   ├── raw/                                                     │
│   │   ├── untracked/        (Pending sources)                  │
│   │   │   └── YYYY/MM/      (Date-organized)                  │
│   │   └── ingested/         (Processed sources)               │
│   └── wiki/                                                    │
│       ├── index.md          (Central TOC)                      │
│       ├── log.md            (Operation history)                │
│       ├── concepts/         (Generated concept pages)          │
│       ├── sources/          (Source attribution pages)         │
│       └── answers/          (Saved query results)              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 8.3 Key Components

#### Component 1: WikiManager (`src/core/wikiManager.ts`)
**Responsibilities:**
- File system operations within wiki structure
- Index content retrieval and management
- Page discovery (by name, by relevance)
- Operation execution (create/update/delete)
- Activity logging

**Key Methods:**
- `getIndexContent()`: Read and return index.md content
- `getPageContents(pageNames)`: Retrieve multiple pages by name
- `findRelevantPages(rawContent, options)`: Keyword-based relevance scoring
- `executeOperations(ops)`: Apply JSON operations with path validation
- `appendLog(action, details)`: Append structured log entries

#### Component 2: LLMClient (`src/core/llmClient.ts`)
**Responsibilities:**
- Abstract LLM API communication
- Support multiple providers via baseUrl configuration
- Handle API key resolution (config or environment)

**Key Features:**
- OpenAI-compatible API structure
- Support for reasoning/thinking models
- Temperature and model configuration

#### Component 3: PromptBuilder (`src/core/promptBuilder.ts`)
**Responsibilities:**
- Compile Handlebars templates with data
- Load schema files from filesystem
- Generate context-rich prompts for LLM

**Templates:**
- `ingest.prompt.hbs`: Ingestion workflow
- `query_agent.prompt.hbs`: Multi-step agent
- `lint.prompt.hbs`: Health analysis

#### Component 4: Command Handlers (`src/commands/*.ts`)
**Responsibilities:**
- Implement business logic for each CLI command
- Orchestrate Core Services
- Handle user interaction (prompts, confirmations)
- Format and display output

#### Component 5: Configuration System (`src/config/*.ts`)
**Responsibilities:**
- Discover and load `.wikirc.yaml`
- Merge with default configuration
- Support multiple config file formats
- Environment variable fallback

### 8.4 Data Flow

#### Ingestion Flow
```
User Command
    │
    ▼
┌─────────────┐
│ Collect     │──► Get relevant pages (keyword matching)
│ Raw Files   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Build       │──► Load ingest.prompt.hbs + agent.md
│ Prompt      │    Inject: source, index, relevant pages
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Call LLM    │──► Send chat completion request
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Parse JSON  │──► Use jsonrepair if needed
│ Operations  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Confirm/    │──► Display colored diff, prompt user
│ Display     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Execute     │──► safeWriteFile atomically
│ Operations  │    Move source to ingested/
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Log & Done  │──► Append to log.md, confirm success
└─────────────┘
```

#### Query Flow
```
User Question
    │
    ▼
┌─────────────┐
│ Initialize  │──► Load index.md
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────────┐
│ Agent Loop  │◄────┤ Max 4 Iterations │
└──────┬──────┘     └──────────────────┘
       │
       ▼
┌─────────────┐
│ Call LLM    │──► Query agent prompt
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Parse Action│──► read OR answer
└──────┬──────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌─────────────┐     ┌─────────────┐
│ Action: read│     │ Action: ans │
└──────┬──────┘     └──────┬──────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌─────────────┐
│ Load Pages  │     │ Display Ans │
│ (loop back) │     │ Save Option │
└─────────────┘     └─────────────┘
```

---

## 9. Risks and Assumptions

### Risks

#### Risk 1: LLM API Costs
**Description:** Heavy usage of LLM APIs for ingestion and querying may result in unexpected costs
**Likelihood:** High (depends on usage patterns)
**Impact:** Medium (financial)
**Mitigation:**
- Provide `--skip-llm` flag for lint command
- Dry-run mode to preview operations
- Clear cost warnings in documentation

#### Risk 2: LLM Response Reliability
**Description:** LLMs may generate malformed JSON or hallucinate operations
**Likelihood:** Medium
**Impact:** High (could corrupt wiki)
**Mitigation:**
- Use `jsonrepair` for automatic JSON fixing
- User confirmation before executing operations
- Atomic file operations with validation
- Path traversal protection

#### Risk 3: Scaling Limitations
**Description:** Keyword-based relevance scoring may not scale to very large wikis
**Likelihood:** Medium (only at large scale)
**Impact:** Medium (performance degradation)
**Mitigation:**
- Future roadmap includes vector search/embedding support
- Relevance scoring is cached per operation

#### Risk 4: Vendor Lock-in (LLM)
**Description:** Despite OpenAI-compatible API support, some features may be provider-specific
**Likelihood:** Low
**Impact:** Low
**Mitigation:**
- Strict adherence to OpenAI API spec
- Documented support for proxies (Ollama, etc.)

#### Risk 5: Data Loss
**Description:** File system operations could theoretically lose data on system crash
**Likelihood:** Low
**Impact:** High
**Mitigation:**
- Atomic writes (temp file + rename)
- Git-based version control recommended
- Backup of raw sources

### Assumptions

#### Assumption 1: Single-User Local Usage
**Statement:** The system is designed for single-user, local machine usage
**Basis:** No authentication, no concurrency controls beyond atomic writes
**Verification:** Code review shows no multi-user support

#### Assumption 2: User Has LLM API Access
**Statement:** Users have access to OpenAI-compatible API keys
**Basis:** Configuration template requires API key
**Risk:** Users without API access cannot use core features

#### Assumption 3: Markdown-First Workflow
**Statement:** Users prefer Markdown-based knowledge management
**Basis:** Product positioning and template design
**Risk:** May not appeal to users wanting rich-text or web-based tools

#### Assumption 4: Git for Version Control
**Statement:** Users will use git for version control and backup
**Basis:** `.gitignore` templates provided, `raw/` and `wiki/` structure git-friendly
**Risk:** Users not using git may lose version history

#### Assumption 5: Familiarity with CLI Tools
**Statement:** Target users are comfortable with command-line interfaces
**Basis:** CLI-only interface
**Risk:** May exclude non-technical users

---

## 10. Dependencies

### External Services

| Service | Purpose | Required |
|---------|---------|----------|
| OpenAI API (or compatible) | LLM operations for ingestion, query, lint | Yes (for LLM features) |
| npm/pnpm registry | Package installation | Yes (installation) |
| GitHub (optional) | Source code, issues, templates | No |

### External Libraries

See Technology Stack (Section 8.1) for complete list.

### System Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥22.0.0 | Runtime |
| pnpm/npm | Any | Package manager |

---

## 11. Timeline and Milestones

### Current State (v0.1.2)
Based on source code analysis, the following features are implemented:

- ✅ `wiki init` - Repository initialization
- ✅ `wiki raw` - Source document addition with frontmatter
- ✅ `wiki ingest` - LLM-powered ingestion with operations
- ✅ `wiki query` - Multi-step ReAct agent
- ✅ `wiki list` - Browsing (raw, pages, orphans, backlinks)
- ✅ `wiki lint` - Static + LLM semantic analysis with auto-fix
- ✅ Configuration system (`.wikirc.yaml`)
- ✅ Multi-provider LLM support
- ✅ Automatic relevant page discovery
- ✅ JSON repair for LLM output resilience

### Roadmap (From README)

| Feature | Status | Priority |
|---------|--------|----------|
| `wiki log` command | Not Started | Medium |
| Obsidian plugin integration | Not Started | Medium |
| Embeddings/vector search | Not Started | High |

### Version History

| Version | Date | Notes |
|---------|------|-------|
| 0.1.2 | Current | Analyzed version |

---

## 12. Appendix

### A. Prompt Schema Examples

See `src/schemas/` directory for full prompt templates:
- `agent.md`: System role definition
- `ingest.prompt.hbs`: Ingestion workflow template
- `query_agent.prompt.hbs`: ReAct agent template
- `lint.prompt.hbs`: Health analysis template

### B. File Structure Template

```
my-wiki/
├── .wikirc.yaml              # Configuration (gitignored)
├── .gitignore
├── raw/
│   ├── untracked/            # New sources waiting to be ingested
│   │   └── YYYY/MM/
│   │       └── DD-slug.md
│   └── ingested/             # Processed sources
│       └── YYYY/MM/
│           └── DD-slug.md
└── wiki/
    ├── index.md              # Auto-maintained wiki index
    ├── log.md                # Operation history
    ├── concepts/             # LLM-generated concept pages
    ├── sources/              # Source attribution pages
    └── answers/              # Saved query answers
```

### C. Code Quality Observations

**Strengths:**
- Strong TypeScript typing with strict mode
- Modular command architecture
- Comprehensive CLI feedback (colors, spinners)
- Atomic file operations
- Path traversal protection
- JSON repair resilience
- Clear separation of concerns

**Areas for Enhancement:**
- No automated test suite currently implemented
- Limited error handling in some edge cases
- No integration tests for LLM interactions

### D. Glossary

| Term | Definition |
|------|------------|
| LLM | Large Language Model (GPT-4, Claude, etc.) |
| RAG | Retrieval-Augmented Generation |
| ReAct | Reasoning + Acting agent pattern |
| Wiki Link | `[[Page Title]]` syntax for internal linking |
| Frontmatter | YAML metadata at top of Markdown files |
| Ingestion | Process of converting raw sources to wiki pages |
| Orphan Page | Wiki page with no incoming links |
| Dead Link | Wiki link pointing to non-existent page |

---

**Document End**

*This PRD was generated through comprehensive source code analysis of the llm-wiki project. All requirements marked "Inferred" were derived directly from the codebase. Requirements marked "Assumed" represent reasonable expectations based on the implementation context.*