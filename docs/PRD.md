# Product Requirements Document: llm-wiki

**Version:** 1.0  
**Date:** 2026-04-05  
**Status:** Final  

---

## 1. Document Overview

This PRD describes the requirements for **llm-wiki**, an LLM-powered personal wiki CLI tool that enables users to incrementally build and maintain a persistent, interlinked knowledge base from raw source documents. Unlike traditional RAG systems that search fragments on every query, llm-wiki compiles knowledge once, keeps it current, and grows smarter over time through AI-driven integration.

---

## 2. Objective

The primary objective of llm-wiki is to provide a local-first, Markdown-based personal knowledge management system powered by Large Language Models. Users can:

- Add raw source documents (articles, notes, conversations, code snippets)
- Have an LLM automatically integrate new knowledge into structured wiki pages with citations
- Query their knowledge base using a multi-step ReAct agent that retrieves and synthesizes answers
- Maintain wiki health through automated linting and quality checks

---

## 3. Scope

### 3.1 In Scope

- **Smart Ingestion**: LLM-driven integration of raw sources into structured wiki pages
- **Automatic Linking**: Cross-linking new knowledge with existing pages
- **Multi-Step Retrieval**: Iterative ReAct agent for deep question answering
- **Wiki Linting**: Detection of orphans, dead links, contradictions, shallow pages
- **List Tools**: Browse raw sources, wiki pages, and backlinks
- **Configuration**: YAML-based config with OpenAI-compatible API support
- **Command-line Interface**: Six core commands (init, raw, ingest, query, lint, list)

### 3.2 Out of Scope

- Web-based UI or GUI
- Multi-user collaboration features
- Built-in vector/embedding search (planned for future)
- Obsidian plugin integration (planned for future)
- Cloud synchronization

---

## 4. User Personas and Use Cases

### 4.1 Personas

| Persona | Description | Goals |
|---------|-------------|-------|
| **Knowledge Worker** | Professional who reads articles, research papers, and documentation | Build a lasting personal knowledge base from collected materials |
| **Developer** | Software engineer who collects code snippets, documentation, and technical notes | Maintain searchable technical knowledge with source attribution |
| **Researcher** | Academic or student who accumulates notes from courses and readings | Synthesize insights across multiple sources |
| **Writer** | Content creator who collects inspiration and reference material | Organize research for writing projects |

### 4.2 Use Cases

**UC-1: Adding a Source Document**
- User runs `wiki raw` to interactively add a new source
- Provides content, description, and content type
- File is saved to `raw/untracked/YYYY/MM/DD-source-name.md`

**UC-2: Ingesting Sources into Wiki**
- User runs `wiki ingest` (with optional file selection)
- LLM reads raw content and current wiki index
- LLM identifies relevant existing pages (keyword matching)
- LLM proposes create/update/delete operations
- User confirms operations before they are applied
- Source file moves to `raw/ingested/` after confirmation

**UC-3: Querying the Knowledge Base**
- User runs `wiki query "question"`
- ReAct agent iterates up to 4 times:
  1. Reads `index.md` to understand topics
  2. Fetches relevant concept pages
  3. Dives into source files if citations exist
- Agent outputs synthesized answer with `[src: PageName]` citations
- User optionally saves answer back to wiki

**UC-4: Running Wiki Health Check**
- User runs `wiki lint`
- Phase 1: Static analysis (orphans, dead links, index gaps)
- Phase 2: LLM semantic analysis (contradictions, missing concepts, shallow pages)
- User runs `wiki lint --fix` to auto-apply proposals

**UC-5: Browsing Wiki Contents**
- User runs `wiki list raw|pages|orphans|backlinks`
- Lists specified category of wiki items

---

## 5. Functional Requirements

### FR-1: Initialize Wiki Repository

**Description**: Create wiki directory structure and configuration file  
**Input**: None (or `--force` flag)  
**Output**: Directory tree with `raw/`, `wiki/`, `.wikirc.yaml`  
**Constraints**: Cannot overwrite existing without `--force` flag  
**Status**: Fully implemented

### FR-2: Add Raw Source Document

**Description**: Interactively add raw source to untracked folder  
**Input**: Content (via editor or `--content`), source description, content type  
**Output**: Markdown file in `raw/untracked/YYYY/MM/DD-description.md` with YAML frontmatter  
**Constraints**: File saved with per-date directory organization  
**Status**: Fully implemented

### FR-3: Ingest Sources into Wiki

**Description**: Process raw sources into wiki using LLM  
**Input**: Raw file path(s), optionally `--all`, `--yes`, `--dry-run`, `--debug`  
**Output**: Wiki page create/update/delete operations, source moved to ingested  
**Constraints**: All operations require user confirmation (unless `-y` set)  
**Status**: Fully implemented

