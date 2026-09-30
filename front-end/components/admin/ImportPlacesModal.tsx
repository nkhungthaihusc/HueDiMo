"use client";

import { useState, useRef } from "react";
import { AdminAPI } from "@/lib/api/admin";
import { toast } from "@/components/ui/Toast";

interface ImportPlacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PreviewItem {
  rowNum: number;
  id?: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address?: string;
  price?: number;
  is_local?: boolean;
  opening_hours?: string;
  estimated_duration_minutes?: number;
  best_time_to_visit?: string;
  rating?: number;
  description?: string;
  image_url?: string;
  notes?: string;
  status?: string;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
  duplicateReason: string;
  matchedPlaceId?: string;
}

/**
 * Phân tích cú pháp RFC 4180 CSV an toàn, hỗ trợ:
 * - Dấu ngoặc kép ("...") bao quanh giá trị có chứa dấu phẩy hoặc xuống dòng
 * - Ký tự thoát ngoặc kép ("")
 * - Dòng trống và khoảng trắng
 */
function parseCSV(text: string): Record<string, string>[] {
  const cleanText = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Bỏ qua dấu " thoát
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = "";
    } else {
      currentField += char;
    }
  }

  // Thêm trường và dòng cuối cùng nếu còn
  currentRow.push(currentField.trim());
  if (currentRow.some((f) => f !== "")) {
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const data: Record<string, string>[] = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    const obj: Record<string, string> = {};
    headers.forEach((h, index) => {
      obj[h] = values[index] !== undefined ? values[index] : "";
    });
    if (Object.values(obj).some((v) => v !== "")) {
      data.push(obj);
    }
  }

  return data;
}

