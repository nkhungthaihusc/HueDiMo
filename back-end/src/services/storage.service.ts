import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

export const mediaFolders = ["places", "reviews", "avatars", "general"];
export const imageExtensions = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/svg+xml", "svg"],
  ["image/heic", "heic"],
  ["image/heif", "heif"],
]);

export class StorageUploadError extends Error {
  constructor(message: string, public readonly status: 502 | 503) {
    super(message);
  }
}

export async function signUploads(folder: string, extensions: string[]) {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    console.warn("Storage upload configuration incomplete", { hasUrl: Boolean(url), hasServerKey: Boolean(key) });
    throw new StorageUploadError("Máy chủ chưa cấu hình khóa Supabase Storage để tải ảnh.", 503);
  }

  const bucket = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from("huedimo-media");
  return Promise.all(extensions.map(async (extension) => {
    const path = `${folder}/${randomUUID()}.${extension}`;
    const { data, error } = await bucket.createSignedUploadUrl(path);
    if (error) {
      const status = "status" in error ? Number(error.status) : undefined;
      console.warn("Storage upload signing failed", { status });
      if (status === 401 || status === 403) {
        throw new StorageUploadError("Supabase Storage từ chối khóa máy chủ để tải ảnh.", 503);
      }
      throw new StorageUploadError("Không thể tạo URL tải ảnh trên Supabase Storage. Vui lòng thử lại.", 502);
    }
    return { uploadUrl: data.signedUrl, publicUrl: bucket.getPublicUrl(path).data.publicUrl };
  }));
}
