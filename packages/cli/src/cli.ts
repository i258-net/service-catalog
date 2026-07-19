#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  Graph,
  loadCatalog,
  MERMAID_RELATION_TYPES,
  toMermaid,
  toCatalogSnapshot,
  kindFromString,
  parseRef,
  refOf,
  RELATION_TYPES,
  type Entity,
  type MermaidDirection,
  type RelationType,
} from "@bones/core";

const USAGE = `bones — a small Git-backed software catalog

Usage: bones [--catalog <dir>] <command> [args]

Commands:
  list [--kind <kind>] [--owner <ref>]   List entities
  get <ref>                              Show one entity and its relations
  search <text>                          Search names, titles, descriptions, tags
  related <ref> [--type <relation>]      Direct relations of an entity
  deps <ref> [--reverse] [--depth <n>]   Transitive dependencies (or dependents)
  export [--format mermaid|json]         Emit the graph for external viewers
      [--type <relation>] [--direction TB|LR]
  validate                               Check the catalog and report problems

Entity references are kind:namespace/name; kind and namespace may be omitted
where a default is obvious (e.g. "bones get orders" tries component:default/orders).

The catalog directory defaults to ./catalog or $BONES_CATALOG.`;

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      catalog: { type: "string", short: "C" },
      kind: { type: "string" },
      owner: { type: "string" },
      type: { type: "string" },
      reverse: { type: "boolean" },
      depth: { type: "string" },
      format: { type: "string" },
      direction: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });

  const [command, ...args] = positionals;
  if (values.help || !command) {
    console.log(USAGE);
    return values.help || command ? 0 : 2;
  }

  const dir = values.catalog ?? process.env["BONES_CATALOG"] ?? "catalog";
  const { entities, errors } = await loadCatalog(dir);
  const graph = Graph.build(entities);

  switch (command) {
    case "validate": {
      for (const e of errors) console.error(`error: ${e.file}: ${e.message}`);
      for (const r of graph.danglingRefs) {
        const from = graph.get(r.source);
        console.error(
          `warning: ${from?.sourceFile ?? r.source}: ${r.source} ${r.type} ${r.target}, which does not exist`,
        );
      }
      console.log(
        `${graph.entities.size} entities, ${errors.length} errors, ${graph.danglingRefs.length} dangling references`,
      );
      return errors.length > 0 ? 1 : 0;
    }

    case "list": {
      let list = [...graph.entities.values()];
      if (values.kind) {
        const kind = kindFromString(values.kind);
        if (!kind) throw new Error(`unknown kind "${values.kind}"`);
        list = list.filter((e) => e.kind === kind);
      }
      if (values.owner) {
        const owner = parseRef(values.owner, "Group");
        list = list.filter((e) =>
          graph.relationsOf(refOf(e), "ownedBy").some((r) => r.target === owner),
        );
      }
      for (const e of sortedByRef(list)) printLine(e);
      return 0;
    }

    case "get": {
      const entity = resolve(graph, requireArg(args, "get <ref>"));
      console.log(`${refOf(entity)}`);
      if (entity.metadata.title) console.log(`  title:       ${entity.metadata.title}`);
      if (entity.metadata.description) console.log(`  description: ${entity.metadata.description}`);
      if (entity.metadata.tags.length > 0) console.log(`  tags:        ${entity.metadata.tags.join(", ")}`);
      for (const field of ["type", "lifecycle", "owner"]) {
        const v = entity.spec[field];
        if (typeof v === "string") console.log(`  ${(field + ":").padEnd(12)} ${v}`);
      }
      console.log(`  file:        ${entity.sourceFile}`);
      const relations = graph.relationsOf(refOf(entity));
      if (relations.length > 0) {
        console.log("  relations:");
        for (const r of relations) console.log(`    ${r.type.padEnd(14)} ${r.target}`);
      }
      return 0;
    }

    case "search": {
      const query = requireArg(args, "search <text>").toLowerCase();
      const matches = sortedByRef(
        [...graph.entities.values()].filter((e) =>
          [
            e.metadata.name,
            e.metadata.title ?? "",
            e.metadata.description ?? "",
            ...e.metadata.tags,
          ].some((s) => s.toLowerCase().includes(query)),
        ),
      );
      for (const e of matches) printLine(e);
      return matches.length > 0 ? 0 : 1;
    }

    case "related": {
      const entity = resolve(graph, requireArg(args, "related <ref>"));
      const type = values.type ? parseRelationType(values.type) : undefined;
      for (const r of graph.relationsOf(refOf(entity), type)) {
        console.log(`${r.type.padEnd(14)} ${r.target}${graph.get(r.target) ? "" : "  (missing)"}`);
      }
      return 0;
    }

    case "deps": {
      const entity = resolve(graph, requireArg(args, "deps <ref>"));
      const depth = values.depth ? Number.parseInt(values.depth, 10) : Infinity;
      if (Number.isNaN(depth) || depth < 1) throw new Error("--depth must be a positive integer");
      const type = values.reverse ? "dependencyOf" : "dependsOn";
      for (const step of graph.traverse(refOf(entity), type, depth)) {
        console.log(`${"  ".repeat(step.depth - 1)}${step.ref}${graph.get(step.ref) ? "" : "  (missing)"}`);
      }
      return 0;
    }

    case "export": {
      const format = (values.format ?? "mermaid").toLowerCase();
      if (format === "json") {
        process.stdout.write(`${JSON.stringify(toCatalogSnapshot(graph, errors), null, 2)}\n`);
        return 0;
      }
      if (format !== "mermaid") {
        throw new Error(`unknown export format "${values.format}" (supported: mermaid, json)`);
      }
      const options: Parameters<typeof toMermaid>[1] = {};
      if (values.type) {
        const type = parseRelationType(values.type);
        if (!(MERMAID_RELATION_TYPES as readonly RelationType[]).includes(type)) {
          throw new Error(
            `export --type must be a forward relation (one of: ${MERMAID_RELATION_TYPES.join(", ")})`,
          );
        }
        options.types = [type];
      }
      if (values.direction !== undefined) {
        options.direction = parseDirection(values.direction);
      }
      process.stdout.write(toMermaid(graph, options));
      return 0;
    }

    default:
      throw new Error(`unknown command "${command}" (run bones --help)`);
  }
}

