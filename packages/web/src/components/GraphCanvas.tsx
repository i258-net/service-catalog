"use client";

import type { GraphView, Projection } from "@service-catalog/core/browser";
import type { Core, ElementDefinition, EventObject } from "cytoscape";
import { useEffect, useRef } from "react";

const KIND_COLORS: Record<string, string> = {
  Component: "#2f6fed",
  API: "#0f9f6e",
  Resource: "#c27803",
  System: "#7c3aed",
  Domain: "#be185d",
  Group: "#475569",
  User: "#64748b",
  GroupStub: "#94a3b8",
};

const LABEL_MAX = 26;

export function GraphCanvas({
  projection,
  view,
  onNodeClick,
}: {
  projection: Projection;
  view: GraphView;
  onNodeClick: (ref: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const onClickRef = useRef(onNodeClick);
  onClickRef.current = onNodeClick;

  useEffect(() => {
    let cancelled = false;
    let cy: Core | undefined;

    async function boot() {
      const cytoscape = (await import("cytoscape")).default;
      const elk = (await import("cytoscape-elk")).default;
      const fcose = (await import("cytoscape-fcose")).default;
      cytoscape.use(elk as never);
      cytoscape.use(fcose as never);
      if (cancelled || !containerRef.current) return;

      cy = cytoscape({
        container: containerRef.current,
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "text-valign": "bottom",
              "text-halign": "center",
              "text-margin-y": 8,
              "font-size": 10,
              color: "#0f172a",
              "text-background-color": "#f8fafc",
              "text-background-opacity": 0.92,
              "text-background-padding": "2px",
              "text-background-shape": "roundrectangle",
              "background-color": "data(color)",
              "border-width": 2,
              "border-color": "#0f172a22",
              width: 26,
              height: 26,
              "text-wrap": "wrap",
              "text-max-width": "110px",
              "min-zoomed-font-size": 8,
            },
          },
          {
            selector: "node[?focus]",
            style: {
              width: 34,
              height: 34,
              "border-width": 3,
              "border-color": "#0f172a",
              "font-weight": "bold",
            },
          },
          {
            selector: "node[?missing]",
            style: {
              "background-color": "#fecaca",
              "border-style": "dashed",
            },
          },
          {
            selector: "node[?group]",
            style: {
              shape: "round-rectangle",
              width: 72,
              height: 26,
              "font-size": 10,
              "text-valign": "center",
              "text-margin-y": 0,
              "background-color": "#e2e8f0",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "arrow-scale": 0.75,
              "line-color": "#94a3b8",
              "target-arrow-color": "#94a3b8",
              label: "",
              "font-size": 9,
              color: "#475569",
              "text-background-color": "#f8fafc",
              "text-background-opacity": 0.95,
              "text-background-padding": "2px",
              "text-rotation": "autorotate",
            },
          },
          {
            selector: "edge.hover",
            style: {
              width: 2.5,
              "line-color": "#64748b",
              "target-arrow-color": "#64748b",
              label: "data(type)",
              "z-index": 999,
            },
          },
          {
            selector: "node.hover",
            style: {
              "border-width": 3,
              "border-color": "#1d4ed8",
            },
          },
        ],
        layout: { name: "preset" },
        wheelSensitivity: 0.2,
      });

      cy.on("tap", "node", (evt) => {
        onClickRef.current(evt.target.id());
      });

      cy.on("mouseover", "node", (evt) => showTip(evt, tipRef.current));
      cy.on("mousemove", "node", (evt) => moveTip(evt, tipRef.current));
      cy.on("mouseout", "node", (evt) => {
        evt.target.removeClass("hover");
        hideTip(tipRef.current);
      });

      cy.on("mouseover", "edge", (evt) => {
        evt.target.addClass("hover");
      });
      cy.on("mouseout", "edge", (evt) => {
        evt.target.removeClass("hover");
      });

      cyRef.current = cy;
      applyProjection(cy, projection, view);
    }

    void boot();
    return () => {
      cancelled = true;
      hideTip(tipRef.current);
      cy?.destroy();
      cyRef.current = null;
    };
    // Mount once; projection updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    hideTip(tipRef.current);
    applyProjection(cy, projection, view);
  }, [projection, view]);

  return (
    <div className="graph-shell">
      <div className="graph-canvas" ref={containerRef} />
      <div className="graph-tip" ref={tipRef} hidden />
    </div>
  );
}

function truncateLabel(text: string, max = LABEL_MAX): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(1, max - 1))}…`;
}

function showTip(evt: EventObject, tip: HTMLDivElement | null): void {
  if (!tip) return;
  const node = evt.target;
  node.addClass("hover");
  const full = String(node.data("fullLabel") ?? node.data("label") ?? "");
  const ref = String(node.id());
  tip.hidden = false;
  tip.textContent = full && full !== ref ? `${full}\n${ref}` : ref;
  moveTip(evt, tip);
}

function moveTip(evt: EventObject, tip: HTMLDivElement | null): void {
  if (!tip || tip.hidden) return;
  const { x, y } = evt.renderedPosition || evt.target.renderedPosition();
  tip.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
}

function hideTip(tip: HTMLDivElement | null): void {
  if (!tip) return;
  tip.hidden = true;
  tip.textContent = "";
}

function applyProjection(cy: Core, projection: Projection, view: GraphView): void {
  const elements: ElementDefinition[] = [
    ...projection.nodes.map((node) => ({
      group: "nodes" as const,
      data: {
        id: node.ref,
        label: truncateLabel(node.label),
        fullLabel: node.label,
        color: KIND_COLORS[node.kind] ?? "#64748b",
        focus: node.isFocus || undefined,
        missing: node.missing || undefined,
        group: node.group ? true : undefined,
      },
    })),
    ...projection.edges.map((edge) => ({
      group: "edges" as const,
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
      },
    })),
  ];

  cy.batch(() => {
    cy.elements().remove();
    cy.add(elements);
  });

  const layoutOptions =
    view === "neighborhood"
      ? {
          name: "fcose",
          animate: false,
          randomize: true,
          quality: "default",
          nodeSeparation: 140,
          idealEdgeLength: 110,
          nodeRepulsion: 6500,
          fit: true,
          padding: 40,
        }
      : {
          name: "elk",
          animate: false,
          fit: true,
          padding: 40,
          nodeDimensionsIncludeLabels: true,
          elk: {
            "elk.algorithm": "layered",
            "elk.direction": view === "upstream" ? "LEFT" : "RIGHT",
            "elk.edgeRouting": "ORTHOGONAL",
            "elk.spacing.nodeNode": 56,
            "elk.spacing.edgeNode": 28,
            "elk.spacing.edgeEdge": 18,
            "elk.layered.spacing.nodeNodeBetweenLayers": 100,
            "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
            "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
          },
        };

  cy.layout(layoutOptions as Parameters<Core["layout"]>[0]).run();
}
