import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { success: false, message: "Thiếu toạ độ lat hoặc lng" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/reverse-geocode?lat=${encodeURIComponent(latStr)}&lng=${encodeURIComponent(lngStr)}`
    );

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(json, { status: res.status });
    }

    return NextResponse.json(
      {
        success: true,
        ...json.data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server proxy error" },
      { status: 500 }
    );
  }
}
