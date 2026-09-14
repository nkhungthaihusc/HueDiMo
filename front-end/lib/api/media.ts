const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";

export interface UploadResponse {
  url: string;
  urls: string[];
  filename?: string;
  size?: number;
  mimetype?: string;
}

/**
 * Upload 1 ảnh lên Supabase Storage bucket 'huedimo-media' qua Backend API
 * @param file File ảnh được chọn từ input[type=file]
 * @param folder Thư mục lưu trữ: 'places', 'reviews', 'avatars'
 */
export async function uploadMedia(file: File, folder: "places" | "reviews" | "avatars" | "general" = "reviews"): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BACKEND_URL}/api/upload?folder=${folder}`, {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || "Tải ảnh lên máy chủ thất bại.");
  }

  return json.data?.url || "";
}

/**
 * Upload nhiều ảnh lên Supabase Storage bucket 'huedimo-media'
 * @param files Danh sách File ảnh (tối đa 5)
 * @param folder Thư mục lưu trữ
 */
export async function uploadMultipleMedia(
  files: File[],
  folder: "places" | "reviews" | "avatars" | "general" = "reviews"
): Promise<string[]> {
  if (!files || files.length === 0) return [];

  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));

  const res = await fetch(`${BACKEND_URL}/api/upload?folder=${folder}`, {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || "Tải danh sách ảnh thất bại.");
  }

  return json.data?.urls || [];
}
