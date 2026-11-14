import { authFetch, readApiResponse } from "./client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3002";
type MediaFolder = "places" | "reviews" | "avatars" | "general";

interface SignedUpload {
  uploadUrl: string;
  publicUrl: string;
}

export async function uploadMedia(file: File, folder: MediaFolder = "reviews"): Promise<string> {
  const [url] = await uploadMultipleMedia([file], folder);
  return url;
}

export async function uploadMultipleMedia(files: File[], folder: MediaFolder = "reviews"): Promise<string[]> {
  if (files.length === 0) return [];

  const response = await authFetch(`${BACKEND_URL}/api/upload/presign`, {
    method: "POST",
    body: JSON.stringify({
      folder,
      files: files.map(({ type, size }) => ({ contentType: type, size })),
    }),
  });
  const uploads = await readApiResponse<SignedUpload[]>(response);
  if (uploads.length !== files.length) throw new Error("Máy chủ trả về thiếu URL tải ảnh.");

  return Promise.all(uploads.map(async ({ uploadUrl, publicUrl }, index) => {
    const file = files[index];
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("Tải ảnh lên Supabase thất bại.");
    return publicUrl;
  }));
}