### FR-4: Query Knowledge Base

**Description**: Ask questions using multi-step ReAct agent  
**Input**: Question string, optionally `--save`, `--page`, `--no-save`, `--debug`  
**Output**: Synthesized answer with source citations  
**Constraints**: Max 4 iterations; uses OpenAI-compatible API  
**Status**: Fully implemented

### FR-5: List Wiki Items

**Description**: Browse wiki contents without LLM cost  
**Input**: Type (`raw`, `pages`, `orphans`, `backlinks`), optional target  
**Output**: List of files or pages matching criteria  
**Status**: Fully implemented

### FR-6: Wiki Linting

**Description**: Health check for wiki quality issues  
**Input**: Optional `--fix`, `--skip-llm`  
**Output**: Static analysis + optional LLM semantic analysis  
**Constraints**: Phase 1 free; Phase 2 requires API call  
**Status**: Fully implemented

### FR-7: LLM Provider Configuration

**Description**: Support multiple OpenAI-compatible LLM providers  
**Input**: `.wikirc.yaml` with provider, model, apiKey, baseUrl, temperature  
**Output**: Config applied to all LLM calls  
**Status**: Fully implemented

---

## 6. Non-Functional Requirements

### 6.1 Performance

- **Ingestion**: Single API call per source file (inferred from code structure)
- **Query**: Up to 4 iterations, each making one API call
- **LLM Response Parsing**: Uses `jsonrepair` library for malformed JSON resilience
- **File Operations**: Uses async fs-extra for non-blocking I/O

### 6.2 Scalability

- Current implementation uses simple file system scanning
- No built-in vector search (planned for future when index grows large)
- Performance degrades as wiki size increases (no indexing)
- Assumes moderate-sized personal wiki (<1000 pages)

### 6.3 Security

- **Path Traversal Protection**: Validates all paths remain within wiki root
- API keys stored in `.wikirc.yaml` (auto-gitignored)
- No external network calls except to configured LLM API
- Uses built-in OpenAI library for API communication

### 6.4 Maintainability

- **Modular Architecture**: Commands separated from core logic
- **Configuration Loading**: Uses cosmiconfig for flexible config discovery
- **Template System**: Handlebars for prompt templates
- **Markdown Processing**: Uses remark/unified for parsing

### 6.5 Usability

- **Interactive Prompts**: Uses inquirer for CLI interactivity
- **Color Output**: Uses chalk for formatted console output
- **Loading States**: Uses ora for spinner indicators
- **Clear CLI Help**: Commander.js for command parsing and help generation

---

## 7. Technical Specifications

### 7.1 Technology Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript |
| Runtime | Node.js 22+ |
| Build Tool | tsup |
| CLI Parser | Commander.js |
| LLM SDK | OpenAI (openai) |
| Config | Cosmiconfig, YAML |
| Markdown | remark, unified |
| JSON Repair | jsonrepair |
| File Operations | fs-extra |
| Templating | Handlebars |
| UI | Chalk, Ora, Inquirer |

### 7.2 Architecture

```
┌─────────────────────────────────────────────┐
│            CLI Entry (bin/wiki.ts)            │
├─────────────────────────────────────────────┤
│  init │ raw │ ingest │ query │ lint │ list  │
├─────────────────────────────────────────────┤
│              Core Modules                  │
│  ┌──────────────┐  ┌──────────────────┐   │
│  │ WikiManager  │  │  PromptBuilder    │   │
│  │ - file ops   │  │  - handlebars    │   │
│  │ - find pages│  │                   │   │
│  └──────────────┘  └──────────────────────┘   │
│  ┌──────────────┐  ┌──────────────────┐   │
│  │  LLMClient  │  │    fileOps       │   │
│  │ - openai   │  │  - safe write    │   │
│  └──────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────┤
│              Config Layer                   │
│   defaultConfig.ts │ loadConfig.ts          │
├─────────────────────────────────────────────┤
│              Types                         │
│            src/types/index.ts              │
└─────────────────────────────────────────────┘
```

### 7.3 Key Components

| Component | Responsibility |
|-----------|---------------|
| **WikiManager** | Core wiki operations (read pages, find relevant pages, execute operations, append log) |
| **LLMClient** | Wrapper around OpenAI SDK for chat completions |
| **PromptBuilder** | Builds Handlebars templates for ingest, query, and lint prompts |
| **fileOps** | Safe file write operations |
| **loadConfig** | Config discovery and loading via cosmiconfig |

### 7.4 Directory Structure (After Init)

