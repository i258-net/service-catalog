import type { GraphView } from "@service-catalog/core/browser";

export interface UiState {
  focus: string | null;
  view: GraphView;
  depth: number;
  q: string;
  expand: string[];
}

export const DEFAULT_STATE: UiState = {
  focus: null,
  view: "neighborhood",
  depth: 1,
  q: "",
  expand: [],
};

export function parseUiState(params: URLSearchParams): UiState {
  const viewParam = params.get("view");
  const view: GraphView =
    viewParam === "upstream" || viewParam === "downstream" || viewParam === "neighborhood"
      ? viewParam
      : "neighborhood";
  const depthRaw = Number.parseInt(params.get("depth") ?? "", 10);
  const defaultDepth = view === "neighborhood" ? 1 : 2;
  return {
    focus: params.get("focus"),
    view,
    depth: Number.isFinite(depthRaw) && depthRaw >= 1 ? depthRaw : defaultDepth,
    q: params.get("q") ?? "",
    expand: (params.get("expand") ?? "").split(",").filter(Boolean),
  };
}

export function toSearchParams(state: UiState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.focus) params.set("focus", state.focus);
  if (state.view !== "neighborhood") params.set("view", state.view);
  const defaultDepth = state.view === "neighborhood" ? 1 : 2;
  if (state.depth !== defaultDepth) params.set("depth", String(state.depth));
  if (state.q) params.set("q", state.q);
  if (state.expand.length > 0) params.set("expand", state.expand.join(","));
  return params;
}
