import { createClient, SupabaseClient } from "@supabase/supabase-js";
import path from "path";

const supabaseUrl = process.env.SUPABASE_URL || "https://vhyfauholmouikskxecp.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const BUCKET_NAME = "huedimo-media";

let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase credentials (SUPABASE_URL or SUPABASE_ANON_KEY) are missing in environment variables.");
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}

export const StorageService = {
  /**
   * Upload một file buffer lên Supabase Storage bucket 'huedimo-media'
   * @param file File từ Multer (MemoryStorage)
   * @param folder Thư mục con ('places', 'reviews', 'avatars'...)
   * @returns URL ảnh công khai (Public CDN URL)
   */
  async uploadFile(file: Express.Multer.File, folder: string = "general"): Promise<string> {
    const supabase = getSupabaseClient();

    // Làm sạch và tạo tên file độc nhất
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const cleanFileName = `${timestamp}-${randomSuffix}${ext}`;
    const filePath = `${folder.replace(/[^a-zA-Z0-9_-]/g, "")}/${cleanFileName}`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("❌ Lỗi upload file lên Supabase Storage:", error);
      throw new Error(`Upload ảnh thất bại: ${error.message}`);
    }

    // Lấy Public URL
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    return data.publicUrl;
  },

  /**
   * Upload nhiều files cùng lúc
   */
  async uploadMultipleFiles(files: Express.Multer.File[], folder: string = "general"): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  },
};
