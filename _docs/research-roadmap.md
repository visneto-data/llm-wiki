# llm-wiki Research Roadmap

**Version:** 1.0  
**Date:** April 2026  
**Purpose:** Strategic research and development roadmap for llm-wiki

---

## Executive Summary

This roadmap outlines the development trajectory for llm-wiki, an LLM-powered personal wiki CLI. It identifies **incremental improvements** (near-term enhancements within 1-3 months) and **10x improvements** (transformative features requiring 3-12 months) that will significantly enhance the product's capabilities, scalability, and user experience.

The roadmap is derived from analysis of existing documentation:
- [PRD.md](./PRD.md) - Product requirements
- [architecture.md](./architecture.md) - Technical architecture
- [JTBD.md](./JTBD.md) - Jobs to be Done analysis
- [command-improvements.md](./command-improvements.md) - Proposed enhancements
- [developer-guide.md](./developer-guide.md) - Implementation context

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Incremental Improvements (Near-Term)](#2-incremental-improvements-near-term)
3. [10x Improvements (Transformative)](#3-10x-improvements-transformative)
4. [Implementation Phases](#4-implementation-phases)
5. [Technical Dependencies](#5-technical-dependencies)
6. [Risk Assessment](#6-risk-assessment)
7. [Success Metrics](#7-success-metrics)

---

## 1. Current State Assessment

### 1.1 Implemented Features (v0.1.2)

| Feature | Status | Priority |
|---------|--------|----------|
| `wiki init` | ✅ Complete | - |
| `wiki raw` | ✅ Complete | - |
| `wiki ingest` | ✅ Complete | - |
| `wiki query` (ReAct agent) | ✅ Complete | - |
| `wiki list` | ✅ Complete | - |
| `wiki lint` (static + LLM) | ✅ Complete | - |
| Configuration system | ✅ Complete | - |
| Multi-LLM provider support | ✅ Complete | - |
| Automatic relevant page discovery | ✅ Complete | - |
| JSON repair resilience | ✅ Complete | - |

### 1.2 Known Gaps

Based on JTBD analysis and command-improvements.md:

| Gap | Impact | Severity |
|-----|--------|----------|
| No `wiki log` command | Low | Medium |
| No keyword search (`wiki search`) | Medium | High |
| No batch processing for ingestion | Medium | Medium |
| No JSON output for machine readability | High | High |
| No embedding/vector search | Medium | Medium (future) |
| No `wiki watch` for continuous monitoring | Low | Low |
| No `wiki import` for external sources | Medium | Low |
| No `wiki export` for portability | Low | Low |

### 1.3 Architecture Constraints

- **File-system based:** O(n) search complexity
- **Single-user:** No multi-device sync
- **CLI-only:** No web GUI (intentional for v1)
- **Keyword matching:** No semantic/embedding search

---

## 2. Incremental Improvements (Near-Term)

> **Timeline:** 1-3 months  
> **Effort:** Low to Medium  
> **Goal:** Enhance usability, machine readability, and workflow efficiency

### 2.1 Machine-Readable Output (P0 - Highest)

**Why:** Enables AI agent integration, scripting, and automation. Critical for the "agent-friendly" vision.

**Implementation:**

| Command | JSON Output | Status |
|---------|-------------|--------|
| `wiki query --format json` | Structured answer + sources | New |
| `wiki list --format json` | Pages/orphans/backlinks | New |
| `wiki lint --format json` | Health report | New |
| `wiki search --format json` | Search results | New |
| `wiki log --format json` | Operation history | New |

**Technical Approach:**
- Add `--format` flag to commands that output structured data
- Create a `WikiResponse<T>` envelope with: `command`, `version`, `timestamp`, `success`, `data`, `error`
- Implement JSON schemas per command (already defined in command-improvements.md)

**Impact:**
- Enables llm-wiki to orchestrate itself (self-agent)
- Enables external tools to consume wiki data
- Reduces learning curve for developers

### 2.2 New Commands (P0)

#### 2.2.1 `wiki log` - Operation History Viewer

**Current State:** Log file exists (`wiki/log.md`) but no command to view it

**Proposed Interface:**
```bash
wiki log [filter] [--limit <n>] [--format json] [--action ingest|query|...]
```

**Implementation:**
- Parse `wiki/log.md` as structured entries
- Support filtering by action type, date range
- Return JSON for machine readability

**Use Cases:**
- Track wiki evolution over time
- Determine what has been processed
- Audit trail for compliance

#### 2.2.2 `wiki search` - Keyword Search

**Current State:** No search; must use `wiki query` (LLM-powered, cost-incurring)

**Proposed Interface:**
```bash
wiki search <query> [--limit <n>] [--type pages|raw|all] [--format json]
```

**Implementation:**
- Keyword-based file search across wiki content
- Use Node.js `fs` + grep-like pattern matching
- Return snippets with highlighted matches
- Zero LLM cost (free)

**Use Cases:**
- Quick lookups without LLM cost
- Agent determining if content exists before expensive query
- Finding specific mentions across pages

### 2.3 Enhanced Existing Commands (P1)

#### 2.3.1 `wiki query` Enhancements

| Enhancement | Flag | Purpose |
|-------------|------|---------|
| JSON output | `--format json` | Machine readability |
| Save to file | `--output <path>` | Direct file save |
| Interactive mode | `--interactive` | REPL for multiple queries |
| Custom iterations | `--iterations <n>` | Override default 4 |

#### 2.3.2 `wiki ingest` Enhancements

| Enhancement | Flag | Purpose |
|-------------|------|---------|
| Batch processing | `--batch` | Process multiple files in one LLM call |
| Continue on failure | `--continue` | Resume interrupted batch |
| Limit files | `--limit <n>` | Process subset |
| Skip existing | `--skip-existing` | Don't re-process |

#### 2.3.3 `wiki list` Enhancements

| Enhancement | Flag | Purpose |
|-------------|------|---------|
| JSON output | `--format json` | Machine readability |
| Sort options | `--sort name|date|size` | Customize order |
| Pagination | `--limit <n> --offset <n>` | Large wiki handling |

### 2.4 Global Flags (P1)

| Flag | Purpose |
|------|---------|
| `--verbose, -v` | Debug output |
| `--quiet, -q` | Suppress non-essential output |
| `--output, -o` | Write output to file |
| `--format text|json|yaml` | Output format |
| `--config <path>` | Custom config path |

---

## 3. 10x Improvements (Transformative)

> **Timeline:** 3-12 months  
> **Effort:** Medium to High  
> **Goal:** Transform the product from a CLI tool to a comprehensive knowledge management system

### 3.1 Embedding/Vector Search (10x for Retrieval)

**Why:** Current keyword matching has O(n) complexity and misses semantic relationships. Vector search enables:
- Semantic similarity (not just keyword match)
- Faster retrieval at scale (10k+ pages)
- "Find concepts similar to X" queries
- Better answer synthesis

**Implementation Approach:**

```
┌─────────────────────────────────────────────────────────────┐
│                    HYBRID SEARCH ARCHITECTURE               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Query ──►  Keyword Search    ──►  Ranked Results          │
│       │        (current)           │                        │
│       │                            │                        │
│       └─►  Vector Search     ──►    │                        │
│             (new)                  │                        │
│                                      ▼                        │
│                              Combined Results               │
│                               (RRF fusion)                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Technical Components:**

| Component | Technology | Implementation |
|-----------|------------|----------------|
| Embeddings | OpenAI text-embedding-3-small / Ollama | Generate on ingestion |
| Vector store | Faiss / orjson (for small scale) | Local file storage |
| Hybrid search | Reciprocal Rank Fusion | Combine keyword + vector |

**Storage Strategy:**
```
wiki/
├── .embeddings/           # New: vector store
│   ├── index.faiss       # Faiss index
│   └── metadata.json     # Page-to-vectors mapping
```

**Ingestion Changes:**
1. On `wiki ingest`: generate embedding for each new concept page
2. Store embedding + page metadata
3. Update vector index

**Query Changes:**
1. On `wiki query`: generate embedding for question
2. Search vector index for similar pages
3. Combine with keyword results using RRF
4. Feed combined context to ReAct agent

**Impact:**
- 10x faster retrieval at scale
- Semantic matching (find "API patterns" when searching "REST")
- Enable complex queries: "What is similar to X?"

**Risk:** Storage overhead (embeddings ~1-2KB per page)

### 3.2 Multi-Modal Ingestion (10x for Capture)

**Why:** Current system only handles text. Users want to ingest:
- PDFs (research papers, articles)
- Videos (YouTube, lectures)
- Audio (podcasts, meetings)
- Images (diagrams, charts)

**Implementation:**

| Source Type | Processing Approach | LLM Usage |
|-------------|-------------------|-----------|
| PDF | Extract text via pdf-parse or pdf.js | Summarize, extract concepts |
| YouTube URL | youtube-transcript + video details API | Summarize, extract concepts |
| Audio | Whisper transcription | Summarize, extract concepts |
| Images | OCR + vision LLM (if available) | Describe, extract concepts |

**Command Interface:**
```bash
wiki raw --url https://youtube.com/...     # YouTube video
wiki raw --file ./paper.pdf               # PDF
wiki raw --type pdf                       # Specify content type
```

**Processing Pipeline:**
```
Raw Input → Type Detection → Extraction → LLM Processing → Wiki Page
```

**Impact:**
- 10x more sources can be captured
- Meet users where their knowledge already exists
- Reduce manual copying/pasting

### 3.3 Continuous Monitoring (`wiki watch`) (10x for Maintenance)

**Why:** Current system is manual. Users want:
- Automatic health monitoring
- Real-time lint on file changes
- Integration with external tools

**Implementation:**
```bash
# Watch for changes and run lint automatically
wiki watch "wiki lint --skip-llm"

# Watch and sync with cloud (future)
wiki watch --sync
```

**Use Cases:**
- Background health monitoring
- Auto-fix on save (editor integration)
- CI/CD integration for wiki quality gates

**Technical Approach:**
- Use `chokidar` for file watching
- Debounce to prevent rapid-fire triggers
- Background daemon mode

**Impact:**
- Proactive vs. reactive maintenance
- Zero manual health checks
- Integration with development workflows

### 3.4 Export/Import System (10x for Portability)

**Why:** Users want to:
- Export wiki for backup/sharing
- Import from Obsidian
- Generate static sites

**Commands:**
```bash
wiki export json                    # Full backup
wiki export html --template custom  # Static site
wiki import ./obsidian-vault        # Migration
```

**Formats:**
- JSON: Full data + metadata
- YAML: Simplified data
- HTML: Static site generation
- Markdown: Portable backup

**Obsidian Import:**
- Parse Obsidian vault structure
- Convert [[wiki links]] to llm-wiki format
- Import frontmatter metadata

**Impact:**
- Zero lock-in (export anytime)
- Migration path from other tools
- Static site generation for sharing

### 3.5 Self-Orchestration (10x for Agents)

**Why:** llm-wiki should be able to orchestrate itself:

```
┌─────────────────────────────────────────────────────────────┐
│                    SELF-ORCHESTRATION FLOW                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Goal: "Research topic X"                              │
│                                                             │
│  1. wiki search "topic X"     → Check if we know it        │
│  2. IF not found:                                               │
│     wiki raw --url <source>  → Add source                  │
│     wiki ingest              → Process into wiki           │
│  3. wiki query "topic X"     → Get synthesized answer       │
│  4. wiki lint --fix          → Fix any issues              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:**
- All commands return structured JSON
- Agent can parse outputs and make decisions
- Enable scripts/workflows

**Example Agent Script:**
```bash
#!/bin/bash
# Research workflow

TOPIC="$1"

# Check if we have content
RESULT=$(wiki search "$TOPIC" --format json)
if [ "$(echo $RESULT | jq '.total')" -eq 0 ]; then
    echo "No existing content. Need to add sources."
    # Would trigger source addition flow
    exit 1
fi

# Query for answer
wiki query "$TOPIC" --format json --save
```

**Impact:**
- Fully automatable workflows
- Enable complex research pipelines
- llm-wiki becomes a building block

### 3.6 Temporal Knowledge Tracking (10x for Accuracy)

**Why:** Knowledge evolves. Users want to see:
- How understanding has changed over time
- Version history of concepts
- Confidence scoring

**Implementation:**

```
wiki/concepts/
├── api-design.md          # Current version
├── .history/              
│   ├── 2025-01-01.md      # Historical version
│   ├── 2025-03-15.md      # Historical version
│   └── metadata.json      # Version history
```

**Features:**
- Track page changes over time
- Show concept evolution
- Confidence indicators on claims
- Diff views between versions

**Technical Approach:**
1. On page update: copy old version to `.history/`
2. Track timestamp, changes in metadata
3. On query: optionally show historical context

**Impact:**
- Build trust in knowledge base
- Track evolving understanding
- Identify outdated information

---

## 4. Implementation Phases

### Phase 1: Foundation (Months 1-2)

**Focus:** Machine readability and new commands

| Feature | Priority | Effort | Status |
|---------|----------|--------|--------|
| `wiki log` command | P0 | Low | New |
| JSON output for `wiki query` | P0 | Low | New |
| JSON output for `wiki list` | P0 | Low | New |
| JSON output for `wiki lint` | P0 | Low | New |
| `wiki search` command | P0 | Medium | New |
| Global `--format` flag | P1 | Low | New |

**Deliverables:** v0.2.0 release

### Phase 2: Enhancements (Months 3-4)

**Focus:** Command enhancements and export/import

| Feature | Priority | Effort | Status |
|---------|----------|--------|--------|
| `wiki query` interactive mode | P1 | Low | Enhancement |
| `wiki ingest` batch processing | P1 | Medium | Enhancement |
| `wiki export` command | P2 | Medium | New |
| `wiki import` command | P2 | Medium | New |
| `wiki watch` command | P2 | Medium | New |

**Deliverables:** v0.2.1 release

### Phase 3: Transformative (Months 5-12)

**Focus:** 10x improvements

| Feature | Priority | Effort | Status |
|---------|----------|--------|--------|
| Vector/embedding search | P0 | High | New |
| Multi-modal ingestion (PDF) | P1 | Medium | New |
| Temporal tracking | P2 | Medium | New |
| Self-orchestration examples | P2 | Low | New |

**Deliverables:** v0.3.0+ releases

---

## 5. Technical Dependencies

### 5.1 New Dependencies (To Evaluate)

| Dependency | Purpose | Version |
|------------|---------|---------|
| `faiss` / `faiss-node` | Vector similarity search | Latest |
| `pdf-parse` | PDF text extraction | ^1.x |
| `chokidar` | File watching | ^4.x |
| `youtube-transcript` | YouTube transcript | Latest |
| `sharp` | Image processing | ^0.33.x |
| `turndown` | HTML to Markdown | ^7.x |

### 5.2 Infrastructure Requirements

| Requirement | Description |
|-------------|-------------|
| Storage | Additional ~1-2KB per page for embeddings |
| Memory | Higher for vector operations (Faiss) |
| API | OpenAI embedding API calls on ingestion |

---

## 6. Risk Assessment

### 6.1 High-Impact Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-------------|
| Embedding storage bloat | Medium | High | Compress, prune old vectors |
| PDF extraction failures | Medium | Medium | Multiple parsing attempts |
| Breaking existing workflows | Low | High | Backward compatibility mandate |

### 6.2 Medium-Impact Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-------------|
| Vector search quality | Medium | Medium | Hybrid approach (keyword + vector) |
| Import from Obsidian edge cases | Medium | Medium | Comprehensive testing |

---

## 7. Success Metrics

### 7.1 Incremental (Phase 1-2)

| Metric | Target |
|--------|--------|
| Commands with JSON output | 5+ commands |
| `wiki search` response time | <1s for 1000 pages |
| Batch ingestion speed | 3x faster with batching |
| Agent integration tests | 10+ automated |

### 7.2 Transformative (Phase 3)

| Metric | Target |
|--------|--------|
| Vector search accuracy | >80% semantic match recall |
| PDF ingestion success rate | >90% for standard PDFs |
| Hybrid search speed | <2s for 10k pages |
| Self-orchestration workflows | 5+ example scripts |

---

## Appendix A: Command Summary

### Current Commands
| Command | Purpose |
|---------|---------|
| `wiki init` | Initialize wiki |
| `wiki raw` | Add source |
| `wiki ingest` | Process to wiki |
| `wiki query` | Ask question |
| `wiki lint` | Health check |
| `wiki list` | Browse |

### Proposed Commands (New)
| Command | Purpose | Phase |
|---------|---------|-------|
| `wiki log` | View history | 1 |
| `wiki search` | Keyword search | 1 |
| `wiki export` | Export data | 2 |
| `wiki import` | Import data | 2 |
| `wiki watch` | Monitor changes | 2 |

### Proposed Enhancements
| Command | Enhancement |
|---------|-------------|
| `wiki query` | JSON output, interactive, --output |
| `wiki ingest` | Batch, continue, limit |
| `wiki list` | JSON, sort, pagination |
| `wiki lint` | Watch mode, JSON, severity filter |

---

## Appendix B: References

- [PRD.md](./PRD.md) - Product Requirements
- [architecture.md](./architecture.md) - Technical Architecture  
- [JTBD.md](./JTBD.md) - Jobs to be Done
- [command-improvements.md](./command-improvements.md) - Command Proposals

---

**Document End**

*This roadmap was generated through analysis of the llm-wiki codebase and represents the strategic direction for the project. All specifications are subject to change based on implementation feedback and user needs.*