```
my-wiki/
├── .wikirc.yaml         ← Config (gitignored)
├── .gitignore
├── raw/
│   ├── untracked/      ← New sources waiting ingest
│   │   └── YYYY/MM/DD-*.md
│   └── ingested/      ← Processed sources
│       └── YYYY/MM/DD-*.md
└── wiki/
    ├── index.md        ← Auto-maintained wiki index
    ├── log.md        ← Operation history
    ├── concepts/     ← LLM-generated concept pages
    ├── sources/     ← Source attribution pages
    └── answers/     ← Saved query answers
```

---

## 8. Risks and Assumptions

### 8.1 Risks

| ID | Risk | Impact | Mitigation |
|----|------|--------|------------|
| R-1 | LLM generates incorrect/invalid operations | Wiki corruption | User must confirm all operations before execution |
| R-2 | Wiki index corruption | Broken links, lost knowledge | Regular linting + git versioning recommended |
| R-3 | API key exposure | Unauthorized LLM usage | Config auto-added to .gitignore |
| R-4 | Large wiki performance | Slow queries/scans | Future vector search implementation |
| R-5 | Malformed LLM JSON | Ingest failure | Uses jsonrepair for resilience |

### 8.2 Assumptions

| ID | Assumption | Reasoning |
|----|------------|-----------|
| A-1 | User has Node.js 22+ | Required by package.json engines field |
| A-2 | User has OpenAI-compatible API key | Config required for LLM features |
| A-3 | Markdown is acceptable format | Core design decision from README |
| A-4 | Single-user usage | No multi-user features in code |
| A-5 | English prompts can process multiple languages | LLM handles language detection |

---

## 9. Dependencies

### 9.1 Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| chalk | ^5.6.2 | Terminal string styling |
| commander | ^14.0.3 | CLI argument parsing |
| cosmiconfig | ^9.0.1 | Config file discovery |
| fs-extra | ^11.3.4 | Async file operations |
| handlebars | ^4.7.9 | Prompt templating |
| inquirer | ^13.3.2 | Interactive prompts |
| jsonrepair | ^3.13.3 | JSON recovery |
| openai | ^6.33.0 | LLM API client |
| ora | ^9.3.0 | Loading spinner |
| remark | ^15.0.1 | Markdown processing |
| unified | ^11.0.5 | Markdown ecosystem |
| yaml | ^2.8.3 | YAML parsing |

### 9.2 Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @types/fs-extra | ^11.0.4 | TypeScript types |
| @types/inquirer | ^9.0.9 | TypeScript types |
| @types/node | ^25.5.2 | TypeScript types |
| tsup | ^8.5.1 | TypeScript bundler |
| typescript | ^6.0.2 | Language |

---

## 10. Timeline and Milestones

The following milestones are marked as complete in the codebase:

| Feature | Status |
|---------|--------|
| `wiki init` | ✅ Complete |
| `wiki raw` with YAML frontmatter and per-date organization | ✅ Complete |
| `wiki ingest` with LLM patch generation | ✅ Complete |
| `wiki query` with iterative ReAct multi-step retrieval | ✅ Complete |
| `wiki list` (raw / pages / orphans / backlinks) | ✅ Complete |
| `wiki lint` (static + LLM semantic + auto-fix) | ✅ Complete |
| Automatic relevant-page discovery during ingest | ✅ Complete |
| `.wikirc.yaml` configuration support | ✅ Complete |

**Planned Future Features:**

| Feature | Status |
|---------|--------|
| `wiki log` command | Not implemented |
| Obsidian plugin integration | Not implemented |
| Embeddings / vector search | Not implemented |

---

## 11. Appendix

### A.1 Command Reference

```
wiki init [-f, --force]              Initialize wiki
wiki raw [--content] [--source]      Add raw source
   [--type] [--no-editor]
wiki ingest [file] [--all]          Ingest sources
   [-y, --yes] [--dry-run] [-d, --debug]
wiki query [question] [--save]        Query wiki
   [--page] [--no-save] [-d, --debug]
wiki lint [--fix] [--skip-llm]       Health check
wiki list [type] [target]            List items
```

### A.2 Configuration Fields

```yaml
llm:
  provider: openai
  model: gpt-4o
  apiKey: YOUR_API_KEY
  baseUrl: https://api.openai.com/v1
  temperature: 0.3
  thinking:
    type: disabled  # or 'enabled' for reasoning models
```

### A.3 Wiki Links Format

- **Concept links**: `[[PageName]]`
- **Source citations**: `[src: raw/ingested/path/to/file.md]`
- **Index links**: `[[PageName|Display Text]]`

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-05 | PRD Generator | Initial creation from source code analysis |