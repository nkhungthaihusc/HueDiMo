export type TransportMode = "motorbike" | "car" | "bicycle" | "walking";

export interface TransportOption {
  id: TransportMode;
  label: string;
  emoji: string;
  speedKmh: number;
  description: string;
}

export const TRANSPORT_OPTIONS: TransportOption[] = [
  {
    id: "motorbike",
    label: "Xe máy",
    emoji: "🛵",
    speedKmh: 30,
    description: "Linh hoạt, luồn lách ngõ phố (~30 km/h)",
  },
  {
    id: "car",
    label: "Ô tô / Taxi",
    emoji: "🚗",
    speedKmh: 35,
    description: "Mát mẻ, tiện cho gia đình/nhóm (~35 km/h)",
  },
  {
    id: "bicycle",
    label: "Xe đạp",
    emoji: "🚲",
    speedKmh: 14,
    description: "Thong thả ngắm cảnh sông Hương (~14 km/h)",
  },
  {
    id: "walking",
    label: "Đi bộ",
    emoji: "🚶",
    speedKmh: 4.5,
    description: "Dạo quanh Kinh thành, phố đi bộ (~4.5 km/h)",
  },
];

export function getTransportOption(mode?: TransportMode): TransportOption {
  return TRANSPORT_OPTIONS.find((t) => t.id === mode) ?? TRANSPORT_OPTIONS[0];
}

export interface PlaceInput {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  price?: number;
  rating?: number;
  description?: string;
}

export interface ItineraryRequestInput {
  startDate: string;
  endDate: string;
  preferences: string[];
  budget: number;
  currentLocation: string;
  startPlaceId: string | null;
  endPlaceId: string | null;
  transportMode?: TransportMode;
  groupSize?: number;
  notes?: string;
  places: PlaceInput[];
}

export interface ItineraryPlace {
  placeId: string;
  reason: string;
  estimatedCost: number;
  customName?: string;
  note?: string;
}

export interface ItineraryDay {
  date: string;
  title: string;
  places: ItineraryPlace[];
}

