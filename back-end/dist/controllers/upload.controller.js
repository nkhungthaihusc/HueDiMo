"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadController = void 0;
const storage_service_1 = require("../services/storage.service");
const response_1 = require("../utils/response");
exports.uploadController = {
    /**
     * POST /api/upload
     * Nhận 1 file ('file') hoặc mảng file ('files') tải lên Supabase Storage
     */
    async handleUpload(req, res, next) {
        try {
            const folder = typeof req.query.folder === "string" ? req.query.folder.trim() : (req.body.folder || "general");
            // Trường hợp 1: Nhận single file từ multer (field name: 'file')
            if (req.file) {
                const publicUrl = await storage_service_1.StorageService.uploadFile(req.file, folder);
                (0, response_1.sendSuccess)(res, {
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
                const files = req.files;
                const urls = await storage_service_1.StorageService.uploadMultipleFiles(files, folder);
                (0, response_1.sendSuccess)(res, {
                    url: urls[0] || "",
                    urls,
                    total: urls.length,
                });
                return;
            }
            // Không tìm thấy file nào được gửi lên
            (0, response_1.sendError)(res, "VALIDATION_ERROR", "Không tìm thấy file hình ảnh nào được gửi lên trong request. Vui lòng sử dụng field 'file' hoặc 'files'.", 400);
        }
        catch (error) {
            next(error);
        }
    },
};
