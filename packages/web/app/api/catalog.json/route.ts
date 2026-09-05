import { loadCatalogDocument } from "../../../src/lib/catalog";

export const dynamic = "force-dynamic";

/**
 * Machine-readable catalog for tools and agents (n8n, etc.).
 * Browser UI stays on `/`; this is the honeycomb-style JSON twin.
 */
export async function GET() {
  try {
    const doc = await loadCatalogDocument();
    return Response.json(doc, {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: "catalog_unavailable", message },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