export interface ItineraryResult {
  id?: string;
  summary: string;
  totalEstimatedCost: number;
  budget?: number;
  transportMode?: TransportMode;
  groupSize?: number;
  notes?: string;
  days: ItineraryDay[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseItinerary(raw: unknown): ItineraryResult | null {
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  const summary = typeof obj.summary === "string" ? obj.summary : "";
  const daysRaw = Array.isArray(obj.days) ? obj.days : [];

  const days: ItineraryDay[] = [];
  const seen = new Set<string>();
  for (const dayRaw of daysRaw) {
    if (typeof dayRaw !== "object" || dayRaw === null) continue;
    const day = dayRaw as Record<string, unknown>;
    const date = typeof day.date === "string" && DATE_RE.test(day.date) ? day.date : "";
    const title = typeof day.title === "string" ? day.title : "";
    const placesRaw = Array.isArray(day.places) ? day.places : [];
    const places: ItineraryPlace[] = [];
    for (const placeRaw of placesRaw) {
      if (typeof placeRaw !== "object" || placeRaw === null) continue;
      const p = placeRaw as Record<string, unknown>;
      if (typeof p.placeId !== "string") continue;
      if (seen.has(p.placeId)) continue;
      seen.add(p.placeId);
      places.push({
        placeId: p.placeId,
        reason: typeof p.reason === "string" ? p.reason : "",
        estimatedCost:
          typeof p.estimatedCost === "number" && Number.isFinite(p.estimatedCost)
            ? Math.max(0, p.estimatedCost)
            : 0,
        customName: typeof p.customName === "string" ? p.customName : undefined,
        note: typeof p.note === "string" ? p.note : undefined,
      });
    }
    if (!date || places.length === 0) continue;
    days.push({ date, title, places });
  }

  if (days.length === 0) return null;

  const totalEstimatedCost = days.reduce(
    (acc, d) => acc + d.places.reduce((s, p) => s + p.estimatedCost, 0),
    0
  );

  const rawBudget = obj.budget;
  const budget =
    typeof rawBudget === "number" && Number.isFinite(rawBudget) && rawBudget > 0
      ? rawBudget
      : undefined;

  const rawTransport = obj.transportMode;
  const transportMode: TransportMode | undefined =
    rawTransport === "motorbike" ||
    rawTransport === "car" ||
    rawTransport === "bicycle" ||
    rawTransport === "walking"
      ? rawTransport
      : undefined;

  return { summary, totalEstimatedCost, budget, transportMode, days };
}

export function capToBudget(itinerary: ItineraryResult, budget: number): ItineraryResult | null {
  let total = itinerary.totalEstimatedCost;
  const days = itinerary.days.map((d) => ({ ...d, places: [...d.places] }));
  while (total > budget) {
    let bestDay = -1;
    let bestIdx = -1;
    let bestCost = 0;
    for (let d = 0; d < days.length; d++) {
      days[d].places.forEach((p, i) => {
        if (p.estimatedCost > bestCost) {
          bestCost = p.estimatedCost;
          bestDay = d;
          bestIdx = i;
        }
      });
    }
    if (bestIdx === -1) break;
    days[bestDay].places.splice(bestIdx, 1);
    total -= bestCost;
  }
  const cleaned = days.filter((d) => d.places.length > 0);
  if (cleaned.length === 0) return null;
  return { ...itinerary, days: cleaned, totalEstimatedCost: Math.max(0, total) };
}

const ZEN_URL = "https://opencode.ai/zen/v1/chat/completions";
const ZEN_MODEL = "big-pickle";
const MAX_MESSAGES = 4096;
const ZEN_USER_AGENT = "opencode/1.18.19";
const ZEN_SESSION_ID = () => `ses_${crypto.randomUUID()}`;
const ZEN_REQUEST_ID = () => `req_${crypto.randomUUID()}`;

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function buildMessages(req: ItineraryRequestInput, retryHint?: string): { role: "system" | "user"; content: string }[] {
  const SYSTEM_PROMPT = `Bạn là chuyên gia du lịch tại Huế, Việt Nam. Người dùng nhập thông tin chuyến đi; nhiệm vụ của bạn là xây dựng lịch trình tham quan hợp lý CHỈ dựa trên các địa điểm trong CATALOG được cung cấp.

Quy tắc bắt buộc:
- CHỈ được dùng placeId có trong CATALOG. Tuyệt đối không tự bịa ra địa điểm.
- MỘT địa điểm chỉ được xuất hiện ĐÚNG MỘT LẦN trong toàn bộ lịch trình (không lặp lại kể cả ở các ngày khác nhau).
- Mỗi ngày chọn 3–5 địa điểm, phân bố đều theo số ngày.
- TỐI ƯU THEO PHƯƠNG TIỆN DI CHUYỂN:
  + Nếu phương tiện là "Đi bộ" (walking) hoặc "Xe đạp" (bicycle): các điểm trong cùng 1 ngày PHẢI nằm gần nhau (nội thành bờ bắc/bờ nam sông Hương, cụm Đại Nội, phố cổ Gia Hội, phố đi bộ...), KHÔNG được chọn các điểm ngoại ô xa như Lăng Gia Long, Minh Mạng, Khải Định, Rú Chá, Biển Thuận An, v.v.
  + Nếu phương tiện là "Xe máy" (motorbike) hoặc "Ô tô / Taxi" (car): có thể phân bổ các lăng tẩm hay cảnh đẹp ngoại ô, nhưng trong cùng 1 ngày phải gom theo cùng một hướng/tuyến đường để tiết kiệm thời gian di chuyển, tránh đi ngược xuôi.
- Sắp xếp thứ tự các điểm trong ngày theo trình tự di chuyển hợp lý (sáng, trưa, chiều, tối).
- Ưu tiên thể loại trùng sở thích nhưng vẫn cân bằng và hợp ngân sách.
- estimatedCost là chi phí ước tính (VND) cho 1 người khi ghé thăm địa điểm đó 1 lần. Nếu địa điểm có GIÁ (price) trong catalog thì estimatedCost PHẢI bằng đúng price đó (price=0 nghĩa là miễn phí). Nếu không có price thì ước lượng giá vừa phải theo mặt bằng chung.
- Tổng của mọi estimatedCost trong toàn bộ lịch trình KHÔNG ĐƯỢC VƯỢT QUÁ ngân sách người dùng đưa ra. Nếu vượt, hãy chọn địa điểm rẻ hơn hoặc giảm số lượng.
- totalEstimatedCost là tổng estimatedCost của toàn bộ lịch trình (VND).
- LƯU Ý VỀ SỐ NGƯỜI VÀ GHI CHÚ:
  + Cân nhắc số người tham gia để lựa chọn các điểm dừng, quán xá có không gian và trải nghiệm phù hợp.
  + TUÂN THỦ chặt chẽ các yêu cầu trong mục "Ghi chú & Yêu cầu riêng" của du khách (ví dụ: người già, trẻ em, ăn chay, thích chụp ảnh, muốn thư thái nhẹ nhàng...).

Trả về DUY NHẤT một đối tượng JSON hợp lệ, không kèm markdown, đúng cấu trúc:
{
  "summary": "tổng quan ngắn về lịch trình",
  "totalEstimatedCost": 0,
  "days": [
    { "date": "YYYY-MM-DD", "title": "tiêu đề ngày", "places": [ { "placeId": "id trong catalog", "reason": "lý do chọn ngắn gọn", "estimatedCost": 0 } ] }
  ]
}`;

  const catalog = req.places
    .map((p) => {
      const price =
        typeof p.price === "number" && Number.isFinite(p.price) && p.price > 0
          ? `giá: ${p.price.toLocaleString("vi-VN")} VND`
          : "miễn phí / không có giá";
      return `- id: ${p.id} | ${p.name} | thể loại: ${p.category} | rating: ${typeof p.rating === "number" ? p.rating.toFixed(1) : "—"}/5 | ${price} | mô tả: ${truncate(p.description || "chưa có mô tả", 90)}`;
    })
    .join("\n");

  const prefs = req.preferences.length > 0 ? req.preferences.join(", ") : "không giới hạn";
  const transportOpt = getTransportOption(req.transportMode);

  const startPlace = req.startPlaceId ? req.places.find((p) => p.id === req.startPlaceId) : null;
  const endPlace = req.endPlaceId ? req.places.find((p) => p.id === req.endPlaceId) : null;
  const startEnd =
    startPlace && endPlace
      ? `Bắt đầu: ${startPlace.name}, kết thúc: ${endPlace.name}`
      : startPlace
      ? `Bắt đầu: ${startPlace.name}, kết thúc: theo tự nhiên`
      : endPlace
      ? `Bắt đầu: theo tự nhiên, kết thúc: ${endPlace.name}`
      : "không cố định — xuất phát tự nhiên từ nơi ở hiện tại";

  const userPrompt = `THÔNG TIN CHUYẾN ĐI:
- Ngày: ${req.startDate} → ${req.endDate}
- Số lượng người: ${req.groupSize ? `${req.groupSize} người` : "1 người"}
- Phương tiện di chuyển: ${transportOpt.emoji} ${transportOpt.label} (${transportOpt.description})
- Sở thích: ${prefs}
- Ngân sách cho cả chuyến đi: ${req.budget.toLocaleString("vi-VN")} VND
- Nơi ở hiện tại: ${req.currentLocation || "chưa có"}
- Điểm bắt đầu/kết thúc: ${startEnd}
- Ghi chú & Yêu cầu riêng của du khách: ${req.notes?.trim() ? req.notes.trim() : "Không có yêu cầu đặc biệt"}

CATALOG ĐỊA ĐIỂM (CHỈ được dùng các id trong danh sách này):
${catalog}

Hãy trả lời đúng định dạng JSON đã quy định.${retryHint ? `\n\nGhi chú chỉnh sửa từ lần trước: ${retryHint}` : ""}`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

async function callZen(apiKey: string, messages: { role: "system" | "user"; content: string }[]): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  try {
    const res = await fetch(ZEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "User-Agent": ZEN_USER_AGENT,
        "x-opencode-client": "cli",
        "x-opencode-session": ZEN_SESSION_ID(),
        "x-opencode-request": ZEN_REQUEST_ID(),
        "x-opencode-project": "huedimo",
      },
      body: JSON.stringify({
        model: ZEN_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: MAX_MESSAGES,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      return { ok: false, status: res.status };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
    };
    const msg = data.choices?.[0]?.message;
    const text = msg?.content?.trim() || msg?.reasoning_content?.trim() || "";
    return { ok: true, text };
  } catch {
    return { ok: false, status: 0 };
  }
}

function parseZenText(text: string): unknown {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

export class ItineraryService {
  public static async generate(req: ItineraryRequestInput): Promise<ItineraryResult> {
    const apiKey = process.env.OPENCODE_ZEN_API_KEY;
    if (!apiKey) {
      throw new Error("CONFIG_MISSING: OPENCODE_ZEN_API_KEY is not configured.");
    }

    for (const retry of [false, true]) {
      const hint = retry
        ? "Lần trước bạn trả về lộ trình không hợp lệ: có placeId ngoài catalog, địa điểm bị lặp, hoặc tổng chi phí vượt ngân sách hoặc sai cấu trúc JSON. Hãy tự kiểm tra lại: mỗi placeId chỉ xuất hiện 1 lần, mọi estimatedCost lấy đúng giá (price) trong catalog nếu có, tổng ≤ ngân sách, và chỉ trả đúng JSON theo cấu trúc quy định."
        : undefined;
      const result = await callZen(apiKey, buildMessages(req, hint));
      if (!result.ok) {
        throw new Error(`UPSTREAM_AI_ERROR: Status ${result.status || "timeout"}`);
      }
      const itinerary = parseItinerary(parseZenText(result.text));
      const capped = itinerary ? capToBudget(itinerary, req.budget) : null;
      if (capped) {
        return {
          ...capped,
          budget: req.budget,
          transportMode: req.transportMode ?? "motorbike",
          groupSize: req.groupSize,
          notes: req.notes,
        };
      }
    }

    throw new Error("INVALID_AI_OUTPUT: Không thể tạo lịch trình hợp lệ sau 2 lần thử.");
  }
}
