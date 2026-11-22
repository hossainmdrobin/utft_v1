import { NextRequest, NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/authenticaiton/verifications";

const FALLBACK_MODELS = [
  "gh/gpt-5.4-nano",
  "agy/gemini-3.8-flash-tiered",
];

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentMember(request);
    if (!user || user instanceof NextResponse || !("_id" in user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawBase = process.env.OMNIROUTE_BASE_URL?.trim();
    const apiKey = process.env.OMNIROUTE_API_KEY?.trim();

    if (!rawBase || !apiKey) {
      return NextResponse.json({ data: FALLBACK_MODELS });
    }

    const base = rawBase.replace(/\/+$/, "");
    const primaryUrl = base.endsWith("/v1") ? `${base}/models` : `${base}/v1/models`;

    try {
      let res = await fetch(primaryUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 },
      });

      if (!res.ok && !base.endsWith("/v1")) {
        const altUrl = `${base}/models`;
        const altRes = await fetch(altUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          next: { revalidate: 300 },
        }).catch(() => null);

        if (altRes && altRes.ok) {
          res = altRes;
        }
      }

      if (res.ok) {
        const json = await res.json();
        let models: string[] = [];

        if (Array.isArray(json?.data)) {
          models = json.data
            .map((item: unknown) => (typeof item === "string" ? item : (item as { id?: string })?.id))
            .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
        } else if (Array.isArray(json)) {
          models = json
            .map((item: unknown) => (typeof item === "string" ? item : (item as { id?: string })?.id))
            .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
        }

        if (models.length > 0) {
          return NextResponse.json({ data: models });
        }
      }
    } catch (fetchError) {
      console.warn("Failed to fetch models from provider, using fallbacks:", fetchError);
    }

    return NextResponse.json({ data: FALLBACK_MODELS });
  } catch (error) {
    console.error("Error in /api/chat/models:", error);
    return NextResponse.json({ data: FALLBACK_MODELS });
  }
}
