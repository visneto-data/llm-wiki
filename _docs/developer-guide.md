# Developer Guide

## Prerequisites

- Node.js >= 22.0.0 (uses native TypeScript support via `--experimental-strip-types`)
- pnpm (project uses pnpm@10.29.2)

## Setup

```bash
cd llm-wiki
pnpm install
```

## Development

### Running the CLI directly (no build)

```bash
pnpm start -- <command>
```

Example:
```bash
pnpm start -- init
pnpm start -- ingest ./my-knowledge-base
pnpm start -- lint
```

### Building

```bash
pnpm run build
```

This compiles TypeScript to JavaScript using tsup and outputs to `dist/`.

### Testing

```bash
pnpm run test           # Run tests once
pnpm run test:watch     # Watch mode
pnpm run test:coverage  # With coverage
```

## Project Structure

```
src/
├── bin/wiki.ts          # Entry point (CLI routing)
├── config/
│   ├── loadConfig.ts    # Config loading (.wikirc.*.yaml)
│   └── defaultConfig.ts
├── core/
│   ├── llmClient.ts    # LLM provider abstraction (OpenAI/Ollama)
│   ├── promptBuilder.ts
│   ├── wikiManager.ts  # Wiki CRUD operations
│   └── fileOps.ts
├── commands/
│   ├── init.ts         # wiki init
│   ├── ingest.ts       # wiki ingest
│   ├── lint.ts         # wiki lint
│   ├── list.ts         # wiki list
│   ├── log.ts          # wiki log
│   ├── query.ts        # wiki query
│   ├── raw.ts          # wiki raw
│   └── search.ts       # wiki search
├── utils/output.ts
└── types/index.ts
```

## Package Manager

The project uses pnpm. Install with:

```bash
npm install -g pnpm
```

## Dependencies

- **commander**: CLI argument parsing
- **openai**: LLM client (supports OpenAI-compatible APIs)
- **cosmiconfig**: Config file loading
- **remark/unified**: Markdown parsing
- **handlebars**: Template rendering
- **yaml**: Config parsing

## Building for Distribution

```bash
npm run build
```

Then link globally for local development:

```bash
npm link
```

Or publish to npm:

```bash
npm publish
```

## Adding New Commands

1. Create `src/commands/<command>.ts`
2. Export a `<command>Command` function that accepts a `Command` from commander
3. Import and register in `src/bin/wiki.ts`

Example command structure:

```typescript
export function myCommand(program: Command) {
  program
    .command('mycommand')
    .description('Description')
    .argument('<arg>')
    .option('-o, --option', 'Option description')
    .action(async (arg, opts) => {
      // implementation
    });
}
```