import { Request, Response, NextFunction } from "express";
import { StorageService } from "../services/storage.service";
import { sendSuccess, sendError } from "../utils/response";

export const uploadController = {
  /**
   * POST /api/upload
   * Nhận 1 file ('file') hoặc mảng file ('files') tải lên Supabase Storage
   */
  async handleUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const folder = typeof req.query.folder === "string" ? req.query.folder.trim() : (req.body.folder || "general");

      // Trường hợp 1: Nhận single file từ multer (field name: 'file')
      if (req.file) {
        const publicUrl = await StorageService.uploadFile(req.file, folder);
        sendSuccess(res, {
          url: publicUrl,
          urls: [publicUrl],
          filename: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        });
        return;
      }

      // Trường hợp 2: Nhận multiple files từ multer (field name: 'files')
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        const files = req.files as Express.Multer.File[];
        const urls = await StorageService.uploadMultipleFiles(files, folder);
        sendSuccess(res, {
          url: urls[0] || "",
          urls,
          total: urls.length,
        });
        return;
      }

      // Không tìm thấy file nào được gửi lên
      sendError(res, "VALIDATION_ERROR", "Không tìm thấy file hình ảnh nào được gửi lên trong request. Vui lòng sử dụng field 'file' hoặc 'files'.", 400);
    } catch (error: any) {
      next(error);
    }
  },
};
