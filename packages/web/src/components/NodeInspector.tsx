"use client";

import type { CatalogSnapshot, Entity } from "@bones/core/browser";
import { refOf } from "@bones/core/browser";

export function NodeInspector({
  focus,
  entity,
  snapshot,
  onFocus,
}: {
  focus: string | null;
  entity: Entity | undefined;
  snapshot: CatalogSnapshot;
  onFocus: (ref: string) => void;
}) {
  if (!focus) {
    return (
      <div className="inspector">
        <h2>Inspector</h2>
        <p className="muted">Select a node to inspect metadata and relations.</p>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="inspector">
        <h2>Inspector</h2>
        <p className="warn">Unknown entity</p>
        <code>{focus}</code>
      </div>
    );
  }

  const ref = refOf(entity);
  const relations = snapshot.relations
    .filter((r) => r.source === ref)
    .sort((a, b) => a.type.localeCompare(b.type) || a.target.localeCompare(b.target));

  return (
    <div className="inspector">
      <h2>{entity.metadata.title ?? entity.metadata.name}</h2>
      <p className="kind-badge">{entity.kind}</p>
      <code className="ref">{ref}</code>
      {entity.metadata.description && <p>{entity.metadata.description}</p>}
      {entity.metadata.tags.length > 0 && (
        <p className="tags">{entity.metadata.tags.join(" · ")}</p>
      )}
      <dl>
        {(["type", "lifecycle", "owner"] as const).map((field) => {
          const value = entity.spec[field];
          if (typeof value !== "string") return null;
          return (
            <div key={field}>
              <dt>{field}</dt>
              <dd>{value}</dd>
            </div>
          );
        })}
        <div>
          <dt>file</dt>
          <dd>{entity.sourceFile}</dd>
        </div>
      </dl>
      <h3>Relations</h3>
      {relations.length === 0 ? (
        <p className="muted">None</p>
      ) : (
        <ul className="relation-list">
          {relations.map((r) => (
            <li key={`${r.type}:${r.target}`}>
              <span className="rel-type">{r.type}</span>
              <button type="button" onClick={() => onFocus(r.target)}>
                {r.target}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