export default function ImportPlacesModal({ isOpen, onClose, onSuccess }: ImportPlacesModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [previewStats, setPreviewStats] = useState<{
    total: number;
    validCount: number;
    duplicateCount: number;
    errorCount: number;
  } | null>(null);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "overwrite">("skip");
  const [filterTab, setFilterTab] = useState<"all" | "duplicate" | "error" | "valid">("all");

  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Tải file mẫu CSV
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      "name",
      "category",
      "lat",
      "lng",
      "address",
      "price",
      "is_local",
      "opening_hours",
      "estimated_duration_minutes",
      "best_time_to_visit",
      "rating",
      "description",
      "image_url",
      "notes",
    ];

    const sampleRow = [
      "Chùa Thiên Mụ Mẫu",
      "ancient",
      "16.4528",
      "107.5451",
      "Đồi Hà Khê, Kim Long, TP Huế",
      "0",
      "true",
      "08:00 - 18:00",
      "45",
      "Hoàng hôn",
      "4.8",
      "Ngôi chùa cổ kính hơn 400 năm tuổi soi bóng bên dòng sông Hương thơ mộng.",
      "https://images.unsplash.com/photo-1599818816480-b301c6f4ef64",
      "Nên ăn mặc trang nghiêm khi vào viếng.",
    ];

    const escapeCSV = (str: string) => {
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = "\uFEFF" + [
      templateHeaders.join(","),
      sampleRow.map(escapeCSV).join(","),
    ].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mau_danh_sach_dia_diem_huedimo.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Vui lòng chọn tệp định dạng .csv");
      return;
    }

    setFile(selectedFile);
    setImportResult(null);
    setIsLoadingPreview(true);

    try {
      const text = await selectedFile.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast.error("Tệp CSV không có dữ liệu hợp lệ.");
        setIsLoadingPreview(false);
        return;
      }

      setParsedData(rows);

      // Gửi lên Backend để kiểm tra trùng lặp và xác thực
      const previewRes = await AdminAPI.previewImportCSV(rows);
      setPreviewStats({
        total: previewRes.total,
        validCount: previewRes.validCount,
        duplicateCount: previewRes.duplicateCount,
        errorCount: previewRes.errorCount,
      });
      setPreviewItems(previewRes.items);
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi đọc và kiểm tra tệp CSV.");
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewItems || previewItems.length === 0) return;

    // Lọc ra các dòng không bị lỗi cú pháp
    const validRows = previewItems.filter((item) => item.isValid);
    if (validRows.length === 0) {
      toast.error("Không có dòng nào hợp lệ để nhập vào hệ thống.");
      return;
    }

    setIsImporting(true);
    try {
      const res = await AdminAPI.importPlacesCSV(validRows, duplicateStrategy);
      setImportResult(res);
      toast.success(res.message || "Nhập danh sách địa điểm hoàn tất!");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Quá trình nhập dữ liệu gặp lỗi.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setPreviewStats(null);
    setPreviewItems([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Lọc danh sách xem trước theo tab
  const filteredPreview = previewItems.filter((item) => {
    if (filterTab === "duplicate") return item.isDuplicate && item.isValid;
    if (filterTab === "error") return !item.isValid;
    if (filterTab === "valid") return item.isValid && !item.isDuplicate;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Thêm danh sách địa điểm bằng CSV</h2>
              <p className="text-xs text-slate-400">
                Tự động kiểm tra trùng lặp tên, ID, tọa độ trước khi lưu vào cơ sở dữ liệu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
              title="Tải tệp CSV mẫu chuẩn"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Tải file CSV mẫu</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Vùng chọn file nếu chưa chọn hoặc muốn chọn lại */}
          {!file && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-10 cursor-pointer bg-slate-950/40 hover:bg-purple-950/10 transition group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="h-14 w-14 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition duration-300 border border-purple-500/20 mb-3">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white group-hover:text-purple-300">
                Nhấp hoặc kéo thả tệp CSV vào đây
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Chỉ hỗ trợ file *.csv có bảng mã UTF-8. Nhấn &quot;Tải file CSV mẫu&quot; ở trên nếu chưa có file chuẩn.
              </p>
            </div>
          )}

          {/* Khi đang kiểm tra dữ liệu */}
          {isLoadingPreview && (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              <p className="text-sm text-slate-300">Đang kiểm tra trùng lặp và xác thực từng dòng trong tệp...</p>
            </div>
          )}

          {/* Khi đã có kết quả Preview */}
          {file && !isLoadingPreview && previewStats && (
            <div className="space-y-4">
              {/* File Info Bar & Stats */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs border border-emerald-500/20">
                    CSV
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      Tổng cộng: <strong className="text-white">{previewStats.total}</strong> dòng địa điểm
                    </p>
                  </div>
                </div>

                {/* Badges thống kê */}
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    {previewStats.validCount} Hợp lệ mới
                  </span>
                  <span className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-400">
                    {previewStats.duplicateCount} Trùng khớp
                  </span>
                  {previewStats.errorCount > 0 && (
                    <span className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-400">
                      {previewStats.errorCount} Lỗi cú pháp
                    </span>
                  )}
                  <button
                    onClick={handleReset}
                    className="ml-2 text-xs text-slate-400 hover:text-white underline"
                  >
                    Chọn file khác
                  </button>
                </div>
              </div>

              {/* Tùy chọn xử lý khi có trùng lặp */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Cơ chế xử lý khi phát hiện dữ liệu trùng khớp:
                </p>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="dup_strategy"
                      value="skip"
                      checked={duplicateStrategy === "skip"}
                      onChange={() => setDuplicateStrategy("skip")}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span>
                      <strong className="text-white">Bỏ qua (Skip):</strong> Chỉ thêm những địa điểm mới, giữ nguyên địa điểm đã có trong hệ thống (Khuyên dùng)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="dup_strategy"
                      value="overwrite"
                      checked={duplicateStrategy === "overwrite"}
                      onChange={() => setDuplicateStrategy("overwrite")}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span>
                      <strong className="text-white">Ghi đè/Cập nhật (Overwrite):</strong> Cập nhật thông tin mới nhất từ CSV lên địa điểm trùng khớp
                    </span>
                  </label>
                </div>
              </div>

              {/* Tabs lọc dòng xem trước */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    filterTab === "all" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Tất cả ({previewItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("duplicate")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    filterTab === "duplicate" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Dòng trùng khớp ({previewStats.duplicateCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("valid")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    filterTab === "valid" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Hợp lệ mới ({previewStats.validCount})
                </button>
                {previewStats.errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("error")}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      filterTab === "error" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Lỗi ({previewStats.errorCount})
                  </button>
                )}
              </div>

              {/* Bảng Xem trước dữ liệu */}
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Dòng</th>
                      <th className="py-2.5 px-3">Trạng thái kiểm tra</th>
                      <th className="py-2.5 px-3">Tên địa điểm</th>
                      <th className="py-2.5 px-3">Danh mục</th>
                      <th className="py-2.5 px-3">Tọa độ (Lat, Lng)</th>
                      <th className="py-2.5 px-3">Địa chỉ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredPreview.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="py-2 px-3 text-slate-500 font-mono">#{item.rowNum}</td>
                        <td className="py-2 px-3">
                          {!item.isValid ? (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-400 border border-rose-500/20">
                              Lỗi: {item.errors.join("; ")}
                            </span>
                          ) : item.isDuplicate ? (
                            <span
                              className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20"
                              title={item.duplicateReason}
                            >
                              ⚠ {item.duplicateReason}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                              ✓ Mới hợp lệ
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-white max-w-[200px] truncate" title={item.name}>
                          {item.name || "—"}
                        </td>
                        <td className="py-2 px-3">
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                          {item.lat}, {item.lng}
                        </td>
                        <td className="py-2 px-3 text-slate-400 max-w-[220px] truncate" title={item.address}>
                          {item.address || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kết quả sau khi Import */}
          {importResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Nhập dữ liệu thành công!</span>
              </div>
              <p className="text-xs text-slate-300">{importResult.message}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            Đóng
          </button>

          {file && !importResult && (
            <button
              type="button"
              disabled={isImporting || isLoadingPreview || previewStats?.validCount === 0 && duplicateStrategy === "skip" && previewStats?.duplicateCount === 0}
              onClick={handleExecuteImport}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-900/40 hover:bg-purple-500 transition disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Đang nhập dữ liệu...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Xác nhận nhập vào hệ thống</span>
                </>
              )}
            </button>
          )}

          {importResult && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-500 transition"
            >
              Hoàn tất
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
