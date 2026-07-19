import { CatalogAppClient } from "../src/components/CatalogAppClient";
import { loadCatalogSnapshot } from "../src/lib/catalog";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const snapshot = await loadCatalogSnapshot();
  return <CatalogAppClient snapshot={snapshot} />;
}
