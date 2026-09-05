"use client";

import type { CatalogSnapshot, Entity } from "@service-catalog/core/browser";
import { refOf } from "@service-catalog/core/browser";
import { Badge } from "@i258/ui";
import {
  formatSpecScalar,
  hasInventoryFields,
  INVENTORY_SPEC_KEYS,
  isUnverified,
  remainingSpecKeys,
} from "../lib/inspectorSpec";

function SpecValue({ value }: { value: unknown }) {
  const formatted = formatSpecScalar(value);
  return (
    <dd
      className={formatted.isNull ? "spec-null" : undefined}
      title={formatted.title}
    >
      {formatted.text.includes("\n") ? (
        <pre className="spec-pre">{formatted.text}</pre>
      ) : (
        <span className="spec-mono">{formatted.text}</span>
      )}
    </dd>
  );
}

function SpecRows({
  keys,
  spec,
}: {
  keys: readonly string[];
  spec: Record<string, unknown>;
}) {
  return (
    <>
      {keys.map((field) => {
        if (!(field in spec)) return null;
        return (
          <div key={field}>
            <dt>{field}</dt>
            <SpecValue value={spec[field]} />
          </div>
        );
      })}
    </>
  );
}

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
  const showInventory = hasInventoryFields(entity.spec);
  const otherKeys = remainingSpecKeys(entity.spec);
  const unverified = isUnverified(entity.spec);

  return (
    <div className="inspector">
      <h2>{entity.metadata.title ?? entity.metadata.name}</h2>
      <div className="inspector-badges">
        <Badge variant="accent" className="kind-badge">
          {entity.kind}
        </Badge>
        {unverified && (
          <Badge variant="warning" className="kind-badge">
            Unverified
          </Badge>
        )}
      </div>
      <code className="ref">{ref}</code>
      {entity.metadata.description && <p>{entity.metadata.description}</p>}
      {entity.metadata.tags.length > 0 && (
        <p className="tags">{entity.metadata.tags.join(" · ")}</p>
      )}
      <dl>
        <SpecRows keys={["type", "lifecycle", "owner"] as const} spec={entity.spec} />
        <div>
          <dt>file</dt>
          <dd>{entity.sourceFile}</dd>
        </div>
      </dl>
      {showInventory && (
        <>
          <h3>Inventory</h3>
          <dl>
            <SpecRows keys={INVENTORY_SPEC_KEYS} spec={entity.spec} />
          </dl>
        </>
      )}
      {otherKeys.length > 0 && (
        <>
          <h3>Other</h3>
          <dl>
            <SpecRows keys={otherKeys} spec={entity.spec} />
          </dl>
        </>
      )}
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
