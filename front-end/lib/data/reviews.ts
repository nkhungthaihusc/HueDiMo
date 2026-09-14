import type { Review } from "@/lib/types";

export const SEED_REVIEWS: Review[] = [
  {
    id: "rv-1",
    placeId: "dai-noi",
    authorName: "Minh Anh",
    rating: 5,
    comment: "Hoàng cung rất đẹp, nên đi hướng dẫn viên để hiểu thêm lịch sử.",
    createdAt: "2026-08-01T09:00:00.000Z",
  },
  {
    id: "rv-2",
    placeId: "dai-noi",
    authorName: "Tuấn Kiệt",
    rating: 4,
    comment: "Rộng, đi buổi sáng mát mẻ. Vé hợp lý.",
    createdAt: "2026-07-20T10:30:00.000Z",
  },
  {
    id: "rv-3",
    placeId: "chua-thien-mu",
    authorName: "Lan Phương",
    rating: 5,
    comment: "Bình yên, view sông Hương tuyệt đẹp lúc hoàng hôn.",
    createdAt: "2026-07-15T14:00:00.000Z",
  },
  {
    id: "rv-4",
    placeId: "bun-bo",
    authorName: "Hoàng Long",
    rating: 5,
    comment: "Bún bò chuẩn vị Huế, nước lèo đậm đà!",
    createdAt: "2026-07-10T12:15:00.000Z",
  },
  {
    id: "rv-5",
    placeId: "cau-truong-tien",
    authorName: "Ngọc Hân",
    rating: 4,
    comment: "Đi bộ qua cầu lúc đêm, đèn màu đẹp lắm.",
    createdAt: "2026-06-30T20:00:00.000Z",
  },
];