import { loadViinaRenderData } from "@/lib/viinaServerData";
import { VIINA_POLICY } from "@/lib/licensing/viinaPolicy";

/**
 * 지구본 렌더 전용 — private/viina-render 캐시를 같은 앱 클라이언트에만 전달.
 * VIINA raw DB export API (/api/viina 등)와 별개. ODbL Produced Work 렌더링.
 * @see docs/copyright-checklist.md
 */
export async function GET() {
  if (!VIINA_POLICY.renderingOnly) {
    return Response.json({ error: "viina-rendering-disabled" }, { status: 404 });
  }

  const data = loadViinaRenderData();
  if (!data?.features?.length) {
    return Response.json(
      {
        error: "viina-render-cache-missing",
        hint: "Run: npm run viina:build",
      },
      { status: 404 },
    );
  }

  return Response.json(data, {
    headers: {
      "Cache-Control": "private, max-age=3600",
      "X-Viina-Policy": "rendering-only",
    },
  });
}
