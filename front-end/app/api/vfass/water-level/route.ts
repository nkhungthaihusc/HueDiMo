import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/water-levels`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(json, { status: res.status });
    }

    return NextResponse.json(
      {
        success: true,
        count: json.data?.count,
        timestamp: json.data?.timestamp,
        summary: json.data?.summary,
        stations: json.data?.stations,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server proxy error" },
      { status: 500 }
    );
  }
}
