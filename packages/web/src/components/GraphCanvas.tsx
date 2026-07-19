"use client";

import type { GraphView, Projection } from "@bones/core/browser";
import type { Core, ElementDefinition } from "cytoscape";
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
              "text-valign": "center",
              "text-halign": "center",
              "font-size": 11,
              color: "#0f172a",
              "background-color": "data(color)",
              "border-width": 2,
              "border-color": "#0f172a22",
              width: 28,
              height: 28,
              "text-wrap": "wrap",
              "text-max-width": "90px",
            },
          },
          {
            selector: "node[?focus]",
            style: {
              width: 36,
              height: 36,
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
              width: 64,
              height: 28,
              "font-size": 10,
              "background-color": "#e2e8f0",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "curve-style": "bezier",
              "target-arrow-shape": "triangle",
              "arrow-scale": 0.8,
              "line-color": "#94a3b8",
              "target-arrow-color": "#94a3b8",
              label: "data(type)",
              "font-size": 8,
              color: "#64748b",
              "text-rotation": "autorotate",
            },
          },
        ],
        layout: { name: "preset" },
        wheelSensitivity: 0.2,
      });

      cy.on("tap", "node", (evt) => {
        onClickRef.current(evt.target.id());
      });

      cyRef.current = cy;
      applyProjection(cy, projection, view);
    }

    void boot();
    return () => {
      cancelled = true;
      cy?.destroy();
      cyRef.current = null;
    };
    // Mount once; projection updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    applyProjection(cy, projection, view);
  }, [projection, view]);

  return <div className="graph-canvas" ref={containerRef} />;
}

function applyProjection(cy: Core, projection: Projection, view: GraphView): void {
  const elements: ElementDefinition[] = [
    ...projection.nodes.map((node) => ({
      group: "nodes" as const,
      data: {
        id: node.ref,
        label: node.label,
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

  cy.elements().remove();
  cy.add(elements);

  const layoutOptions =
    view === "neighborhood"
      ? {
          name: "fcose",
          animate: false,
          randomize: false,
          quality: "default",
          nodeSeparation: 80,
        }
      : {
          name: "elk",
          animate: false,
          elk: {
            algorithm: "layered",
            "elk.direction": view === "upstream" ? "LEFT" : "RIGHT",
            "elk.spacing.nodeNode": 40,
            "elk.layered.spacing.nodeNodeBetweenLayers": 60,
          },
        };

  cy.layout(layoutOptions as Parameters<Core["layout"]>[0]).run();
}
