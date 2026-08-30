"use client";

import { Badge, Input, Surface } from "@i258/ui";
import type { SearchHit } from "../lib/search";

export function SearchBox({
  query,
  hits,
  onQueryChange,
  onSelect,
}: {
  query: string;
  hits: SearchHit[];
  onQueryChange: (q: string) => void;
  onSelect: (ref: string) => void;
}) {
  return (
    <div className="search">
      <Input
        type="search"
        className="search-input"
        value={query}
        placeholder="Search catalog…"
        aria-label="Search catalog"
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) onSelect(hits[0].ref);
        }}
      />
      {query.trim() ? (
        <Surface asChild variant="raised" padding="sm" className="search-results">
          <ul>
            {hits.length === 0 ? (
              <li className="muted">No matches</li>
            ) : (
              hits.map((hit) => (
                <li key={hit.ref}>
                  <button
                    type="button"
                    className="search-hit"
                    onClick={() => onSelect(hit.ref)}
                  >
                    <Badge variant="accent" className="hit-kind">
                      {hit.kind}
                    </Badge>
                    <span className="hit-name">{hit.title || hit.name}</span>
                    <span className="hit-ref">{hit.ref}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </Surface>
      ) : null}
    </div>
  );
}
