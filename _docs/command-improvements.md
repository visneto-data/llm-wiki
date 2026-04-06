# Wiki Command Improvements Proposal

## Overview

This document proposes enhancements to the llm-wiki CLI commands, building on the foundation established in [PRD.md](./PRD.md) and [architecture.md](./architecture.md). The improvements are designed to be **agent-friendly** — each command exposes clear interfaces, structured outputs, and extensibility points that enable AI agents (including llm-wiki itself) to orchestrate complex knowledge management workflows.

**Target Version:** 0.2.0  
**Status:** Draft  
**Date:** April 2025

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [New Commands](#2-new-commands)
3. [Enhanced Existing Commands](#3-enhanced-existing-commands)
4. [Global Flags](#4-global-flags)
5. [Machine-Readable Output Formats](#5-machine-readable-output-formats)
6. [Agent Workflow Patterns](#6-agent-workflow-patterns)
7. [Implementation Priority](#7-implementation-priority)
8. [Technical Specifications](#8-technical-specifications)
   - [JSON Response Schemas](#831-json-response-schema-agent-ready)

---

## 1. Executive Summary

### Current State (v0.1.2)

| Command | Status | Gaps |
|---------|--------|------|
| `wiki init` | ✅ Complete | None |
| `wiki raw` | ✅ Complete | No terminal input, limited batch |
| `wiki ingest` | ✅ Complete | No batch processing, no resume |
| `wiki query` | ✅ Complete | No interactive mode, no formatted output |
| `wiki lint` | ✅ Complete | No continuous monitoring |
| `wiki list` | ✅ Complete | JSON output missing |
| `wiki log` | ❌ Missing | Not implemented |

### Proposed Additions

| Category | Additions |
|----------|-----------|
| **New Commands** | `wiki log`, `wiki search`, `wiki export`, `wiki watch` |
| **Command Enhancements** | 15+ new flags across all commands |
| **Global Flags** | `--verbose`, `--quiet`, `--output`, `--format` |
| **Output Formats** | JSON, YAML, machine-readable modes |

---

## 2. New Commands

### 2.1 `wiki log` — Operation History Viewer

**Purpose:** View and query the operation history log (`wiki/log.md`) in a structured way.

** interface:**

```bash
wiki log [options] [filter]
```

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `filter` | string | Optional filter (e.g., "ingest", "query") |

**Options:**

| Flag | Type | Default | Description |
|------|------|----------|-------------|
| `--limit, -n` | number | 10 | Number of entries to show |
| `--format` | string | "text" | Output format: text, json, yaml |
| `--action` | string | "" | Filter by action type |
| `--since` | string | "" | Filter entries since date (ISO8601) |
| `--until` | string | "" | Filter entries until date (ISO8601) |

**Examples:**

```bash
# Show last 10 entries
wiki log

# Show last 5 ingest operations as JSON
wiki log --limit 5 --action ingest --format json

# Show all entries since January 2025
wiki log --since 2025-01-01
```

**Agent Use Case:** An agent can query the log to determine what has been recently processed, avoid re-ingesting sources, and track wiki evolution over time.

---

### 2.2 `wiki search` — Keyword Search (No LLM)

**Purpose:** Free keyword search across all wiki content without invoking LLM APIs. Enables agents to perform quick lookups and determine whether LLM augmentation is needed.

**Interface:**

```bash
wiki search <query> [options]
```

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `query` | string | Search query (required) |

**Options:**

| Flag | Type | Default | Description |
|------|------|----------|-------------|
| `--limit, -n` | number | 20 | Maximum results to return |
| `--format` | string | "text" | Output format: text, json |
| `--type` | string | "all" | Search scope: all, pages, raw, answers |
| `--context` | number | 2 | Lines of context around matches |

**Output Format (JSON):**

```json
{
  "query": "search term",
  "total": 5,
  "results": [
    {
      "file": "wiki/concepts/example.md",
      "lines": [12, 15, 23],
      "snippet": "...context with **search term** highlighted..."
    }
  ]
}
```

**Examples:**

```bash
# Quick search for "react" in wiki pages
wiki search react --type pages

# Search all content, return JSON for agent processing
wiki search "konrath" --format json --limit 10
```

**Agent Use Case:** Agents can use this to determine if relevant information already exists in the wiki before invoking the more expensive `wiki query` command. This enables efficient agent orchestration.

---

### 2.3 `wiki export` — Export Wiki Content

**Purpose:** Export wiki content in various formats for portability, backup, or integration with other tools.

**Interface:**

```bash
wiki export [format] [options]
```

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `format` | string | Output format: json, yaml, html, markdown, zip |

**Options:**

| Flag | Type | Default | Description |
|------|------|----------|-------------|
| `--output, -o` | string | "" | Output file path (stdout if empty) |
| `--include` | string | "all" | What to include: all, pages, raw, index-only |
| `--compact` | boolean | false | Minify JSON/YAML output |
| `--template` | string | "" | Custom HTML template path |

**Examples:**

```bash
# Export all wiki content as JSON
wiki export json --output wiki-backup.json

# Export as HTML for static site generation
wiki export html --output ./dist

# Export index only as YAML
wiki export yaml --include index-only
```

**Agent Use Case:** Enables backing up the wiki, generating static documentation sites, or extracting content for external processing.

---

### 2.4 `wiki watch` — Continuous Monitoring

**Purpose:** Watch the wiki for changes and optionally trigger actions. Useful for external integrations and continuous health monitoring.

**Interface:**

```bash
wiki watch [command] [options]
```

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `command` | string | Command to run on changes |

**Options:**

| Flag | Type | Default | Description |
|------|------|----------|-------------|
| `--interval` | number | 60 | Polling interval in seconds |
| `--debounce` | number | 5 | Debounce delay in seconds |
| `--events` | string | "modify,create" | File events to watch |
| `--quiet` | boolean | false | Suppress output |

**Examples:**

```bash
# Watch for changes and run lint on modification
wiki watch "wiki lint --skip-llm"

# Watch with custom interval
wiki watch --interval 30
```

**Agent Use Case:** Can be run in background by an agent to detect changes and trigger automated responses.

---

### 2.5 `wiki import` — Import External Content

**Purpose:** Import content from external sources (Obsidian vaults, Markdown files, JSON) into the wiki structure.

**Interface:**

```bash
wiki import <source> [options]
```

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `source` | string | Source path or URL |

**Options:**

| Flag | Type | Default | Description |
|------|------|----------|-------------|
| `--type` | string | "auto" | Source type: auto, obsidian, markdown, json |
| `--dry-run` | boolean | false | Preview without importing |
| `--yes, -y` | boolean | false | Skip confirmation |

**Examples:**

```bash
# Import from Obsidian vault
wiki import /path/to/obsidian-vault --type obsidian

# Import markdown files
wiki import ./notes/ --type markdown
```

---

## 3. Enhanced Existing Commands

### 3.1 `wiki query` Enhancements

**Current State:**

```bash
wiki query [question] [--save] [--page <name>] [--no-save] [-d]
```

**Proposed Enhancements:**

| New Flag | Type | Description |
|---------|------|-------------|
| `--output, -o` | string | Save answer directly to file |
| `--format` | string | Output format: markdown, plain, json |
| `--interactive, -i` | boolean | Enter REPL mode for multiple queries |
| `--iterations` | number | Override max iterations (default: 4) |
| `--context` | string | Additional context file to include |

**REPL Mode Example:**

```bash
$ wiki query --interactive
wiki> How does LLM embedding work?
[Answer 1]
wiki> What are the best practices?
[Answer 2]
wiki> /exit
```

**Structured JSON Output:**

```bash
wiki query "What is retrieval augmented generation?" --format json
```

```json
{
  "question": "What is retrieval augmented generation?",
  "answer": "...",
  "sources": [
    {"path": "wiki/concepts/rag.md", "type": "concept"},
    {"path": "raw/ingested/2025/01/15-article.md", "type": "source"}
  ],
  "iterations": 2,
  "model": "gpt-4o"
}
```

### 3.2 `wiki ingest` Enhancements

**Current State:**

```bash
wiki ingest [file] [--all] [-y] [--dry-run] [-d]
```

**Proposed Enhancements:**

| New Flag | Type | Description |
|---------|------|-------------|
| `--batch` | boolean | Process multiple files in single LLM call |
| `--continue` | boolean | Resume after previous failure |
| `--limit` | number | Limit number of files to process |
| `--skip-existing` | boolean | Skip already ingested sources |
| `--parallel` | number | Number of parallel LLM calls (default: 1) |

**Batch Processing:**

```bash
# Process up to 5 files in single LLM call
wiki ingest --batch --limit 5

# Resume from failure
wiki ingest --continue
```

### 3.3 `wiki list` Enhancements

**Current State:**

```bash
wiki list [type] [target]
# types: raw, pages, orphans, backlinks
```

**Proposed Enhancements:**

| New Flag | Type | Description |
|---------|------|-------------|
| `--format` | string | Output format: text, json, yaml |
| `--sort` | string | Sort by: name, date, size |
| `--limit` | number | Limit number of results |
| `--offset` | number | Offset for pagination |

**JSON Output:**

```bash
wiki list pages --format json
```

```json
{
  "type": "pages",
  "total": 42,
  "pages": [
    {"name": "react-hooks", "path": "wiki/concepts/react-hooks.md", "size": 2048, "modified": "2025-01-15T10:30:00Z"},
    {"name": "typescript-patterns", "path": "wiki/concepts/typescript-patterns.md", "size": 4096, "modified": "2025-01-14T08:00:00Z"}
  ]
}
```

### 3.4 `wiki lint` Enhancements

**Current State:**

```bash
wiki lint [--fix] [--skip-llm]
```

**Proposed Enhancements:**

| New Flag | Type | Description |
|---------|------|-------------|
| `--watch` | boolean | Continuous monitoring mode |
| `--output` | string | Save report to file |
| `--severity` | string | Filter by severity: error, warning, info |
| `--json` | boolean | JSON output (shortcut for --format json) |

**Continuous Mode:**

```bash
# Run lint continuously in background
wiki lint --watch --skip-llm

# Output JSON report
wiki lint --format json --output lint-report.json
```

### 3.5 `wiki raw` Enhancements

**Current State:**

```bash
wiki raw [--content <text>] [--source <string>] [--type <type>] [--no-editor]
```

**Proposed Enhancements:**

| New Flag | Type | Description |
|---------|------|-------------|
| `--batch` | string | Batch import from directory |
| `--stdin` | boolean | Read content from stdin |
| `--quiet` | boolean | Suppress success messages |

**Batch Import:**

```bash
# Import all markdown files from directory
wiki raw --batch ./articles/
```

---

## 4. Global Flags

These flags apply to all commands:

| Flag | Description | Example |
|------|-------------|---------|
| `--verbose, -v` | Verbose output (include debug info) | `wiki query -v "question"` |
| `--quiet, -q` | Suppress non-essential output | `wiki query -q "question"` |
| `--output, -o` | Write output to file | `wiki list --output results.json` |
| `--format` | Output format: text, json, yaml | `wiki list --format json` |
| `--config` | Custom config file path | `wiki --config /path/to/.wikirc.yaml query "q"` |
| `--help` | Show help | `wiki query --help` |
| `--version` | Show version | `wiki --version` |

---

## 5. Machine-Readable Output Formats

### 5.1 JSON Output Standard

All commands that produce structured data SHOULD support JSON output:

```bash
# Command syntax
<command> --format json

# Output structure
{
  "command": "wiki <command>",
  "version": "0.1.2",
  "timestamp": "2025-04-05T12:00:00Z",
  "data": { ... },
  "errors": []
}
```

### 5.2 Error Format

```json
{
  "command": "wiki ingest",
  "version": "0.1.2",
  "timestamp": "2025-04-05T12:00:00Z",
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "Source file not found",
    "details": {"path": "raw/untracked/2025/01/example.md"}
  }
}
```

### 5.3 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid arguments |
| 3 | Configuration error |
| 4 | LLM API error |
| 5 | File system error |

---

## 6. Agent Workflow Patterns

### 6.1 Knowledge Retrieval Workflow

Agents can use the enhanced commands to implement efficient retrieval:

```typescript
// Agent: Determine if wiki contains relevant information
const searchResult = await runCommand('wiki search "topic" --format json');

// Agent: If relevant content found, use query
if (searchResult.total > 0) {
  const answer = await runCommand('wiki query "detailed question" --format json');
} else {
  // Agent: Need to ingest source first
  await runCommand('wiki raw --content "..." --source "..." --type article');
  await runCommand('wiki ingest --yes');
  const answer = await runCommand('wiki query "question" --format json');
}
```

### 6.2 Health Check Workflow

```typescript
// Agent: Check wiki health
const healthReport = await runCommand('wiki lint --format json');
if (healthReport.orphans?.length > 0) {
  await runCommand('wiki lint --fix --yes');
}
```

### 6.3 Monitoring Workflow

```typescript
// Agent: Watch for changes and take action
const watcher = spawn('wiki watch "wiki lint --skip-llm"');
watcher.on('change', async (files) => {
  const report = await runCommand('wiki lint --format json --severity error');
  // Agent: Alert or fix
});
```

---

## 7. Implementation Priority

### Phase 1: Core Enhancements (v0.2.0)

| Priority | Command | Enhancement |
|----------|---------|-------------|
| P0 | `wiki log` | New command - operation history |
| P0 | `wiki query` | JSON output, --output flag |
| P0 | `wiki list` | JSON output format |
| P1 | `wiki search` | New command - keyword search |
| P1 | `wiki ingest` | Batch processing |
| P2 | `wiki export` | New command - export functionality |

### Phase 2: Advanced Features (v0.2.1)

| Priority | Command | Enhancement |
|----------|---------|-------------|
| P1 | `wiki watch` | Continuous monitoring |
| P1 | `wiki query` | Interactive REPL mode |
| P2 | `wiki import` | Import external content |

### Phase 3: Polish (v0.2.2)

| Priority | Command | Enhancement |
|----------|---------|-------------|
| P2 | All | Verbose/quiet flags |
| P2 | All | Comprehensive JSON schema |

---

## 8. Technical Specifications

### 8.1 Command Interface Pattern

All new commands MUST follow this interface pattern:

```typescript
interface WikiCommand {
  name: string;
  description: string;
  arguments: CommandArgument[];
  options: CommandOption[];
  execute(config: Config, args: string[], options: CommandOptions): Promise<CommandResult>;
}

interface CommandResult {
  success: boolean;
  data?: any;
  error?: CommandError;
  output?: string;
}
```

### 8.2 JSON Output Schema

```typescript
interface WikiCommandOutput {
  command: string;
  version: string;
  timestamp: string;
  data: any;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

### 8.3 JSON Response Schema (Agent-Ready)

Each command that supports `--format json` MUST return a consistent JSON structure. The following schemas define the expected output for each command.

#### 8.3.1 Generic Response Envelope

```typescript
interface WikiResponse<T = any> {
  // Metadata
  command: string;
  version: string;
  timestamp: string;
  
  // Response data
  success: boolean;
  data?: T;
  
  // Error information (only present when success === false)
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  
  // Optional metadata
  warnings?: string[];
  meta?: Record<string, unknown>;
}
```

#### 8.3.2 `wiki query` Response

```typescript
interface QueryResponse {
  question: string;
  answer: string;
  sources: Array<{
    path: string;
    type: 'concept' | 'source' | 'answer';
    title?: string;
  }>;
  iterations: number;
  model: string;
  savedTo?: string;
}

interface WikiResponse<QueryResponse> {
  command: 'query';
  version: string;
  timestamp: string;
  success: true;
  data: QueryResponse;
}
```

**Example:**
```bash
wiki query "What is LLM embedding?" --format json
```

```json
{
  "command": "query",
  "version": "0.2.0",
  "timestamp": "2026-04-05T20:38:15Z",
  "success": true,
  "data": {
    "question": "What is LLM embedding?",
    "answer": "LLM embedding is a vector representation...",
    "sources": [
      {"path": "wiki/concepts/embedding.md", "type": "concept", "title": "Embedding"},
      {"path": "raw/ingested/2025/01/15-article.md", "type": "source"}
    ],
    "iterations": 2,
    "model": "gpt-4o",
    "savedTo": "wiki/answers/llm-embedding.md"
  }
}
```

#### 8.3.3 `wiki list` Response

```typescript
interface ListPage {
  name: string;
  path: string;
  modified?: string;
  size?: number;
}

interface ListResponse {
  type: 'pages' | 'raw' | 'orphans' | 'backlinks';
  total: number;
  pages?: ListPage[];
  orphans?: string[];
  backlinks?: Record<string, string[]>;
}

interface WikiResponse<ListResponse> {
  command: 'list';
  version: string;
  timestamp: string;
  success: true;
  data: ListResponse;
}
```

**Example:**
```bash
wiki list pages --format json
```

```json
{
  "command": "list",
  "version": "0.2.0",
  "timestamp": "2026-04-05T20:38:15Z",
  "success": true,
  "data": {
    "type": "pages",
    "total": 42,
    "pages": [
      {"name": "react-hooks", "path": "wiki/concepts/react-hooks.md", "modified": "2025-01-15T10:30:00Z", "size": 2048},
      {"name": "typescript-patterns", "path": "wiki/concepts/typescript-patterns.md", "modified": "2025-01-14T08:00:00Z", "size": 4096}
    ]
  }
}
```

#### 8.3.4 `wiki lint` Response

```typescript
interface LintResponse {
  phases: {
    static: {
      orphans: string[];
      deadLinks: Array<{file: string; link: string}>;
      indexGaps: string[];
    };
    llm?: {
      contradictions: Array<{pages: string[]; description: string}>;
      missingConcepts: Array<{name: string; rationale: string}>;
      shallowPages: Array<{name: string; reason: string}>;
    };
  };
  fixed?: boolean;
  fixesApplied?: number;
}

interface WikiResponse<LintResponse> {
  command: 'lint';
  version: string;
  "timestamp": string;
  success: true;
  data: LintResponse;
}
```

**Example:**
```bash
wiki lint --format json
```

```json
{
  "command": "lint",
  "version": "0.2.0",
  "timestamp": "2026-04-05T20:38:15Z",
  "success": true,
  "data": {
    "phases": {
      "static": {
        "orphans": ["deprecated-feature"],
        "deadLinks": [{"file": "wiki/concepts/api.md", "link": "OldAPI"}],
        "indexGaps": []
      },
      "llm": {
        "contradictions": [],
        "missingConcepts": [{"name": "Vector Search", "rationale": "Frequently mentioned but no dedicated page"}],
        "shallowPages": [{"name": "Quickstart", "reason": "Less than 100 words"}]
      }
    },
    "fixed": false,
    "fixesApplied": 0
  }
}
```

#### 8.3.5 `wiki search` Response

```typescript
interface SearchResult {
  file: string;
  lines: number[];
  snippet: string;
}

interface SearchResponse {
  query: string;
  total: number;
  results: SearchResult[];
}

interface WikiResponse<SearchResponse> {
  command: 'search';
  version: string;
  timestamp: string;
  success: true;
  data: SearchResponse;
}
```

**Example:**
```bash
wiki search "retrieval" --format json
```

```json
{
  "command": "search",
  "version": "0.2.0",
  "timestamp": "2026-04-05T20:38:15Z",
  "success": true,
  "data": {
    "query": "retrieval",
    "total": 3,
    "results": [
      {"file": "wiki/concepts/rag.md", "lines": [12, 15, 23], "snippet": "...**retrieval** augmented generation..."},
      {"file": "wiki/concepts/embedding.md", "lines": [8], "snippet": "...semantic **retrieval**..."}
    ]
  }
}
```

#### 8.3.6 `wiki ingest` Response

```typescript
interface IngestFile {
  path: string;
  status: 'ingested' | 'skipped' | 'failed';
  operations?: Array<{type: string; path: string}>;
  error?: string;
}

interface IngestResponse {
  files: IngestFile[];
  total: {
    ingested: number;
    skipped: number;
    failed: number;
  };
}

interface WikiResponse<IngestResponse> {
  command: 'ingest';
  version: string;
  timestamp: string;
  success: true;
  data: IngestResponse;
}
```

**Example:**
```bash
wiki ingest --all --format json
```

```json
{
  "command": "ingest",
  "version": "0.2.0",
  "timestamp": "2026-04-05T20:38:15Z",
  "success": true,
  "data": {
    "files": [
      {"path": "raw/untracked/2025/04/01-article.md", "status": "ingested", "operations": [{"type": "create", "path": "wiki/concepts/new-topic.md"}]},
      {"path": "raw/untracked/2025/04/02-note.md", "status": "skipped"}
    ],
    "total": {"ingested": 1, "skipped": 1, "failed": 0}
  }
}
```

#### 8.3.7 `wiki log` Response

```typescript
interface LogEntry {
  timestamp: string;
  action: string;
  details: string;
}

interface LogResponse {
  entries: LogEntry[];
  total: number;
  filtered?: boolean;
}

interface WikiResponse<LogResponse> {
  command: 'log';
  version: string;
  timestamp: string;
  success: true;
  data: LogResponse;
}
```

**Example:**
```bash
wiki log --limit 5 --format json
```

```json
{
  "command": "log",
  "version": "0.2.0",
  "timestamp": "2026-04-05T20:38:15Z",
  "success": true,
  "data": {
    "entries": [
      {"timestamp": "2025-04-05 20:30", "action": "ingest", "details": "Source: article.md | Status: success"},
      {"timestamp": "2025-04-05 18:15", "action": "query", "details": "Question: 'What is RAG?' | Iterations: 2"}
    ],
    "total": 2,
    "filtered": false
  }
}
```

#### 8.3.8 Error Response Schema

```typescript
interface WikiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface WikiResponse<null> {
  command: string;
  version: string;
  timestamp: string;
  success: false;
  data: null;
  error: WikiError;
}
```

**Example:**
```bash
wiki query "question"
```

```json
{
  "command": "query",
  "version": "0.2.0",
  "timestamp": "2026-04-05T20:38:15Z",
  "success": false,
  "data": null,
  "error": {
    "code": "LLM_API_ERROR",
    "message": "Failed to connect to LLM API",
    "details": {"statusCode": 401, "provider": "openai"}
  }
}
```

### 8.4 Configuration Extensions

```typescript
interface ExtendedConfig {
  // New config options
  commands: {
    search: {
      maxResults: number;
      defaultContext: number;
    };
    lint: {
      watchInterval: number;
      severityLevels: string[];
    };
    export: {
      defaultFormat: string;
      htmlTemplate?: string;
    };
  };
  output: {
    defaultFormat: 'text' | 'json' | 'yaml';
    color: boolean;
    verbose: boolean;
  };
}
```

### 8.5 File Naming Conventions

| Command | File Pattern | Example |
|---------|------------|---------|
| `wiki log` | `wiki/log.md` | Existing |
| `wiki search` | N/A (in-memory) | - |
| `wiki export` | User-specified | `export.json` |
| `wiki watch` | N/A (daemon) | - |

---

## 9. Backward Compatibility

All enhancements MUST maintain backward compatibility:

1. **Default Behavior:** Existing commands MUST work exactly as before when no new flags are used
2. **Deprecation:** Deprecated flags MUST continue to work with a deprecation warning for 2 minor versions
3. **Output:** Text output MUST remain unchanged unless `--format` is explicitly specified

---

## 10. Testing Requirements

Each new command/enhancement MUST have:

1. **Unit Tests:** Test core functionality in isolation
2. **Integration Tests:** Test with mock LLM and file system
3. **CLI Tests:** Test actual command-line interface
4. **Output Tests:** Verify JSON/YAML output schemas

---

## 11. Documentation Requirements

Each enhancement MUST include:

1. **Command Help:** Updated `wiki <command> --help` output
2. **Examples:** Working examples for all new flags
3. **Migration Guide:** If breaking changes (none planned)

---

## Appendix A: Command Quick Reference

| Command | New Flags |
|---------|----------|
| `wiki init` | No changes |
| `wiki raw` | `--batch`, `--stdin`, `--quiet` |
| `wiki ingest` | `--batch`, `--continue`, `--limit`, `--skip-existing`, `--parallel` |
| `wiki query` | `--output`, `--format`, `--interactive`, `--iterations`, `--context` |
| `wiki lint` | `--watch`, `--output`, `--severity`, `--format` |
| `wiki list` | `--format`, `--sort`, `--limit`, `--offset` |
| `wiki log` | **NEW** `--limit`, `--format`, `--action`, `--since`, `--until` |
| `wiki search` | **NEW** `--limit`, `--format`, `--type`, `--context` |
| `wiki export` | **NEW** `--output`, `--include`, `--compact`, `--template` |
| `wiki watch` | **NEW** `--interval`, `--debounce`, `--events` |
| `wiki import` | **NEW** `--type`, `--dry-run`, `--yes` |

---

## Appendix B: Global Flag Reference

| Flag | Applies To | Description |
|------|------------|-------------|
| `--verbose, -v` | All | Include debug output |
| `--quiet, -q` | All | Suppress non-essential output |
| `--output, -o` | Most | Write to file |
| `--format` | Most | text, json, yaml |
| `--config` | All | Custom config path |
| `--yes, -y` | Interactive | Skip confirmation |

---

**Document End**

*This proposal was generated to document command enhancements for the llm-wiki project. All specifications are subject to change based on implementation feedback.*