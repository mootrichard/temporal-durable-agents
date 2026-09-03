# Durable agent tree explainer

This static site supports an interview walkthrough of the demo. It first traces
an application-managed agent protocol. It then compares process-owned
orchestration with its Temporal replacement.

## Preview the site

From the repository root, install the dependencies and start the documentation
server:

```bash
npm install
npm run docs:dev
```

Open [the local explainer](http://localhost:3000).

## Build the static export

Create a production build:

```bash
npm run docs:build
```

Next.js writes the static export to `explainer/out/`. The build also validates
the MDX structure, Code Hike block schemas, and TypeScript components.

## Documentation structure

- `app/page.tsx`: defines the repair job and agentic loop.
- `app/walkthrough/content.mdx`: traces the process-owned agent tree and failure.
- `app/temporal/content.mdx`: compares each original step with its Temporal
  replacement.
- `app/run-it/content.mdx`: provides the local run and verification procedure.
- `components/walkthrough.tsx`: renders the scenario 1 code trace.
- `components/migration.tsx`: renders the original and Temporal comparison.
- `components/code.tsx`: highlights code and renders focus annotations,
  filenames, and line numbers.

## Update scenario 1

Each walkthrough step in `app/walkthrough/content.mdx` has one heading, one
state owner, explanatory prose, and one decorated code block:

````mdx
## !!steps Explain the implementation decision

!owner Temporal Event History

Explain the behavior, its purpose, and its recovery consequence.

```ts ! src/example.ts
// !focus(1:3)
const result = await durableOperation()
return result
```
````

The `!!steps` decoration appends the section to the walkthrough step array. The
`!owner` decoration supplies the state-owner label. The `!` after the code fence
assigns the block to the step's `code` field. A `!focus` annotation highlights a
relative line range after the annotation comment.

Keep excerpts aligned with the named source file. Use a valid source comment to
mark omitted setup or bookkeeping when an excerpt could imply that it is a
complete function.

## Update scenario 2

Each step in `app/temporal/content.mdx` adds a short change label and two code
blocks. Use `!before` for the original code and `!after` for the Temporal code.
The version control displays both excerpts in the same code pane.
