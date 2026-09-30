"use client";

import { useEffect, useState } from "react";
import { AdminAPI } from "@/lib/api/admin";
import { toast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface LogItem {
  id: string;
  method: string;
  url: string;
  originalUrl: string;
  path: string;
  protocol: string;
  httpVersion: string;
  statusCode: number;
  statusMessage?: string;
  durationMs: number;
  ip: string;
  timestamp: string;
  requestHeaders: Record<string, any>;
  responseHeaders: Record<string, any>;
  queryParams: Record<string, any>;
  params: Record<string, any>;
  requestBody: any;
  responseBody: any;
  userAgent: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
}

type TabType = "general" | "reqHeaders" | "reqBody" | "resBody" | "resHeaders";

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [stats, setStats] = useState<{ totalRequestsLogged: number; errorCount: number; avgLatencyMs: number }>({
    totalRequestsLogged: 0,
    errorCount: 0,
    avgLatencyMs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const loadLogs = async () => {
    try {
      const res = await AdminAPI.getLogs({
        limit: 100,
        method: methodFilter || undefined,
        statusCode: statusFilter ? parseInt(statusFilter, 10) : undefined,
      });
      setLogs(res.items);
      setStats(res.stats);
      // Giữ log được chọn nếu vẫn còn trong danh sách
      if (selectedLog) {
        const found = res.items.find((l) => l.id === selectedLog.id);
        if (found) setSelectedLog(found);
      } else if (res.items.length > 0 && !selectedLog) {
        setSelectedLog(res.items[0]);
      }
    } catch (err: any) {
      if (err?.message !== "UNAUTHORIZED") {
        console.error("Không thể tải API logs:", err?.message || err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [methodFilter, statusFilter]);

  useEffect(() => {
    if (!isAutoRefresh) return;
    const interval = setInterval(() => {
      loadLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, methodFilter, statusFilter, selectedLog]);

  const handleClearLogs = () => {
    setClearDialogOpen(true);
  };

  const confirmClearLogs = async () => {
    try {
      setIsClearing(true);
      await AdminAPI.clearLogs();
      setLogs([]);
      setSelectedLog(null);
      setStats({ totalRequestsLogged: 0, errorCount: 0, avgLatencyMs: 0 });
      toast.success("Đã xóa toàn bộ nhật ký API thành công.");
      setClearDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Xóa log thất bại.");
    } finally {
      setIsClearing(false);
    }
  };

  const copyToClipboard = (data: any) => {
    const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const getMethodBadge = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-emerald-950/70 text-emerald-400 border-emerald-800/40";
      case "POST":
        return "bg-blue-950/70 text-blue-400 border-blue-800/40";
      case "PUT":
      case "PATCH":
        return "bg-amber-950/70 text-amber-400 border-amber-800/40";
      case "DELETE":
        return "bg-red-950/70 text-red-400 border-red-800/40";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const getStatusBadge = (code: number) => {
    if (code >= 200 && code < 300) {
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    }
    if (code >= 300 && code < 400) {
      return "text-blue-400 bg-blue-500/10 border-blue-500/30";
    }
    if (code >= 400 && code < 500) {
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    }
    return "text-red-400 bg-red-500/10 border-red-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <span>⚡ Giám sát Yêu cầu API (Network Inspector)</span>
            {isAutoRefresh && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live 3s
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-400">
            Bắt trọn vẹn Thông tin chung, Headers, Request Body, Response JSON mở rộng và Response Headers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
              isAutoRefresh
                ? "border-emerald-600/50 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40"
                : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            {isAutoRefresh ? "⏸ Tạm dừng Live" : "▶ Tiếp tục Live"}
          </button>
          <button
            onClick={loadLogs}
            className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition"
          >
            🔄 Làm mới
          </button>
          <button
            onClick={handleClearLogs}
            className="rounded-xl border border-red-900/30 bg-red-950/20 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-900/30 transition"
          >
            🗑 Xóa log
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs font-medium text-slate-400">Tổng Requests Ghi nhận</div>
          <div className="mt-1 text-2xl font-bold text-white">{stats.totalRequestsLogged}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs font-medium text-slate-400">Số Request Lỗi (4xx / 5xx)</div>
          <div className={`mt-1 text-2xl font-bold ${stats.errorCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {stats.errorCount}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-xs font-medium text-slate-400">Độ trễ Xử lý Trung bình</div>
          <div className="mt-1 text-2xl font-bold text-purple-400">{stats.avgLatencyMs} ms</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Tất cả Method (GET, POST, PUT, DELETE...)</option>
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Tất cả Status Code</option>
          <option value="200">200 OK</option>
          <option value="201">201 Created</option>
          <option value="401">401 Unauthorized</option>
          <option value="403">403 Forbidden</option>
          <option value="404">404 Not Found</option>
          <option value="422">422 Validation Error</option>
          <option value="500">500 Server Error</option>
        </select>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Side: Requests List (5 cols) */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm lg:col-span-5">
          <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Danh sách Requests gần nhất</span>
            <span className="text-[11px] text-slate-500 font-normal">{logs.length} bản ghi</span>
          </div>

          {isLoading && logs.length === 0 ? (
            <div className="flex h-72 items-center justify-center">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center text-slate-400">
              <span className="text-3xl">📭</span>
              <p className="mt-2 text-xs">Chưa có request nào gửi tới server.</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[640px] divide-y divide-slate-800/60">
              {logs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3 cursor-pointer transition flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? "bg-purple-950/50 border-l-4 border-purple-500"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden min-w-0">
                      <span
                        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${getStatusBadge(
                          log.statusCode
                        )}`}
                      >
                        {log.statusCode}
                      </span>
                      <span
                        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${getMethodBadge(
                          log.method
                        )}`}
                      >
                        {log.method}
                      </span>
                      <span className="truncate font-mono text-xs text-white">
                        {log.url}
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[11px] text-slate-400">{log.durationMs}ms</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString("vi-VN")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Detailed Inspector (7 cols) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-sm lg:col-span-7 flex flex-col min-h-[600px] max-h-[700px]">
          {selectedLog ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Log Header Summary */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-bold ${getStatusBadge(
                      selectedLog.statusCode
                    )}`}
                  >
                    {selectedLog.statusCode} {selectedLog.statusMessage || ""}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-xs font-bold ${getMethodBadge(
                      selectedLog.method
                    )}`}
                  >
                    {selectedLog.method}
                  </span>
                  <span className="font-mono text-xs text-white truncate max-w-sm">
                    {selectedLog.url}
                  </span>
                </div>

                <button
                  onClick={() => copyToClipboard(selectedLog)}
                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  {copySuccess ? "✓ Đã copy" : "📋 Copy Log"}
                </button>
              </div>

              {/* Inspector Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-800 pt-3 pb-2 shrink-0 overflow-x-auto">
                <button
                  onClick={() => setActiveTab("general")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "general"
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  📌 Thông tin chung
                </button>
                <button
                  onClick={() => setActiveTab("reqHeaders")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "reqHeaders"
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  📥 Request Headers
                </button>
                <button
                  onClick={() => setActiveTab("reqBody")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "reqBody"
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  📤 Request Body {selectedLog.requestBody && Object.keys(selectedLog.requestBody).length > 0 && "●"}
                </button>
                <button
                  onClick={() => setActiveTab("resBody")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "resBody"
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  ⚡ Response (JSON)
                </button>
                <button
                  onClick={() => setActiveTab("resHeaders")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    activeTab === "resHeaders"
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  📋 Response Headers
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="flex-1 overflow-y-auto mt-4 pr-1 text-xs">
                {/* 1. THÔNG TIN CHUNG (General Info) */}
                {activeTab === "general" && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Request URL
                        </div>
                        <div className="mt-1 font-mono text-purple-300 break-all">{selectedLog.url}</div>
                      </div>
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Request Method
                        </div>
                        <div className="mt-1 font-bold text-white">{selectedLog.method}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Status Code
                        </div>
                        <div className="mt-1 font-bold text-white">
                          {selectedLog.statusCode} ({selectedLog.statusMessage || "OK"})
                        </div>
                      </div>
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Độ trễ Server
                        </div>
                        <div className="mt-1 font-mono text-emerald-400 font-bold">{selectedLog.durationMs} ms</div>
                      </div>
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Giao thức HTTP
                        </div>
                        <div className="mt-1 font-mono text-slate-300">{selectedLog.protocol} / {selectedLog.httpVersion}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Địa chỉ IP Client
                        </div>
                        <div className="mt-1 font-mono text-slate-200">{selectedLog.ip}</div>
                      </div>
                      <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Thời điểm Gửi
                        </div>
                        <div className="mt-1 font-mono text-slate-300">
                          {new Date(selectedLog.timestamp).toLocaleString("vi-VN")}
                        </div>
                      </div>
                    </div>

                    {/* User Profile Context */}
                    <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Thông tin Người thực hiện (Authenticated User)
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="rounded-lg bg-purple-900/60 px-2 py-1 text-purple-300 font-medium">
                          Role: {selectedLog.userRole || "Ẩn danh (Guest)"}
                        </span>
                        {selectedLog.userEmail && (
                          <span className="font-mono text-white">Email: {selectedLog.userEmail}</span>
                        )}
                        {selectedLog.userId && (
                          <span className="font-mono text-slate-500 text-[11px]">ID: {selectedLog.userId}</span>
                        )}
                      </div>
                    </div>

                    {/* User Agent */}
                    <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        User Agent Client
                      </div>
                      <div className="mt-1 text-slate-400 font-mono text-[11px] break-all">
                        {selectedLog.userAgent}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. REQUEST HEADERS */}
                {activeTab === "reqHeaders" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs text-slate-400 font-semibold uppercase">Header Name : Value</span>
                      <button
                        onClick={() => copyToClipboard(selectedLog.requestHeaders)}
                        className="text-[11px] text-purple-400 hover:text-purple-300"
                      >
                        Copy Headers JSON
                      </button>
                    </div>
                    <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden divide-y divide-slate-800/60 font-mono text-xs">
                      {Object.entries(selectedLog.requestHeaders || {}).map(([key, value]) => (
                        <div key={key} className="p-2.5 flex items-start gap-3 hover:bg-slate-900/40">
                          <span className="font-semibold text-purple-300 shrink-0 w-44 break-all">{key}:</span>
                          <span className="text-slate-300 break-all">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. REQUEST BODY & QUERY PARAMS */}
                {activeTab === "reqBody" && (
                  <div className="space-y-4">
                    {/* Query Params */}
                    {Object.keys(selectedLog.queryParams || {}).length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-1">
                          Query Parameters (URL SearchParams)
                        </div>
                        <pre className="rounded-xl bg-slate-950 p-3 font-mono text-purple-300 overflow-x-auto border border-slate-800">
                          {JSON.stringify(selectedLog.queryParams, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Body Payload */}
                    <div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Request Body Payload
                        </span>
                        {selectedLog.requestBody && (
                          <button
                            onClick={() => copyToClipboard(selectedLog.requestBody)}
                            className="text-[11px] text-purple-400 hover:text-purple-300"
                          >
                            Copy Body JSON
                          </button>
                        )}
                      </div>
                      {selectedLog.requestBody && Object.keys(selectedLog.requestBody).length > 0 ? (
                        <pre className="rounded-xl bg-slate-950 p-3 font-mono text-amber-300 overflow-x-auto border border-slate-800 text-[11px]">
                          {JSON.stringify(selectedLog.requestBody, null, 2)}
                        </pre>
                      ) : (
                        <div className="rounded-xl bg-slate-950/60 p-6 text-center text-slate-500 border border-slate-800/80">
                          (Không có Request Body payload)
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. RESPONSE (JSON) MỞ RỘNG */}
                {activeTab === "resBody" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Response Body Trả về từ Server (JSON)
                      </span>
                      {selectedLog.responseBody && (
                        <button
                          onClick={() => copyToClipboard(selectedLog.responseBody)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          Copy Response JSON
                        </button>
                      )}
                    </div>

                    {selectedLog.responseBody !== undefined && selectedLog.responseBody !== null ? (
                      <pre className="rounded-xl bg-slate-950 p-3 font-mono text-emerald-300 overflow-x-auto border border-slate-800 text-[11px] leading-relaxed">
                        {typeof selectedLog.responseBody === "object"
                          ? JSON.stringify(selectedLog.responseBody, null, 2)
                          : String(selectedLog.responseBody)}
                      </pre>
                    ) : (
                      <div className="rounded-xl bg-slate-950/60 p-6 text-center text-slate-500 border border-slate-800/80">
                        (Response body rỗng hoặc chưa hoàn tất)
                      </div>
                    )}
                  </div>
                )}

                {/* 5. RESPONSE HEADERS */}
                {activeTab === "resHeaders" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs text-slate-400 font-semibold uppercase">Response Header : Value</span>
                      <button
                        onClick={() => copyToClipboard(selectedLog.responseHeaders)}
                        className="text-[11px] text-purple-400 hover:text-purple-300"
                      >
                        Copy Response Headers JSON
                      </button>
                    </div>
                    <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden divide-y divide-slate-800/60 font-mono text-xs">
                      {Object.entries(selectedLog.responseHeaders || {}).map(([key, value]) => (
                        <div key={key} className="p-2.5 flex items-start gap-3 hover:bg-slate-900/40">
                          <span className="font-semibold text-emerald-300 shrink-0 w-44 break-all">{key}:</span>
                          <span className="text-slate-300 break-all">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-500 py-16">
              <span className="text-4xl">🔍</span>
              <p className="mt-2 text-xs">Nhấp vào một dòng request bên trái để kiểm tra chi tiết mạng (Inspect).</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={clearDialogOpen}
        onClose={() => !isClearing && setClearDialogOpen(false)}
        onConfirm={confirmClearLogs}
        title="Xác nhận xóa nhật ký API"
        message="Bạn có chắc chắn muốn xóa toàn bộ nhật ký API hiện tại? Dữ liệu thống kê và lịch sử request sẽ bị đặt lại."
        confirmText="Xóa tất cả log"
        variant="danger"
        isLoading={isClearing}
      />
    </div>
  );
}
