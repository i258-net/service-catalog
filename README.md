# Bones

Bones is a small Git-backed software catalog. It loads
[Backstage-compatible](https://backstage.io/docs/features/software-catalog/descriptor-format)
entity YAML files from a directory, validates the subset of the format it
supports, normalizes entities and relationships into an in-memory graph, and
exposes:

- a **CLI** for searching and traversing that graph
- a **Next.js graph browser** for read-only local navigation

The YAML files are the source of truth. There is no database: the CLI rebuilds
the graph in memory on every run, and the web app loads the catalog on the
server via the shared `@bones/core` library.

## Monorepo layout

```text
packages/
  core/   # @bones/core — loader, graph, snapshot, search helpers
  cli/    # @bones/cli  — `bones` binary
  web/    # @bones/web  — Next.js catalog graph UI
sample-catalog/
```

## Install

```bash
pnpm install
pnpm --filter @bones/core build
```

## CLI

```bash
pnpm bones [--catalog <dir>] <command>
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
pnpm bones --catalog sample-catalog validate
pnpm bones --catalog sample-catalog list
pnpm bones --catalog sample-catalog list --kind component --owner payments-team
pnpm bones --catalog sample-catalog search postgres
pnpm bones --catalog sample-catalog get orders
pnpm bones --catalog sample-catalog related orders --type consumesApi
pnpm bones --catalog sample-catalog deps storefront-web
pnpm bones --catalog sample-catalog deps orders-db --reverse
pnpm bones --catalog sample-catalog export
pnpm bones --catalog sample-catalog export --format json
pnpm bones --catalog sample-catalog export --type dependsOn --direction TB
```

Paste Mermaid export into any Mermaid preview. Only forward relations are
drawn so inverse pairs do not double every edge.

Entity references are `kind:namespace/name`. Kind and namespace may be
omitted where a default is obvious: `pnpm bones --catalog sample-catalog get orders`
finds `component:default/orders` as long as the name is unambiguous.

## Graph UI

```bash
pnpm dev
# opens http://localhost:3000
# loads sample-catalog by default (override with BONES_CATALOG)
```

The UI is a read-only local graph browser:

1. Search entities by name/metadata (normalized: `cost of living` matches
   `cost-of-living-api`, camelCase, etc.).
2. Open a focused neighborhood, upstream, or downstream projection.
3. Click nodes to refocus; use browser Back/Forward.
4. Inspect metadata and relations in the side panel.
5. Large relation fan-outs collapse into expandable stubs.

Shareable URLs use query params, for example:

```text
http://localhost:3000/?focus=component:default/orders&view=upstream&depth=2
```

## Supported format

Kinds: `Component`, `API`, `System`, `Domain`, `Resource`, `Group`, `User`,
with `apiVersion: backstage.io/v1alpha1`.

Relations are derived from these `spec` fields (inverses are generated
automatically, e.g. `ownedBy`/`ownerOf`):

| field            | on                                       | relation      |
| ---------------- | ---------------------------------------- | ------------- |
| `owner`          | Component, API, System, Domain, Resource | `ownedBy`     |
| `dependsOn`      | Component, API, Resource                 | `dependsOn`   |
| `providesApis`   | Component                                | `providesApi` |
| `consumesApis`   | Component                                | `consumesApi` |
| `system`         | Component, API, Resource                 | `partOf`      |
| `subcomponentOf` | Component                                | `partOf`      |
| `domain`         | System                                   | `partOf`      |
| `parent`         | Group                                    | `childOf`     |
| `memberOf`       | User                                     | `memberOf`    |

Everything else in `spec` is carried along untouched but not interpreted.

## Development

```bash
pnpm test       # @bones/core unit tests
pnpm build      # core, cli, and web
pnpm dev        # Next.js graph UI
```
