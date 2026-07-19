"use client";

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
      <input
        type="search"
        value={query}
        placeholder="Search catalog…"
        aria-label="Search catalog"
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) onSelect(hits[0].ref);
        }}
      />
      {query.trim() && (
        <ul className="search-results">
          {hits.length === 0 ? (
            <li className="muted">No matches</li>
          ) : (
            hits.map((hit) => (
              <li key={hit.ref}>
                <button type="button" onClick={() => onSelect(hit.ref)}>
                  <span className="hit-kind">{hit.kind}</span>
                  <span className="hit-name">{hit.title || hit.name}</span>
                  <span className="hit-ref">{hit.ref}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
