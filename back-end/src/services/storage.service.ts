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

export async function signUploads(folder: string, extensions: string[]) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Máy chủ chưa cấu hình Supabase Storage.");

  const bucket = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from("huedimo-media");
  return Promise.all(extensions.map(async (extension) => {
    const path = `${folder}/${randomUUID()}.${extension}`;
    const { data, error } = await bucket.createSignedUploadUrl(path);
    if (error) throw new Error("Không thể tạo URL tải ảnh.");
    return { uploadUrl: data.signedUrl, publicUrl: bucket.getPublicUrl(path).data.publicUrl };
  }));
}
