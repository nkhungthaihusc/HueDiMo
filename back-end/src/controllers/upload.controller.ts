import type { Request, Response, NextFunction } from "express";
import { imageExtensions, mediaFolders, signUploads } from "../services/storage.service";
import { sendSuccess, sendError } from "../utils/response";

export async function presignUploads(req: Request, res: Response, next: NextFunction): Promise<void> {
  const { folder, files } = req.body ?? {};
  if (!mediaFolders.includes(folder) || !Array.isArray(files) || files.length < 1 || files.length > 5) {
    sendError(res, "VALIDATION_ERROR", "Chọn thư mục hợp lệ và từ 1 đến 5 ảnh.", 400);
    return;
  }

  const extensions: string[] = [];
  for (const file of files) {
    const extension = imageExtensions.get(file?.contentType);
    const size = file?.size;
    if (!extension || !Number.isSafeInteger(size) || size < 1 || size > 10 * 1024 * 1024) {
      sendError(res, "VALIDATION_ERROR", "Định dạng ảnh không hợp lệ hoặc dung lượng vượt quá 10 MB.", 400);
      return;
    }
    extensions.push(extension);
  }

  try {
    res.set("Cache-Control", "no-store");
    sendSuccess(res, await signUploads(folder, extensions));
  } catch (error) {
    next(error);
  }
}
