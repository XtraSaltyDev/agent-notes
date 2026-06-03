# agent-notes

`agent-notes` is a deterministic TypeScript CLI that scans a repository and
generates lightweight Markdown context files for AI coding agents and human
contributors.

It does not call AI services, use external project APIs, or mutate hidden repo
state. Generated files are plain Markdown so changes are easy to review.

## Why

AI coding agents work better when project context is explicit and reviewable.
`agent-notes` keeps v0.1 intentionally small: it detects common Node.js and
TypeScript project signals, then writes a conservative `AGENTS.md` plus a few
supporting notes under `.agent-notes/`.

## Install

```sh
npm install --save-dev agent-notes
```

Run without installing globally:

```sh
npx agent-notes scan
```

## Usage

Scan the current repository:

```sh
agent-notes scan
agent-notes scan --json
```

Scan another repository without changing directories:

```sh
agent-notes scan --path ../other-repo
agent-notes scan --path ../other-repo --json
```

Generate notes:

```sh
agent-notes init
agent-notes init --dry-run
agent-notes init --force
```

Refresh generated notes while preserving manual content outside generated
sections:

```sh
agent-notes update
agent-notes update --dry-run
agent-notes update --force
```

Check whether expected note files exist:

```sh
agent-notes doctor
```

## Generated Files

```text
AGENTS.md
.agent-notes/
  project.md
  commands.md
  conventions.md
  risks.md
```

`init` refuses to overwrite existing files unless `--force` is passed.
Generated content is wrapped in deterministic markers:

```text
<!-- agent-notes:start -->
generated content
<!-- agent-notes:end -->
```

`update` only refreshes content inside those markers unless `--force` is passed.

## CLI Commands

- `scan`: prints a human-readable summary for the current directory.
- `scan --path <dir>`: scans a different directory.
- `scan --json`: prints the same analysis as JSON.
- `init`: writes `AGENTS.md` and `.agent-notes/*.md`.
- `init --dry-run`: prints the write plan without changing files.
- `init --force`: overwrites expected generated files.
- `update`: refreshes agent-notes generated sections.
- `update --dry-run`: prints the update plan without changing files.
- `update --force`: overwrites expected generated files that do not have markers.
- `doctor`: reports which expected files are present or missing.

## v0.1 Detection Scope

`agent-notes` focuses on Node.js and TypeScript repositories. It detects common
files such as `package.json`, lockfiles, `tsconfig.json`, Vite/Next configs,
ESLint/Prettier configs, test configs, `README.md`, and GitHub Actions
workflows.

Limitations:

- It does not parse arbitrary framework configuration deeply.
- It does not infer scripts that are missing from `package.json`.
- It does not inspect remote services.
- It does not publish, commit, or push anything.

## Roadmap

The next releases are planned as boring-useful improvements:

- Better monorepo detection
- Generated-file provenance headers
- `.agent-notes.json` config support
- README examples with realistic output

See [ROADMAP.md](ROADMAP.md) for scope notes.

## Contributing

Keep changes deterministic, small, and easy to review. Avoid adding external
service calls or hidden repository mutation.

## License

MIT
