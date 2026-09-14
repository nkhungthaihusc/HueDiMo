import type { ItineraryRequest } from "@/lib/itinerary/types";
import { getTransportOption } from "@/lib/itinerary/types";
import { getCategory } from "@/lib/data/categories";

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

function placeName(req: ItineraryRequest, id: string): string {
  return req.places.find((p) => p.id === id)?.name ?? id;
}

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

Trả về DUY NHẤT một đối tượng JSON hợp lệ, không kèm markdown, đúng cấu trúc:
{
  "summary": "tổng quan ngắn về lịch trình",
  "totalEstimatedCost": 0,
  "days": [
    { "date": "YYYY-MM-DD", "title": "tiêu đề ngày", "places": [ { "placeId": "id trong catalog", "reason": "lý do chọn ngắn gọn", "estimatedCost": 0 } ] }
  ]
}`;

export type ItineraryMessage = {
  role: "system" | "user";
  content: string;
};

export function buildMessages(req: ItineraryRequest, retryHint?: string): ItineraryMessage[] {
  const catalog = req.places
    .map((p) => {
      const price =
        typeof p.price === "number" && Number.isFinite(p.price) && p.price > 0
          ? `giá: ${p.price.toLocaleString("vi-VN")} VND`
          : "miễn phí / không có giá";
      return `- id: ${p.id} | ${p.name} | thể loại: ${getCategory(p.category).label} | rating: ${typeof p.rating === "number" ? p.rating.toFixed(1) : "—"}/5 | ${price} | mô tả: ${truncate(p.description || "chưa có mô tả", 90)}`;
    })
    .join("\n");

  const prefs =
    req.preferences.length > 0
      ? req.preferences.map((id) => getCategory(id).label).join(", ")
      : "không giới hạn";

  const transportOpt = getTransportOption(req.transportMode);

  const startName = req.startPlaceId ? placeName(req, req.startPlaceId) : null;
  const endName = req.endPlaceId ? placeName(req, req.endPlaceId) : null;
  const startEnd =
    startName && endName
      ? `Bắt đầu: ${startName}, kết thúc: ${endName}`
      : startName
        ? `Bắt đầu: ${startName}, kết thúc: theo tự nhiên`
        : endName
          ? `Bắt đầu: theo tự nhiên, kết thúc: ${endName}`
          : "không cố định — xuất phát tự nhiên từ nơi ở hiện tại";

  const userPrompt = `THÔNG TIN CHUYẾN ĐI:
- Ngày: ${req.startDate} → ${req.endDate}
- Phương tiện di chuyển: ${transportOpt.emoji} ${transportOpt.label} (${transportOpt.description})
- Sở thích: ${prefs}
- Ngân sách cho cả chuyến đi: ${req.budget.toLocaleString("vi-VN")} VND
- Nơi ở hiện tại: ${req.currentLocation || "chưa có"}
- Điểm bắt đầu/kết thúc: ${startEnd}

CATALOG ĐỊA ĐIỂM (CHỈ được dùng các id trong danh sách này):
${catalog}

Hãy trả lời đúng định dạng JSON đã quy định.${retryHint ? `\n\nGhi chú chỉnh sửa từ lần trước: ${retryHint}` : ""}`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}