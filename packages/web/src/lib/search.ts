import {
  searchableText,
  type CatalogSnapshot,
  type Entity,
  refOf,
} from "@service-catalog/core/browser";
import MiniSearch from "minisearch";

export interface SearchHit {
  ref: string;
  kind: string;
  name: string;
  title?: string;
  score: number;
}

export function buildSearchIndex(snapshot: CatalogSnapshot): MiniSearch {
  const mini = new MiniSearch({
    fields: ["name", "title", "description", "tags", "kind", "blob"],
    storeFields: ["ref", "kind", "name", "title"],
    idField: "ref",
    tokenize: (text) =>
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean),
    processTerm: (term) => term.toLowerCase(),
    searchOptions: {
      boost: { name: 4, title: 3, blob: 2, tags: 1.5, kind: 1, description: 1 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  mini.addAll(
    snapshot.entities.map((entity) => ({
      ref: refOf(entity),
      kind: entity.kind,
      name: entity.metadata.name,
      title: entity.metadata.title ?? "",
      description: entity.metadata.description ?? "",
      tags: entity.metadata.tags.join(" "),
      blob: searchableText(
        entity.metadata.name,
        entity.metadata.title,
        entity.metadata.description,
        ...entity.metadata.tags,
        entity.kind,
      ),
    })),
  );

  return mini;
}

export function searchEntities(
  index: MiniSearch,
  query: string,
  limit = 20,
): SearchHit[] {
  const q = query.trim();
  if (!q) return [];
  return index.search(q).slice(0, limit).map((hit) => ({
    ref: String(hit.id),
    kind: String(hit.kind),
    name: String(hit.name),
    title: hit.title ? String(hit.title) : undefined,
    score: hit.score,
  }));
}

export function entityMap(snapshot: CatalogSnapshot): Map<string, Entity> {
  return new Map(snapshot.entities.map((e) => [refOf(e), e]));
}