function parseRelationType(value: string): RelationType {
  const type = RELATION_TYPES.find((t) => t.toLowerCase() === value.toLowerCase());
  if (!type) {
    throw new Error(`unknown relation "${value}" (one of: ${RELATION_TYPES.join(", ")})`);
  }
  return type;
}

function parseDirection(value: string): MermaidDirection {
  const direction = value.toUpperCase();
  if (direction !== "TB" && direction !== "LR") {
    throw new Error(`unknown --direction "${value}" (one of: TB, LR)`);
  }
  return direction;
}

function requireArg(args: string[], usage: string): string {
  if (!args[0]) throw new Error(`missing argument: bones ${usage}`);
  return args[0];
}

/** Resolve user input to an entity, trying each kind if none was given. */
function resolve(graph: Graph, input: string): Entity {
  if (input.includes(":")) {
    const entity = graph.get(parseRef(input));
    if (!entity) throw new Error(`no entity ${parseRef(input)}`);
    return entity;
  }
  const matches = [...graph.entities.values()].filter(
    (e) => refOf(e) === parseRef(input, e.kind),
  );
  if (matches.length === 1) return matches[0]!;
  if (matches.length === 0) throw new Error(`no entity matching "${input}"`);
  throw new Error(
    `"${input}" is ambiguous: ${matches.map(refOf).join(", ")}`,
  );
}

function sortedByRef(entities: Entity[]): Entity[] {
  return entities.sort((a, b) => refOf(a).localeCompare(refOf(b)));
}

function printLine(e: Entity): void {
  const title = e.metadata.title ?? e.metadata.description ?? "";
  console.log(`${refOf(e).padEnd(40)} ${title}`.trimEnd());
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (err) {
  console.error(`bones: ${err instanceof Error ? err.message : err}`);
  process.exitCode = 2;
}
