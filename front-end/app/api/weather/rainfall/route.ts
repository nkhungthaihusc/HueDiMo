import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/weather/rainfall`, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(json, { status: res.status });
    }

    // Tương thích ngược: unwrap data từ envelope
    return NextResponse.json(json.data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server proxy error" },
      { status: 500 }
    );
  }
}
