import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { uploadController } from "../controllers/upload.controller";
import { sendError } from "../utils/response";

const router = Router();

// Cấu hình multer lưu buffer trong RAM, giới hạn 10MB mỗi file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5, // Tối đa 5 file 1 lần
  },
  fileFilter: (_req, file, cb) => {
    // Chỉ chấp nhận các định dạng ảnh phổ biến
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/svg+xml",
      "image/heic",
      "image/heif",
    ];

    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file định dạng ảnh (JPEG, PNG, WEBP, GIF, SVG, HEIC)."));
    }
  },
});

// Middleware xử lý cả single file ('file') và multi files ('files')
const uploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "files", maxCount: 5 },
  ])(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return sendError(res, "VALIDATION_ERROR", "Dung lượng file vượt quá giới hạn cho phép (Tối đa 10MB).", 400);
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return sendError(res, "VALIDATION_ERROR", "Số lượng file vượt quá giới hạn (Tối đa 5 file cùng lúc).", 400);
        }
        return sendError(res, "VALIDATION_ERROR", `Lỗi tải file: ${err.message}`, 400);
      }
      return sendError(res, "VALIDATION_ERROR", err.message || "File không hợp lệ.", 400);
    }

    // Đưa req.file hoặc req.files về dạng controller dễ đọc
    const filesDict = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    if (filesDict) {
      if (filesDict.file && filesDict.file[0]) {
        req.file = filesDict.file[0];
      }
      if (filesDict.files && filesDict.files.length > 0) {
        req.files = filesDict.files;
      }
    }

    next();
  });
};

/**
 * POST /api/upload
 * Tải ảnh đơn hoặc nhiều ảnh lên Supabase Storage
 */
router.post("/", uploadMiddleware, uploadController.handleUpload);

export default router;
