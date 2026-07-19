"use client";

import type { CatalogSnapshot } from "@bones/core/browser";
import { projectCatalog } from "@bones/core/browser";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSearchIndex, entityMap, searchEntities } from "../lib/search";
import { parseUiState, toSearchParams, type UiState } from "../lib/urlState";
import { GraphCanvas } from "./GraphCanvas";
import { NodeInspector } from "./NodeInspector";
import { SearchBox } from "./SearchBox";
import { ViewControls } from "./ViewControls";

export function CatalogApp({ snapshot }: { snapshot: CatalogSnapshot }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<UiState>(() =>
    parseUiState(new URLSearchParams(searchParams.toString())),
  );

  useEffect(() => {
    setState(parseUiState(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  const index = useMemo(() => buildSearchIndex(snapshot), [snapshot]);
  const entities = useMemo(() => entityMap(snapshot), [snapshot]);
  const hits = useMemo(() => searchEntities(index, state.q), [index, state.q]);

  const commit = useCallback(
    (next: UiState, mode: "push" | "replace" = "push") => {
      setState(next);
      const qs = toSearchParams(next).toString();
      const href = qs ? `${pathname}?${qs}` : pathname;
      if (mode === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router],
  );

  const projection = useMemo(() => {
    if (!state.focus) return null;
    return projectCatalog(snapshot, {
      focus: state.focus,
      view: state.view,
      depth: state.depth,
      expandedGroups: state.expand,
    });
  }, [snapshot, state.focus, state.view, state.depth, state.expand]);

  const focusEntity = state.focus ? entities.get(state.focus) : undefined;

  const onNodeClick = (ref: string) => {
    if (ref.startsWith("group:")) {
      const groupId = ref.slice("group:".length);
      if (state.expand.includes(groupId)) return;
      commit({ ...state, expand: [...state.expand, groupId].sort() });
      return;
    }
    commit({ ...state, focus: ref, expand: [] });
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">Bones</span>
          <span className="brand-sub">catalog graph</span>
        </div>
        <SearchBox
          query={state.q}
          hits={hits}
          onQueryChange={(q) => commit({ ...state, q }, "replace")}
          onSelect={(ref) =>
            commit({
              ...state,
              focus: ref,
              q: "",
              depth: state.view === "neighborhood" ? 1 : Math.max(state.depth, 2),
              expand: [],
            })
          }
        />
        <ViewControls
          view={state.view}
          depth={state.depth}
          disabled={!state.focus}
          onViewChange={(view) =>
            commit({
              ...state,
              view,
              depth: view === "neighborhood" ? 1 : Math.max(state.depth, 2),
              expand: [],
            })
          }
          onDepthChange={(depth) => commit({ ...state, depth })}
        />
      </header>

      <main className="workspace">
        <section className="canvas-pane">
          {!state.focus || !projection ? (
            <div className="empty">
              <p>Search for a service, API, or system to open its local graph.</p>
              <p className="muted">{snapshot.entities.length} entities loaded</p>
            </div>
          ) : (
            <GraphCanvas
              projection={projection}
              onNodeClick={onNodeClick}
              view={state.view}
            />
          )}
        </section>
        <aside className="inspector-pane">
          <NodeInspector
            focus={state.focus}
            entity={focusEntity}
            snapshot={snapshot}
            onFocus={(ref) => commit({ ...state, focus: ref, expand: [] })}
          />
        </aside>
      </main>
    </div>
  );
}

export function CatalogAppFallback() {
  return <div className="empty">Loading catalog…</div>;
}
