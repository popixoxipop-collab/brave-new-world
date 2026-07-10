import { NextResponse } from "next/server";
import { fetchLatestGdeltEvents } from "@/lib/gdeltParse";
import { fetchGdeltThemeCached, type GdeltTheme } from "@/lib/gdeltTheme";
import { apiStubResponse } from "@/lib/apiStub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const stub = apiStubResponse("gdelt", request);
  if (stub) return stub;

  try {
    const { searchParams } = new URL(request.url);
    const theme = searchParams.get("theme") as GdeltTheme | null;

    if (theme === "cyber" || theme === "election") {
      const { data, cached } = await fetchGdeltThemeCached(theme);
      return NextResponse.json({
        theme,
        cached,
        fetchedAt: new Date().toISOString(),
        events: data,
        attribution: "GDELT Project",
      });
    }

    const sliceParam = searchParams.get("slices");
    const sliceCount = sliceParam ? Number.parseInt(sliceParam, 10) : undefined;

    const payload = await fetchLatestGdeltEvents(
      sliceCount && sliceCount > 0 ? { sliceCount } : undefined,
    );
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "GDELT 수신 실패",
        events: [],
      },
      { status: 500 },
    );
  }
}
