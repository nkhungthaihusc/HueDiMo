import { Router } from "express";
import { sendError } from "../utils/response";

const router = Router();
const upstreamOrigin = "https://tiles.goong.io";
const proxyPrefix = "/api/map";
const resourcePath = /^\/(?:(?:[\w@.,()-]|%20)+\/)*(?:[\w@.,()-]|%20)+\.(?:json|png|pbf|webp|jpg|jpeg|mvt)$/i;
const templatePath = /^\/(?:(?:[\w@.,(){}-]|%20)+\/)*(?:[\w@.,(){}-]|%20)+\.(?:json|png|pbf|webp|jpg|jpeg|mvt)$/i;
let inFlight = 0;

function rewriteResource(value: unknown, upstream: URL, publicOrigin: string, key: string): unknown {
  if (Array.isArray(value)) return value.map((item) => rewriteResource(item, upstream, publicOrigin, key));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([name, item]) => [
      name, rewriteResource(item, upstream, publicOrigin, key),
    ]));
  }
  if (typeof value !== "string") return value;
  const sanitized = value.split(key).join("");
  if (!/^(?:https?:\/\/|\/)|\.(?:json|pbf|png|webp|jpg|jpeg)(?:\?|$)/i.test(sanitized) &&
      !/(?:^|\/)sprite[\w@.-]*(?:\?|$)/i.test(sanitized)) return sanitized;
  const url = URL.parse(sanitized, upstream);
  const path = url?.pathname.replace(/%7B/gi, "{").replace(/%7D/gi, "}") ?? "";
  if (url?.origin !== upstreamOrigin) return sanitized;
  if (!templatePath.test(path) && !/\/sprite[\w@.-]*$/i.test(path)) return sanitized;
  return publicOrigin + proxyPrefix + path;
}

router.get("/*path", async (req, res) => {
  const path = req.path;
  if (!resourcePath.test(path) || path.split("/").some((part) => part === "." || part === "..")) {
    sendError(res, "NOT_FOUND", "Không tìm thấy tài nguyên bản đồ.", 404);
    return;
  }
  const key = process.env.GOONG_MAP_KEY?.trim();
  if (!key) {
    sendError(res, "UPSTREAM_ERROR", "Máy chủ chưa cấu hình bản đồ.", 503);
    return;
  }
  if (inFlight >= 64) {
    res.set("Retry-After", "2");
    sendError(res, "UPSTREAM_ERROR", "Máy chủ bản đồ đang bận.", 503);
    return;
  }

  inFlight++;
  try {
    const upstream = new URL(path, upstreamOrigin);
    upstream.searchParams.set("api_key", key);
    const response = await fetch(upstream, { redirect: "error", signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      sendError(res, "UPSTREAM_ERROR", "Không thể tải tài nguyên bản đồ.", response.status === 404 ? 404 : 502);
      return;
    }
    const json = path.toLowerCase().endsWith(".json");
    const contentType = response.headers.get("content-type")?.split(";")[0];
    if (!json && contentType && !/^(?:image\/(?:png|webp|jpeg)|application\/(?:octet-stream|x-protobuf|protobuf|vnd\.mapbox-vector-tile|vnd\.google\.protobuf))$/.test(contentType)) {
      sendError(res, "UPSTREAM_ERROR", "Định dạng tài nguyên bản đồ không hợp lệ.", 502);
      return;
    }
    if (json) {
      const configuredOrigin = process.env.GOONG_MAP_PROXY_ORIGIN;
      const publicOrigin = configuredOrigin ? new URL(configuredOrigin).origin : `${req.protocol}://${req.get("host")}`;
      const data = rewriteResource(await response.json(), upstream, publicOrigin, key);
      res.set("Cache-Control", "public, max-age=300").json(data);
    } else {
      const bytes = Buffer.from(await response.arrayBuffer());
      res.set("Cache-Control", "public, max-age=3600")
        .type(contentType || "application/octet-stream").send(bytes);
    }
  } catch {
    if (!res.headersSent) sendError(res, "UPSTREAM_ERROR", "Không thể kết nối máy chủ bản đồ.", 502);
  } finally {
    inFlight--;
  }
});

export default router;
