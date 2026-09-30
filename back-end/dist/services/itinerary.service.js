"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItineraryService = exports.TRANSPORT_OPTIONS = void 0;
exports.getTransportOption = getTransportOption;
exports.parseItinerary = parseItinerary;
exports.capToBudget = capToBudget;
exports.callGemini = callGemini;
exports.callAI = callAI;
exports.callZen = callZen;
const settings_model_1 = require("../models/settings.model");
exports.TRANSPORT_OPTIONS = [
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
function getTransportOption(mode) {
    return exports.TRANSPORT_OPTIONS.find((t) => t.id === mode) ?? exports.TRANSPORT_OPTIONS[0];
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function parseItinerary(raw) {
    if (typeof raw !== "object" || raw === null)
        return null;
    const obj = raw;
    const summary = typeof obj.summary === "string" ? obj.summary : "";
    const daysRaw = Array.isArray(obj.days) ? obj.days : [];
    const days = [];
    const seen = new Set();
    for (const dayRaw of daysRaw) {
        if (typeof dayRaw !== "object" || dayRaw === null)
            continue;
        const day = dayRaw;
        const date = typeof day.date === "string" && DATE_RE.test(day.date) ? day.date : "";
        const title = typeof day.title === "string" ? day.title : "";
        const placesRaw = Array.isArray(day.places) ? day.places : [];
        const places = [];
        for (const placeRaw of placesRaw) {
            if (typeof placeRaw !== "object" || placeRaw === null)
                continue;
            const p = placeRaw;
            if (typeof p.placeId !== "string")
                continue;
            if (seen.has(p.placeId))
                continue;
            seen.add(p.placeId);
            places.push({
                placeId: p.placeId,
                reason: typeof p.reason === "string" ? p.reason : "",
                estimatedCost: typeof p.estimatedCost === "number" && Number.isFinite(p.estimatedCost)
                    ? Math.max(0, p.estimatedCost)
                    : 0,
                customName: typeof p.customName === "string" ? p.customName : undefined,
                note: typeof p.note === "string" ? p.note : undefined,
            });
        }
        if (!date || places.length === 0)
            continue;
        days.push({ date, title, places });
    }
    if (days.length === 0)
        return null;
    const totalEstimatedCost = days.reduce((acc, d) => acc + d.places.reduce((s, p) => s + p.estimatedCost, 0), 0);
    const rawBudget = obj.budget;
    const budget = typeof rawBudget === "number" && Number.isFinite(rawBudget) && rawBudget > 0
        ? rawBudget
        : undefined;
    const rawTransport = obj.transportMode;
    const transportMode = rawTransport === "motorbike" ||
        rawTransport === "car" ||
        rawTransport === "bicycle" ||
        rawTransport === "walking"
        ? rawTransport
        : undefined;
    return { summary, totalEstimatedCost, budget, transportMode, days };
}
function capToBudget(itinerary, budget) {
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
        if (bestIdx === -1)
            break;
        days[bestDay].places.splice(bestIdx, 1);
        total -= bestCost;
    }
    const cleaned = days.filter((d) => d.places.length > 0);
    if (cleaned.length === 0)
        return null;
    return { ...itinerary, days: cleaned, totalEstimatedCost: Math.max(0, total) };
}
const ZEN_URL = "https://opencode.ai/zen/v1/chat/completions";
const ZEN_MODEL = "big-pickle";
const MAX_MESSAGES = 4096;
const ZEN_USER_AGENT = "opencode/1.18.19";
const ZEN_SESSION_ID = () => `ses_${crypto.randomUUID()}`;
const ZEN_REQUEST_ID = () => `req_${crypto.randomUUID()}`;
function truncate(text, max) {
    return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
function buildMessages(req, customInstruction, retryHint) {
    let systemPrompt = `Bạn là chuyên gia du lịch tại Huế, Việt Nam. Người dùng nhập thông tin chuyến đi; nhiệm vụ của bạn là xây dựng lịch trình tham quan hợp lý CHỈ dựa trên các địa điểm trong CATALOG được cung cấp.

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
    if (customInstruction && customInstruction.trim()) {
        systemPrompt += `\n\nChỉ thị bổ sung từ Ban Quản Trị hệ thống:\n${customInstruction.trim()}`;
    }
    const catalog = req.places
        .map((p) => {
        const price = typeof p.price === "number" && Number.isFinite(p.price) && p.price > 0
            ? `giá: ${p.price.toLocaleString("vi-VN")} VND`
            : "miễn phí / không có giá";
        return `- id: ${p.id} | ${p.name} | thể loại: ${p.category} | rating: ${typeof p.rating === "number" ? p.rating.toFixed(1) : "—"}/5 | ${price} | mô tả: ${truncate(p.description || "chưa có mô tả", 90)}`;
    })
        .join("\n");
    const prefs = req.preferences.length > 0 ? req.preferences.join(", ") : "không giới hạn";
    const transportOpt = getTransportOption(req.transportMode);
    const startPlace = req.startPlaceId ? req.places.find((p) => p.id === req.startPlaceId) : null;
    const endPlace = req.endPlaceId ? req.places.find((p) => p.id === req.endPlaceId) : null;
    const startEnd = startPlace && endPlace
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
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ];
}
async function callGemini(apiKey, messages, options) {
    // Lấy tên model sạch, ví dụ: "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"
    let modelToUse = options?.model || "gemini-1.5-flash";
    if (modelToUse.includes("/")) {
        modelToUse = modelToUse.split("/").pop() || modelToUse;
    }
    // Nếu model đang là big-pickle hoặc không thuộc gemini, mặc định về gemini-1.5-flash
    if (!modelToUse.toLowerCase().includes("gemini")) {
        modelToUse = "gemini-1.5-flash";
    }
    const tempToUse = typeof options?.temperature === "number" ? options.temperature : 0.4;
    const tokensToUse = typeof options?.maxTokens === "number" ? options.maxTokens : 4096;
    // Gom system instruction và user prompt theo format của Google Gemini
    const systemMsg = messages.find((m) => m.role === "system");
    const userMsgs = messages.filter((m) => m.role === "user");
    const contents = userMsgs.map((m) => ({
        role: "user",
        parts: [{ text: m.content }],
    }));
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...(systemMsg
                    ? {
                        systemInstruction: {
                            parts: [{ text: systemMsg.content }],
                        },
                    }
                    : {}),
                contents,
                generationConfig: {
                    temperature: tempToUse,
                    maxOutputTokens: tokensToUse,
                    responseMimeType: "application/json",
                },
            }),
            signal: AbortSignal.timeout(60_000),
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            return { ok: false, status: res.status, error: errText };
        }
        const data = (await res.json());
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        return { ok: true, text, modelUsed: modelToUse };
    }
    catch (err) {
        return { ok: false, status: 0, error: err?.message || "Lỗi kết nối tới Google Gemini API" };
    }
}
async function callAI(config, messages) {
    const geminiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
    const zenKey = process.env.OPENCODE_ZEN_API_KEY;
    // Nếu người dùng chọn provider Google hoặc có Gemini API Key
    if (config.provider === "google" || (geminiKey && !config.provider)) {
        if (!geminiKey) {
            return { ok: false, status: 400, error: "Chưa cấu hình Google Gemini API Key. Vui lòng nhập API Key trong trang Admin hoặc file .env." };
        }
        return callGemini(geminiKey, messages, {
            model: config.model || "gemini-1.5-flash",
            temperature: config.temperature,
            maxTokens: config.maxTokens,
        });
    }
    // Mặc định hoặc khi chọn Zen
    if (zenKey) {
        return callZen(zenKey, messages, {
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
        });
    }
    if (geminiKey) {
        return callGemini(geminiKey, messages, {
            model: config.model || "gemini-1.5-flash",
            temperature: config.temperature,
            maxTokens: config.maxTokens,
        });
    }
    return { ok: false, status: 500, error: "Chưa có API key nào được cấu hình (Cần GEMINI_API_KEY hoặc OPENCODE_ZEN_API_KEY)." };
}
async function callZen(apiKey, messages, options) {
    const modelToUse = options?.model || ZEN_MODEL;
    const tempToUse = typeof options?.temperature === "number" ? options.temperature : 0.4;
    const tokensToUse = typeof options?.maxTokens === "number" ? options.maxTokens : MAX_MESSAGES;
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
                model: modelToUse,
                messages,
                temperature: tempToUse,
                max_tokens: tokensToUse,
                response_format: { type: "json_object" },
            }),
            signal: AbortSignal.timeout(60_000),
        });
        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            return { ok: false, status: res.status, error: errText };
        }
        const data = (await res.json());
        const msg = data.choices?.[0]?.message;
        const text = msg?.content?.trim() || msg?.reasoning_content?.trim() || "";
        return { ok: true, text, modelUsed: modelToUse };
    }
    catch (err) {
        return { ok: false, status: 0, error: err?.message || "Connection timeout or network error" };
    }
}
function parseZenText(text) {
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start)
        return null;
    try {
        return JSON.parse(trimmed.slice(start, end + 1));
    }
    catch {
        return null;
    }
}
class ItineraryService {
    static async generate(req) {
        // Đọc cấu hình model và tham số từ Database (do Admin thiết lập)
        const aiConfig = await settings_model_1.SettingsModel.getAIConfig();
        for (const retry of [false, true]) {
            const hint = retry
                ? "Lần trước bạn trả về lộ trình không hợp lệ: có placeId ngoài catalog, địa điểm bị lặp, hoặc tổng chi phí vượt ngân sách hoặc sai cấu trúc JSON. Hãy tự kiểm tra lại: mỗi placeId chỉ xuất hiện 1 lần, mọi estimatedCost lấy đúng giá (price) trong catalog nếu có, tổng ≤ ngân sách, và chỉ trả đúng JSON theo cấu trúc quy định."
                : undefined;
            const messages = buildMessages(req, aiConfig.customInstruction, hint);
            const result = await callAI({
                provider: aiConfig.provider,
                model: aiConfig.model,
                geminiApiKey: aiConfig.geminiApiKey,
                temperature: aiConfig.temperature,
                maxTokens: aiConfig.maxTokens,
            }, messages);
            if (!result.ok) {
                throw new Error(`UPSTREAM_AI_ERROR: Status ${result.status || "timeout"}${result.error ? ` - ${result.error}` : ""}`);
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
exports.ItineraryService = ItineraryService;
