"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItineraryController = void 0;
const db_1 = require("../config/db");
const itinerary_service_1 = require("../services/itinerary.service");
const response_1 = require("../utils/response");
const auth_service_1 = require("../services/auth.service");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TRANSPORTS = ["motorbike", "car", "bicycle", "walking"];
function validateRequest(body) {
    if (typeof body !== "object" || body === null)
        return "Dữ liệu gửi lên không hợp lệ.";
    const b = body;
    if (typeof b.startDate !== "string" || !DATE_RE.test(b.startDate))
        return "Ngày bắt đầu không hợp lệ (định dạng YYYY-MM-DD).";
    if (typeof b.endDate !== "string" || !DATE_RE.test(b.endDate))
        return "Ngày kết thúc không hợp lệ (định dạng YYYY-MM-DD).";
    if (b.startDate > b.endDate)
        return "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.";
    if (typeof b.budget !== "number" || !Number.isFinite(b.budget) || b.budget <= 0) {
        return "Ngân sách phải là số dương.";
    }
    const prefs = Array.isArray(b.preferences) ? b.preferences : [];
    if (prefs.length === 0)
        return "Chọn ít nhất một sở thích.";
    if (typeof b.currentLocation !== "string")
        return "Nơi ở hiện tại không hợp lệ.";
    if (b.transportMode !== undefined && !VALID_TRANSPORTS.includes(b.transportMode)) {
        return "Phương tiện di chuyển không hợp lệ.";
    }
    if (b.groupSize !== undefined && (typeof b.groupSize !== "number" || !Number.isFinite(b.groupSize) || b.groupSize <= 0)) {
        return "Số lượng người phải là số nguyên dương.";
    }
    if (b.startPlaceId !== null && b.startPlaceId !== undefined && typeof b.startPlaceId !== "string") {
        return "Điểm bắt đầu không hợp lệ.";
    }
    if (b.endPlaceId !== null && b.endPlaceId !== undefined && typeof b.endPlaceId !== "string") {
        return "Điểm kết thúc không hợp lệ.";
    }
    if (!Array.isArray(b.places) || b.places.length === 0)
        return "Danh sách địa điểm trống.";
    const badPlace = b.places.some((p) => {
        if (typeof p !== "object" || p === null)
            return true;
        const pl = p;
        if (typeof pl.id !== "string" || pl.id.length === 0)
            return true;
        if (typeof pl.name !== "string" || pl.name.trim().length === 0)
            return true;
        if (typeof pl.lat !== "number" || !Number.isFinite(pl.lat))
            return true;
        if (typeof pl.lng !== "number" || !Number.isFinite(pl.lng))
            return true;
        if (typeof pl.category !== "string" || pl.category.length === 0)
            return true;
        return false;
    });
    if (badPlace)
        return "Một trong các địa điểm gửi lên không hợp lệ.";
    return null;
}
// Trích xuất userId nếu có token Bearer (không bắt buộc đăng nhập để xem)
function getOptionalUserId(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
        return null;
    const token = authHeader.split(" ")[1];
    if (!token)
        return null;
    try {
        const decoded = auth_service_1.AuthService.verifyAccessToken(token);
        return decoded.id;
    }
    catch {
        return null;
    }
}
class ItineraryController {
    /**
     * POST /api/itinerary / /api/itineraries
     * Sinh lịch trình mới từ AI
     */
    static async generate(req, res, next) {
        try {
            const validationError = validateRequest(req.body);
            if (validationError) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", validationError, 422);
                return;
            }
            const input = req.body;
            const result = await itinerary_service_1.ItineraryService.generate(input);
            (0, response_1.sendSuccess)(res, result);
        }
        catch (error) {
            console.error("[ItineraryController] generate error:", error);
            if (error?.message?.startsWith("CONFIG_MISSING")) {
                (0, response_1.sendError)(res, "INTERNAL_ERROR", "Máy chủ chưa được cấu hình khóa AI. Vui lòng thử lại sau.", 500);
                return;
            }
            (0, response_1.sendError)(res, "UPSTREAM_ERROR", error?.message || "Không thể khởi tạo lịch trình AI lúc này.", 502);
        }
    }
    /**
     * POST /api/itineraries/save
     * Lưu hoặc cập nhật lịch trình của người dùng lên cơ sở dữ liệu
     */
    static async saveItinerary(req, res, next) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                (0, response_1.sendError)(res, "UNAUTHORIZED", "Vui lòng đăng nhập để lưu lịch trình.", 401);
                return;
            }
            const { id, title, startDate, endDate, budget, totalEstimatedCost, transportMode, groupSize, currentLocation, preferences, summary, days, isPublic, } = req.body || {};
            if (!title || typeof title !== "string" || !title.trim()) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Tiêu đề lịch trình không được để trống.", 422);
                return;
            }
            if (!startDate || !endDate) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Ngày bắt đầu và ngày kết thúc là bắt buộc.", 422);
                return;
            }
            const daysJson = JSON.stringify(Array.isArray(days) ? days : []);
            const prefArray = Array.isArray(preferences) ? preferences : [];
            const numBudget = typeof budget === "number" ? budget : 0;
            const numTotal = typeof totalEstimatedCost === "number" ? totalEstimatedCost : 0;
            const numGroup = typeof groupSize === "number" ? groupSize : 1;
            const tMode = typeof transportMode === "string" ? transportMode : "motorbike";
            const bPublic = Boolean(isPublic);
            // Nếu có id và là UUID hợp lệ, thử update nếu thuộc về user này
            if (id && typeof id === "string" && id.length > 20) {
                const check = await db_1.pool.query("SELECT id, user_id FROM public.itineraries WHERE id = $1", [id]);
                if (check.rows.length > 0) {
                    if (check.rows[0].user_id !== userId) {
                        (0, response_1.sendError)(res, "FORBIDDEN", "Bạn không có quyền chỉnh sửa lịch trình này.", 403);
                        return;
                    }
                    const updateRes = await db_1.pool.query(`UPDATE public.itineraries 
             SET title = $1, start_date = $2, end_date = $3, budget = $4, total_estimated_cost = $5,
                 transport_mode = $6, group_size = $7, current_location = $8, preferences = $9,
                 summary = $10, days = $11::jsonb, is_public = $12, updated_at = NOW()
             WHERE id = $13 AND user_id = $14
             RETURNING *`, [
                        title.trim(),
                        startDate,
                        endDate,
                        numBudget,
                        numTotal,
                        tMode,
                        numGroup,
                        currentLocation || "",
                        prefArray,
                        summary || "",
                        daysJson,
                        bPublic,
                        id,
                        userId,
                    ]);
                    (0, response_1.sendSuccess)(res, { itinerary: updateRes.rows[0], message: "Cập nhật lịch trình thành công!" });
                    return;
                }
            }
            // Kiểm tra xem đã có lịch trình trùng khớp của user này chưa (chống duplicate khi toggle public/private)
            const existingMatch = await db_1.pool.query(`SELECT id FROM public.itineraries 
         WHERE user_id = $1 AND title = $2 AND start_date = $3 AND end_date = $4
         ORDER BY updated_at DESC LIMIT 1`, [userId, title.trim(), startDate, endDate]);
            if (existingMatch.rows.length > 0) {
                const matchedId = existingMatch.rows[0].id;
                const updateRes = await db_1.pool.query(`UPDATE public.itineraries 
           SET budget = $1, total_estimated_cost = $2, transport_mode = $3, group_size = $4,
               current_location = $5, preferences = $6, summary = $7, days = $8::jsonb,
               is_public = $9, updated_at = NOW()
           WHERE id = $10 AND user_id = $11
           RETURNING *`, [
                    numBudget,
                    numTotal,
                    tMode,
                    numGroup,
                    currentLocation || "",
                    prefArray,
                    summary || "",
                    daysJson,
                    bPublic,
                    matchedId,
                    userId,
                ]);
                (0, response_1.sendSuccess)(res, { itinerary: updateRes.rows[0], message: "Cập nhật lịch trình thành công!" });
                return;
            }
            // Tạo mới nếu chưa từng tồn tại
            const insertRes = await db_1.pool.query(`INSERT INTO public.itineraries (
           user_id, title, start_date, end_date, budget, total_estimated_cost,
           transport_mode, group_size, current_location, preferences, summary,
           days, is_public, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, NOW(), NOW()
         ) RETURNING *`, [
                userId,
                title.trim(),
                startDate,
                endDate,
                numBudget,
                numTotal,
                tMode,
                numGroup,
                currentLocation || "",
                prefArray,
                summary || "",
                daysJson,
                bPublic,
            ]);
            (0, response_1.sendSuccess)(res, { itinerary: insertRes.rows[0], message: "Lưu lịch trình thành công!" }, 201);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/itineraries/community
     * Lấy danh sách lịch trình công khai từ cộng đồng
     */
    static async getCommunity(req, res, next) {
        try {
            const currentUserId = getOptionalUserId(req);
            const { search, transportMode, daysCount, maxBudget, sort = "newest", // newest | most_liked | most_viewed
            page = "1", limit = "12", } = req.query;
            const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
            const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10) || 12));
            const offset = (pageNum - 1) * limitNum;
            const conditions = ["i.is_public = true"];
            const params = [];
            let pIdx = 1;
            if (search && typeof search === "string" && search.trim()) {
                conditions.push(`(i.title ILIKE $${pIdx} OR i.summary ILIKE $${pIdx})`);
                params.push(`%${search.trim()}%`);
                pIdx++;
            }
            if (transportMode && typeof transportMode === "string" && transportMode.trim()) {
                conditions.push(`i.transport_mode = $${pIdx}`);
                params.push(transportMode.trim());
                pIdx++;
            }
            if (maxBudget) {
                const numBudget = Number(maxBudget);
                if (!isNaN(numBudget) && numBudget > 0) {
                    conditions.push(`(i.budget <= $${pIdx} OR i.total_estimated_cost <= $${pIdx})`);
                    params.push(numBudget);
                    pIdx++;
                }
            }
            if (daysCount) {
                const numDays = parseInt(String(daysCount), 10);
                if (!isNaN(numDays) && numDays > 0) {
                    if (numDays >= 4) {
                        conditions.push(`(i.end_date - i.start_date + 1) >= 4`);
                    }
                    else {
                        conditions.push(`(i.end_date - i.start_date + 1) = $${pIdx}`);
                        params.push(numDays);
                        pIdx++;
                    }
                }
            }
            let orderBy = "i.created_at DESC";
            if (sort === "most_liked") {
                orderBy = "i.likes_count DESC, i.created_at DESC";
            }
            else if (sort === "most_viewed") {
                orderBy = "i.views_count DESC, i.created_at DESC";
            }
            else if (sort === "highest_rated") {
                orderBy = "i.rating DESC NULLS LAST, i.created_at DESC";
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
            const countSql = `SELECT COUNT(*)::int as total FROM public.itineraries i ${whereClause}`;
            const countRes = await db_1.pool.query(countSql, params);
            const total = countRes.rows[0]?.total || 0;
            const querySql = `
        SELECT 
          i.*,
          u.name as author_name,
          u.avatar_url as author_avatar,
          u.role as author_role,
          (i.end_date - i.start_date + 1) as days_count,
          ${currentUserId ? `EXISTS(SELECT 1 FROM public.itinerary_reactions r WHERE r.itinerary_id = i.id AND r.user_id = '${currentUserId}') as is_liked,` : "false as is_liked,"}
          ${currentUserId ? `EXISTS(SELECT 1 FROM public.itinerary_bookmarks b WHERE b.itinerary_id = i.id AND b.user_id = '${currentUserId}') as is_bookmarked,` : "false as is_bookmarked,"}
          (SELECT COUNT(*)::int FROM public.itinerary_comments c WHERE c.itinerary_id = i.id) as comments_count
        FROM public.itineraries i
        LEFT JOIN public.users u ON i.user_id = u.id
        ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${pIdx} OFFSET $${pIdx + 1}
      `;
            const listRes = await db_1.pool.query(querySql, [...params, limitNum, offset]);
            (0, response_1.sendSuccess)(res, {
                items: listRes.rows,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/itineraries/my
     * Lấy tất cả lịch trình cá nhân của user (cả private và public)
     */
    static async getMyItineraries(req, res, next) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                (0, response_1.sendError)(res, "UNAUTHORIZED", "Vui lòng đăng nhập.", 401);
                return;
            }
            const querySql = `
        SELECT 
          i.*,
          (i.end_date - i.start_date + 1) as days_count,
          (SELECT COUNT(*)::int FROM public.itinerary_comments c WHERE c.itinerary_id = i.id) as comments_count
        FROM public.itineraries i
        WHERE i.user_id = $1
        ORDER BY i.created_at DESC
      `;
            const result = await db_1.pool.query(querySql, [userId]);
            (0, response_1.sendSuccess)(res, result.rows);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/itineraries/:id
     * Xem chi tiết 1 lịch trình cụ thể
     */
    static async getById(req, res, next) {
        try {
            const { id } = req.params;
            const currentUserId = getOptionalUserId(req);
            // Tăng lượt xem views_count
            await db_1.pool.query("UPDATE public.itineraries SET views_count = COALESCE(views_count, 0) + 1 WHERE id = $1", [id]);
            const sql = `
        SELECT 
          i.*,
          u.name as author_name,
          u.avatar_url as author_avatar,
          u.role as author_role,
          (i.end_date - i.start_date + 1) as days_count,
          ${currentUserId ? `EXISTS(SELECT 1 FROM public.itinerary_reactions r WHERE r.itinerary_id = i.id AND r.user_id = '${currentUserId}') as is_liked,` : "false as is_liked,"}
          ${currentUserId ? `EXISTS(SELECT 1 FROM public.itinerary_bookmarks b WHERE b.itinerary_id = i.id AND b.user_id = '${currentUserId}') as is_bookmarked,` : "false as is_bookmarked,"}
          (SELECT COUNT(*)::int FROM public.itinerary_comments c WHERE c.itinerary_id = i.id) as comments_count
        FROM public.itineraries i
        LEFT JOIN public.users u ON i.user_id = u.id
        WHERE i.id = $1
      `;
            const result = await db_1.pool.query(sql, [id]);
            if (result.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", "Không tìm thấy lịch trình này.", 404);
                return;
            }
            const row = result.rows[0];
            // Nếu không public và không phải chính chủ thì không cho xem
            if (!row.is_public && row.user_id !== currentUserId) {
                (0, response_1.sendError)(res, "FORBIDDEN", "Lịch trình này ở chế độ riêng tư của tác giả.", 403);
                return;
            }
            (0, response_1.sendSuccess)(res, row);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /api/itineraries/:id/visibility
     * Bật/tắt trạng thái công khai cho lịch trình của mình
     */
    static async toggleVisibility(req, res, next) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const { isPublic } = req.body;
            if (typeof isPublic !== "boolean") {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Tham số isPublic phải là true hoặc false.", 422);
                return;
            }
            const check = await db_1.pool.query("SELECT id, user_id FROM public.itineraries WHERE id = $1", [id]);
            if (check.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", "Không tìm thấy lịch trình.", 404);
                return;
            }
            if (check.rows[0].user_id !== userId) {
                (0, response_1.sendError)(res, "FORBIDDEN", "Bạn không có quyền thay đổi trạng thái của lịch trình này.", 403);
                return;
            }
            const updated = await db_1.pool.query("UPDATE public.itineraries SET is_public = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [isPublic, id]);
            (0, response_1.sendSuccess)(res, {
                itinerary: updated.rows[0],
                message: isPublic
                    ? "Đã chia sẻ lịch trình công khai lên cộng đồng HueDiMo!"
                    : "Đã chuyển lịch trình về chế độ riêng tư.",
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/itineraries/:id
     * Xóa lịch trình
     */
    static async deleteItinerary(req, res, next) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const check = await db_1.pool.query("SELECT id, user_id FROM public.itineraries WHERE id = $1", [id]);
            if (check.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", "Không tìm thấy lịch trình.", 404);
                return;
            }
            if (check.rows[0].user_id !== userId && req.user?.role !== "admin") {
                (0, response_1.sendError)(res, "FORBIDDEN", "Bạn không có quyền xóa lịch trình này.", 403);
                return;
            }
            await db_1.pool.query("DELETE FROM public.itineraries WHERE id = $1", [id]);
            (0, response_1.sendSuccess)(res, { message: "Xóa lịch trình thành công." });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/itineraries/:id/reaction
     * Toggle cảm xúc (Thả tim ❤️ / Like)
     */
    static async toggleReaction(req, res, next) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId) {
                (0, response_1.sendError)(res, "UNAUTHORIZED", "Vui lòng đăng nhập để thả cảm xúc.", 401);
                return;
            }
            const existing = await db_1.pool.query("SELECT id FROM public.itinerary_reactions WHERE itinerary_id = $1 AND user_id = $2", [id, userId]);
            let isLiked = false;
            if (existing.rows.length > 0) {
                // Hủy thích
                await db_1.pool.query("DELETE FROM public.itinerary_reactions WHERE id = $1", [existing.rows[0].id]);
                await db_1.pool.query("UPDATE public.itineraries SET likes_count = GREATEST(0, COALESCE(likes_count, 1) - 1) WHERE id = $1", [id]);
                isLiked = false;
            }
            else {
                // Thích
                await db_1.pool.query("INSERT INTO public.itinerary_reactions (itinerary_id, user_id, reaction_type) VALUES ($1, $2, 'like')", [id, userId]);
                await db_1.pool.query("UPDATE public.itineraries SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = $1", [id]);
                isLiked = true;
            }
            const likesRes = await db_1.pool.query("SELECT likes_count FROM public.itineraries WHERE id = $1", [id]);
            const likesCount = likesRes.rows[0]?.likes_count || 0;
            (0, response_1.sendSuccess)(res, { isLiked, likesCount });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/itineraries/:id/bookmark
     * Toggle bookmark (Lưu lại để tham khảo sau)
     */
    static async toggleBookmark(req, res, next) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId) {
                (0, response_1.sendError)(res, "UNAUTHORIZED", "Vui lòng đăng nhập để đánh dấu lịch trình.", 401);
                return;
            }
            const existing = await db_1.pool.query("SELECT id FROM public.itinerary_bookmarks WHERE itinerary_id = $1 AND user_id = $2", [id, userId]);
            let isBookmarked = false;
            if (existing.rows.length > 0) {
                await db_1.pool.query("DELETE FROM public.itinerary_bookmarks WHERE id = $1", [existing.rows[0].id]);
                await db_1.pool.query("UPDATE public.itineraries SET bookmarks_count = GREATEST(0, COALESCE(bookmarks_count, 1) - 1) WHERE id = $1", [id]);
                isBookmarked = false;
            }
            else {
                await db_1.pool.query("INSERT INTO public.itinerary_bookmarks (itinerary_id, user_id) VALUES ($1, $2)", [id, userId]);
                await db_1.pool.query("UPDATE public.itineraries SET bookmarks_count = COALESCE(bookmarks_count, 0) + 1 WHERE id = $1", [id]);
                isBookmarked = true;
            }
            const bRes = await db_1.pool.query("SELECT bookmarks_count FROM public.itineraries WHERE id = $1", [id]);
            const bookmarksCount = bRes.rows[0]?.bookmarks_count || 0;
            (0, response_1.sendSuccess)(res, { isBookmarked, bookmarksCount });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/itineraries/:id/fork
     * Sử dụng lộ trình: Nhân bản lịch trình cộng đồng về tài khoản người dùng
     */
    static async forkItinerary(req, res, next) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            if (!userId) {
                (0, response_1.sendError)(res, "UNAUTHORIZED", "Vui lòng đăng nhập để sử dụng lộ trình này.", 401);
                return;
            }
            const originalRes = await db_1.pool.query("SELECT * FROM public.itineraries WHERE id = $1", [id]);
            if (originalRes.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", "Không tìm thấy lộ trình gốc.", 404);
                return;
            }
            const orig = originalRes.rows[0];
            // Tăng số lượt fork cho lộ trình gốc
            await db_1.pool.query("UPDATE public.itineraries SET forks_count = COALESCE(forks_count, 0) + 1 WHERE id = $1", [id]);
            // Tạo bản sao cho người dùng hiện tại (ở chế độ private ban đầu để người dùng chỉnh sửa)
            const newTitle = `[Bản sao] ${orig.title}`;
            const daysJson = typeof orig.days === "string" ? orig.days : JSON.stringify(orig.days || []);
            const prefArray = Array.isArray(orig.preferences) ? orig.preferences : [];
            const insertCopy = await db_1.pool.query(`INSERT INTO public.itineraries (
           user_id, title, start_date, end_date, budget, total_estimated_cost,
           transport_mode, group_size, current_location, preferences, summary,
           days, is_public, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, false, NOW(), NOW()
         ) RETURNING *`, [
                userId,
                newTitle,
                orig.start_date,
                orig.end_date,
                orig.budget,
                orig.total_estimated_cost,
                orig.transport_mode,
                orig.group_size,
                orig.current_location,
                prefArray,
                orig.summary,
                daysJson,
            ]);
            (0, response_1.sendSuccess)(res, {
                itinerary: insertCopy.rows[0],
                message: "Đã nạp lộ trình vào danh sách chuyến đi của bạn!",
            }, 201);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/itineraries/:id/comments
     * Lấy danh sách bình luận/góp ý của lịch trình
     */
    static async getComments(req, res, next) {
        try {
            const { id } = req.params;
            const commentsSql = `
        SELECT 
          c.id,
          c.content,
          c.rating,
          c.created_at,
          c.user_id,
          u.name as user_name,
          u.avatar_url as user_avatar,
          u.role as user_role
        FROM public.itinerary_comments c
        LEFT JOIN public.users u ON c.user_id = u.id
        WHERE c.itinerary_id = $1
        ORDER BY c.created_at ASC
      `;
            const result = await db_1.pool.query(commentsSql, [id]);
            (0, response_1.sendSuccess)(res, result.rows);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/itineraries/:id/comments
     * Thêm bình luận / đánh giá mới
     */
    static async addComment(req, res, next) {
        try {
            const userId = req.user?.id;
            const { id } = req.params;
            const { content, rating } = req.body;
            if (!userId) {
                (0, response_1.sendError)(res, "UNAUTHORIZED", "Vui lòng đăng nhập để bình luận.", 401);
                return;
            }
            if (!content || typeof content !== "string" || !content.trim()) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Nội dung bình luận không được để trống.", 422);
                return;
            }
            let parsedRating = null;
            if (rating !== undefined && rating !== null) {
                const rNum = Number(rating);
                if (!isNaN(rNum) && rNum >= 1 && rNum <= 5) {
                    parsedRating = Math.round(rNum);
                }
            }
            const insertRes = await db_1.pool.query(`INSERT INTO public.itinerary_comments (itinerary_id, user_id, content, rating, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         RETURNING *`, [id, userId, content.trim(), parsedRating]);
            const newComment = insertRes.rows[0];
            // Nếu có đánh giá điểm số (rating), tính lại điểm trung bình của lịch trình
            if (parsedRating !== null) {
                await db_1.pool.query(`UPDATE public.itineraries
           SET rating = (
             SELECT ROUND(AVG(rating)::numeric, 1)
             FROM public.itinerary_comments
             WHERE itinerary_id = $1 AND rating IS NOT NULL
           )
           WHERE id = $1`, [id]);
            }
            // Lấy thông tin người bình luận để trả về ngay
            const userRes = await db_1.pool.query("SELECT name, avatar_url, role FROM public.users WHERE id = $1", [userId]);
            const user = userRes.rows[0] || {};
            (0, response_1.sendSuccess)(res, {
                comment: {
                    ...newComment,
                    user_name: user.name,
                    user_avatar: user.avatar_url,
                    user_role: user.role,
                },
                message: "Gửi ý kiến / đánh giá thành công!",
            }, 201);
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/itineraries/:id/comments/:commentId
     * Xóa bình luận
     */
    static async deleteComment(req, res, next) {
        try {
            const userId = req.user?.id;
            const { commentId } = req.params;
            const check = await db_1.pool.query("SELECT id, user_id FROM public.itinerary_comments WHERE id = $1", [commentId]);
            if (check.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", "Không tìm thấy bình luận.", 404);
                return;
            }
            if (check.rows[0].user_id !== userId && req.user?.role !== "admin") {
                (0, response_1.sendError)(res, "FORBIDDEN", "Bạn không có quyền xóa bình luận này.", 403);
                return;
            }
            await db_1.pool.query("DELETE FROM public.itinerary_comments WHERE id = $1", [commentId]);
            (0, response_1.sendSuccess)(res, { message: "Đã xóa bình luận." });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ItineraryController = ItineraryController;
