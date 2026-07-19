"use client";

import { Suspense } from "react";
import type { CatalogSnapshot } from "@bones/core/browser";
import { CatalogApp, CatalogAppFallback } from "./CatalogApp";

export function CatalogAppClient({ snapshot }: { snapshot: CatalogSnapshot }) {
  return (
    <Suspense fallback={<CatalogAppFallback />}>
      <CatalogApp snapshot={snapshot} />
    </Suspense>
  );
}
