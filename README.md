# Bones

Bones is a small Git-backed software catalog. It loads
[Backstage-compatible](https://backstage.io/docs/features/software-catalog/descriptor-format)
entity YAML files from a directory, validates the subset of the format it
supports, normalizes entities and relationships into an in-memory graph, and
exposes a CLI for searching and traversing that graph.

The YAML files are the source of truth. There is no database and no server:
the entire graph is rebuilt in memory on every run.

## Install

```bash
pnpm install
pnpm build
pnpm link -g    # optional: puts `bones` on your PATH
```

Without `pnpm link -g`, use `pnpm bones <command>` (runs the TypeScript
directly on Node's type stripping).

## Usage

```bash
bones [--catalog <dir>] <command>
```

The catalog directory defaults to `./catalog`, or `$BONES_CATALOG` if set.
Every `.yaml`/`.yml` file under it (recursively, multi-document supported)
is loaded on each run. This repo ships an example catalog in
`sample-catalog/`; try the commands below with `--catalog sample-catalog`
(or `export BONES_CATALOG=sample-catalog`).

`catalog/` is gitignored here on purpose: clone your real catalog repo to
`./catalog` inside this checkout and the default path just works, while the
data stays under its own git history, separate from the tool's.

```bash
bones validate                      # report format errors and dangling references
bones list                          # all entities
bones list --kind component --owner payments-team
bones search postgres               # match name, title, description, tags
bones get orders                    # one entity, its spec highlights and relations
bones related orders --type consumesApi
bones deps storefront-web           # transitive dependencies, indented by depth
bones deps orders-db --reverse      # what would break if this went away
bones export                        # Mermaid flowchart on stdout
bones export --type dependsOn       # only dependency edges
bones export --direction TB > catalog.mmd
```

Paste the export into any Mermaid preview (GitHub, Obsidian, the
[live editor](https://mermaid.live), etc.). Only forward relations are
drawn (`ownedBy`, `dependsOn`, `partOf`, …) so inverse pairs do not
double every edge.

Entity references are `kind:namespace/name`. Kind and namespace may be
omitted where a default is obvious: `bones get orders` finds
`component:default/orders` as long as the name is unambiguous.

## Supported format

Kinds: `Component`, `API`, `System`, `Domain`, `Resource`, `Group`, `User`,
with `apiVersion: backstage.io/v1alpha1`.

Relations are derived from these `spec` fields (inverses are generated
automatically, e.g. `ownedBy`/`ownerOf`):

| field            | on                                      | relation      |
| ---------------- | --------------------------------------- | ------------- |
| `owner`          | Component, API, System, Domain, Resource | `ownedBy`     |
| `dependsOn`      | Component, API, Resource                | `dependsOn`   |
| `providesApis`   | Component                               | `providesApi` |
| `consumesApis`   | Component                               | `consumesApi` |
| `system`         | Component, API, Resource                | `partOf`      |
| `subcomponentOf` | Component                               | `partOf`      |
| `domain`         | System                                  | `partOf`      |
| `parent`         | Group                                   | `childOf`     |
| `memberOf`       | User                                    | `memberOf`    |

Everything else in `spec` is carried along untouched but not interpreted.

## Development

```bash
pnpm test       # node:test, runs the .ts sources directly
pnpm build      # type-check and compile to dist/
```

Layout: `src/loader.ts` reads and validates YAML, `src/graph.ts` builds the
graph and traversals, `src/mermaid.ts` renders Mermaid flowcharts,
`src/cli.ts` is the command-line surface, and `sample-catalog/` holds a
small example catalog.
