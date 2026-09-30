"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const db_1 = require("../config/db");
const response_1 = require("../utils/response");
const logger_middleware_1 = require("../middleware/logger.middleware");
const settings_model_1 = require("../models/settings.model");
const itinerary_service_1 = require("../services/itinerary.service");
// Helper function to slugify Vietnamese string for ID generation if not provided
function slugify(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
exports.AdminController = {
    /**
     * GET /api/admin/stats
     * Thống kê tổng quan cho Dashboard Quản Trị Viên
     */
    async getStats(_req, res, next) {
        try {
            // 1. Tổng số địa điểm
            const placesCountRes = await db_1.pool.query("SELECT count(*)::int as total FROM public.places");
            const totalPlaces = placesCountRes.rows[0]?.total || 0;
            // 1.1 Số địa điểm đang chờ duyệt
            const pendingCountRes = await db_1.pool.query("SELECT count(*)::int as total FROM public.places WHERE status = 'pending'");
            const totalPendingPlaces = pendingCountRes.rows[0]?.total || 0;
            // 2. Tổng số người dùng
            const usersCountRes = await db_1.pool.query("SELECT count(*)::int as total FROM public.users");
            const totalUsers = usersCountRes.rows[0]?.total || 0;
            // 3. Phân loại theo category
            const categoryDistributionRes = await db_1.pool.query(`
        SELECT category, count(*)::int as count 
        FROM public.places 
        GROUP BY category 
        ORDER BY count DESC
      `);
            // 4. Tổng số reviews và điểm trung bình
            const reviewsStatsRes = await db_1.pool.query(`
        SELECT count(*)::int as total_reviews, COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as avg_rating 
        FROM public.reviews
      `);
            const { total_reviews, avg_rating } = reviewsStatsRes.rows[0] || { total_reviews: 0, avg_rating: 0 };
            // 4.1 Thống kê Lộ trình du lịch & Đánh giá lộ trình
            const itinerariesStatsRes = await db_1.pool.query(`
        SELECT 
          count(*)::int as total_itineraries,
          count(*) FILTER (WHERE is_public = true)::int as public_itineraries
        FROM public.itineraries
      `);
            const { total_itineraries, public_itineraries } = itinerariesStatsRes.rows[0] || { total_itineraries: 0, public_itineraries: 0 };
            const itineraryCommentsStatsRes = await db_1.pool.query(`
        SELECT count(*)::int as total_itinerary_comments FROM public.itinerary_comments
      `);
            const totalItineraryComments = itineraryCommentsStatsRes.rows[0]?.total_itinerary_comments || 0;
            // 5. Địa điểm mới nhất
            const recentPlacesRes = await db_1.pool.query(`
        SELECT id, name, category, rating, price, is_local, status, image_url, created_at, updated_at
        FROM public.places
        ORDER BY COALESCE(updated_at, created_at, NOW()) DESC
        LIMIT 5
      `);
            (0, response_1.sendSuccess)(res, {
                overview: {
                    totalPlaces,
                    pendingPlaces: totalPendingPlaces,
                    totalUsers,
                    totalReviews: total_reviews,
                    avgRating: Number(avg_rating),
                    totalItineraries: total_itineraries,
                    publicItineraries: public_itineraries,
                    totalItineraryComments,
                },
                categoryDistribution: categoryDistributionRes.rows,
                recentPlaces: recentPlacesRes.rows,
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * GET /api/admin/places
     * Lấy danh sách địa điểm phục vụ quản trị (hỗ trợ search, filter, status, pagination)
     */
    async getPlaces(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
            const offset = (page - 1) * limit;
            const { q, category, status } = req.query;
            const whereClauses = [];
            const values = [];
            let idx = 1;
            if (q && typeof q === "string" && q.trim()) {
                whereClauses.push(`(name ILIKE $${idx} OR address ILIKE $${idx} OR description ILIKE $${idx})`);
                values.push(`%${q.trim()}%`);
                idx++;
            }
            if (category && typeof category === "string" && category.trim()) {
                whereClauses.push(`category = $${idx}`);
                values.push(category.trim());
                idx++;
            }
            if (status && typeof status === "string" && status.trim() && status.trim() !== "all") {
                whereClauses.push(`status = $${idx}`);
                values.push(status.trim());
                idx++;
            }
            const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
            // Count total matching
            const countRes = await db_1.pool.query(`SELECT count(*)::int as total FROM public.places ${whereSql}`, values);
            const total = countRes.rows[0]?.total || 0;
            // Select records
            const queryValues = [...values, limit, offset];
            const placesRes = await db_1.pool.query(`SELECT * FROM public.places 
         ${whereSql} 
         ORDER BY created_at DESC NULLS LAST, name ASC 
         LIMIT $${idx} OFFSET $${idx + 1}`, queryValues);
            (0, response_1.sendSuccess)(res, {
                items: placesRes.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * POST /api/admin/places
     * Tạo địa điểm du lịch mới
     */
    async createPlace(req, res, next) {
        try {
            const { name, category, lat, lng, address, price = 0, is_local = false, opening_hours = "", estimated_duration_minutes = 60, best_time_to_visit = "", rating = 4.5, description = "", image_url = "", imageUrl = "", images = [], highlights = [], notes = "", } = req.body;
            const finalImageUrl = (image_url || imageUrl || "").trim();
            if (!name || typeof name !== "string" || !name.trim()) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Tên địa điểm không được để trống.", 422, { field: "name" });
                return;
            }
            if (!category || typeof category !== "string") {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Danh mục không hợp lệ.", 422, { field: "category" });
                return;
            }
            const numLat = Number(lat);
            const numLng = Number(lng);
            if (isNaN(numLat) || isNaN(numLng) || numLat < 15.0 || numLat > 18.0 || numLng < 106.0 || numLng > 109.0) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Tọa độ không hợp lệ hoặc nằm ngoài khu vực Thừa Thiên Huế (16.0 - 16.8, 107.0 - 108.2).", 422, { field: "coordinates" });
                return;
            }
            // Generate clean unique ID
            let id = req.body.id ? slugify(req.body.id) : slugify(name);
            if (!id)
                id = `place-${Date.now()}`;
            // Check existence
            const existCheck = await db_1.pool.query("SELECT id FROM public.places WHERE id = $1", [id]);
            if (existCheck.rows.length > 0) {
                id = `${id}-${Date.now().toString().slice(-4)}`;
            }
            const created_by = req.user?.id || null;
            const insertRes = await db_1.pool.query(`INSERT INTO public.places (
          id, name, category, lat, lng, address, price, is_local,
          opening_hours, estimated_duration_minutes, best_time_to_visit,
          rating, description, image_url, images, highlights, notes,
          created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, NOW(), NOW()
        ) RETURNING *`, [
                id,
                name.trim(),
                category.trim(),
                numLat,
                numLng,
                (address || "").trim(),
                Number(price) || 0,
                Boolean(is_local),
                (opening_hours || "").trim(),
                Number(estimated_duration_minutes) || 60,
                (best_time_to_visit || "").trim(),
                Number(rating) || 4.5,
                (description || "").trim(),
                finalImageUrl,
                Array.isArray(images) && images.length > 0 ? images : (finalImageUrl ? [finalImageUrl] : []),
                Array.isArray(highlights) ? highlights : [],
                (notes || "").trim(),
                created_by,
            ]);
            (0, response_1.sendSuccess)(res, insertRes.rows[0], 201);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * PUT /api/admin/places/:id
     * Cập nhật thông tin địa điểm
     */
    async updatePlace(req, res, next) {
        try {
            const { id } = req.params;
            const placeCheck = await db_1.pool.query("SELECT * FROM public.places WHERE id = $1", [id]);
            if (placeCheck.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", `Không tìm thấy địa điểm với mã '${id}'.`, 404);
                return;
            }
            const { name, category, lat, lng, address, price, is_local, opening_hours, estimated_duration_minutes, best_time_to_visit, rating, description, image_url, imageUrl, images, highlights, notes, } = req.body;
            const updates = [];
            const values = [];
            let idx = 1;
            if (name !== undefined) {
                if (!name.trim()) {
                    (0, response_1.sendError)(res, "VALIDATION_ERROR", "Tên địa điểm không được để trống.", 422);
                    return;
                }
                updates.push(`name = $${idx++}`);
                values.push(name.trim());
            }
            if (category !== undefined) {
                updates.push(`category = $${idx++}`);
                values.push(category.trim());
            }
            if (lat !== undefined) {
                const numLat = Number(lat);
                if (isNaN(numLat) || numLat < 15.0 || numLat > 18.0) {
                    (0, response_1.sendError)(res, "VALIDATION_ERROR", "Vĩ độ không hợp lệ trong phạm vi Huế.", 422);
                    return;
                }
                updates.push(`lat = $${idx++}`);
                values.push(numLat);
            }
            if (lng !== undefined) {
                const numLng = Number(lng);
                if (isNaN(numLng) || numLng < 106.0 || numLng > 109.0) {
                    (0, response_1.sendError)(res, "VALIDATION_ERROR", "Kinh độ không hợp lệ trong phạm vi Huế.", 422);
                    return;
                }
                updates.push(`lng = $${idx++}`);
                values.push(numLng);
            }
            if (address !== undefined) {
                updates.push(`address = $${idx++}`);
                values.push(address.trim());
            }
            if (price !== undefined) {
                updates.push(`price = $${idx++}`);
                values.push(Number(price) || 0);
            }
            if (is_local !== undefined) {
                updates.push(`is_local = $${idx++}`);
                values.push(Boolean(is_local));
            }
            if (opening_hours !== undefined) {
                updates.push(`opening_hours = $${idx++}`);
                values.push(opening_hours.trim());
            }
            if (estimated_duration_minutes !== undefined) {
                updates.push(`estimated_duration_minutes = $${idx++}`);
                values.push(Number(estimated_duration_minutes) || 60);
            }
            if (best_time_to_visit !== undefined) {
                updates.push(`best_time_to_visit = $${idx++}`);
                values.push(best_time_to_visit.trim());
            }
            if (rating !== undefined) {
                updates.push(`rating = $${idx++}`);
                values.push(Math.min(5, Math.max(1, Number(rating) || 5)));
            }
            if (description !== undefined) {
                updates.push(`description = $${idx++}`);
                values.push(description.trim());
            }
            const resolvedImageUrl = image_url !== undefined ? image_url : imageUrl;
            if (resolvedImageUrl !== undefined) {
                updates.push(`image_url = $${idx++}`);
                values.push(resolvedImageUrl);
            }
            if (images !== undefined) {
                updates.push(`images = $${idx++}`);
                values.push(Array.isArray(images) ? images : (resolvedImageUrl ? [resolvedImageUrl] : []));
            }
            else if (resolvedImageUrl !== undefined) {
                // Nếu client cập nhật image_url nhưng không truyền mảng images, cập nhật luôn ảnh đầu tiên của images
                updates.push(`images = ARRAY[$${idx++}]::text[]`);
                values.push(resolvedImageUrl);
            }
            if (highlights !== undefined) {
                updates.push(`highlights = $${idx++}`);
                values.push(Array.isArray(highlights) ? highlights : []);
            }
            if (notes !== undefined) {
                updates.push(`notes = $${idx++}`);
                values.push(notes.trim());
            }
            if (req.body.status !== undefined) {
                const validStatuses = ["pending", "approved", "rejected"];
                if (validStatuses.includes(req.body.status)) {
                    updates.push(`status = $${idx++}`);
                    values.push(req.body.status);
                }
            }
            updates.push(`updated_at = NOW()`);
            values.push(id);
            const updateRes = await db_1.pool.query(`UPDATE public.places 
         SET ${updates.join(", ")} 
         WHERE id = $${idx} 
         RETURNING *`, values);
            (0, response_1.sendSuccess)(res, updateRes.rows[0]);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * PATCH /api/admin/places/:id/status
     * Phê duyệt hoặc từ chối địa điểm
     */
    async updatePlaceStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!status || !["pending", "approved", "rejected"].includes(status)) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Trạng thái không hợp lệ (pending, approved, rejected).", 422);
                return;
            }
            const placeCheck = await db_1.pool.query("SELECT id, name, status FROM public.places WHERE id = $1", [id]);
            if (placeCheck.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", `Không tìm thấy địa điểm với mã '${id}'.`, 404);
                return;
            }
            const updateRes = await db_1.pool.query("UPDATE public.places SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [status, id]);
            (0, response_1.sendSuccess)(res, updateRes.rows[0]);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * DELETE /api/admin/places/:id
     * Xóa địa điểm du lịch
     */
    async deletePlace(req, res, next) {
        try {
            const { id } = req.params;
            const placeCheck = await db_1.pool.query("SELECT id, name FROM public.places WHERE id = $1", [id]);
            if (placeCheck.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", `Không tìm thấy địa điểm '${id}'.`, 404);
                return;
            }
            // Xóa các reviews liên quan trước (nếu có)
            await db_1.pool.query("DELETE FROM public.reviews WHERE place_id = $1", [id]);
            // Xóa địa điểm
            await db_1.pool.query("DELETE FROM public.places WHERE id = $1", [id]);
            (0, response_1.sendSuccess)(res, {
                id,
                deleted: true,
                message: `Đã xóa thành công địa điểm '${placeCheck.rows[0].name}'.`,
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * GET /api/admin/users
     * Quản lý danh sách người dùng trong hệ thống
     */
    async getUsers(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
            const offset = (page - 1) * limit;
            const { q, role } = req.query;
            const whereClauses = [];
            const values = [];
            let idx = 1;
            if (q && typeof q === "string" && q.trim()) {
                whereClauses.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
                values.push(`%${q.trim()}%`);
                idx++;
            }
            if (role && typeof role === "string" && role.trim()) {
                whereClauses.push(`role = $${idx}`);
                values.push(role.trim().toLowerCase());
                idx++;
            }
            const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
            const countRes = await db_1.pool.query(`SELECT count(*)::int as total FROM public.users ${whereSql}`, values);
            const total = countRes.rows[0]?.total || 0;
            const usersRes = await db_1.pool.query(`SELECT id, name, email, avatar_url, role, COALESCE(status, 'active') as status, created_at, updated_at 
         FROM public.users 
         ${whereSql} 
         ORDER BY created_at DESC 
         LIMIT $${idx} OFFSET $${idx + 1}`, [...values, limit, offset]);
            (0, response_1.sendSuccess)(res, {
                items: usersRes.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * PATCH /api/admin/users/:id/role
     * Thay đổi quyền hạn (Role) của người dùng: 'admin' hoặc 'user'
     */
    async updateUserRole(req, res, next) {
        try {
            const { id } = req.params;
            const { role } = req.body;
            if (!role || (role !== "admin" && role !== "user")) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Vai trò (role) không hợp lệ. Chỉ chấp nhận 'admin' hoặc 'user'.", 422);
                return;
            }
            // Tránh tự hạ quyền chính mình nếu là admin duy nhất
            if (req.user?.id === id && role !== "admin") {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Bạn không thể tự hạ quyền của chính mình.", 422);
                return;
            }
            const userCheck = await db_1.pool.query("SELECT id, name, email, role FROM public.users WHERE id = $1", [id]);
            if (userCheck.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", `Không tìm thấy người dùng với id '${id}'.`, 404);
                return;
            }
            const updateRes = await db_1.pool.query(`UPDATE public.users 
         SET role = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, name, email, avatar_url, role, COALESCE(status, 'active') as status, created_at, updated_at`, [role, id]);
            (0, response_1.sendSuccess)(res, updateRes.rows[0]);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * PATCH /api/admin/users/:id/status
     * Khóa (banned) hoặc kích hoạt lại (active) tài khoản người dùng
     * Thay thế cho DELETE – không xóa dữ liệu, chỉ tắt quyền đăng nhập
     */
    async updateUserStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!status || (status !== "active" && status !== "banned")) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Trạng thái (status) không hợp lệ. Chỉ chấp nhận 'active' hoặc 'banned'.", 422);
                return;
            }
            // Admin không thể tự khóa chính mình
            if (req.user?.id === id && status === "banned") {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Bạn không thể tự khóa tài khoản của chính mình.", 422);
                return;
            }
            const userCheck = await db_1.pool.query("SELECT id, name, email, role, COALESCE(status, 'active') as status FROM public.users WHERE id = $1", [id]);
            if (userCheck.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", `Không tìm thấy người dùng với id '${id}'.`, 404);
                return;
            }
            const updateRes = await db_1.pool.query(`UPDATE public.users 
         SET status = $1, updated_at = NOW() 
         WHERE id = $2 
         RETURNING id, name, email, avatar_url, role, COALESCE(status, 'active') as status, created_at, updated_at`, [status, id]);
            const action = status === "banned" ? "khóa" : "kích hoạt lại";
            (0, response_1.sendSuccess)(res, {
                ...updateRes.rows[0],
                message: `Đã ${action} tài khoản '${userCheck.rows[0].name}' thành công.`,
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * GET /api/admin/reviews
     * Lấy danh sách đánh giá từ du khách để kiểm duyệt
     */
    async getReviews(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
            const offset = (page - 1) * limit;
            const countRes = await db_1.pool.query("SELECT count(*)::int as total FROM public.reviews");
            const total = countRes.rows[0]?.total || 0;
            const reviewsRes = await db_1.pool.query(`SELECT r.id, r.place_id, p.name as place_name, r.author_name, r.rating, r.comment, r.images, r.created_at
         FROM public.reviews r
         LEFT JOIN public.places p ON r.place_id = p.id
         ORDER BY r.created_at DESC
         LIMIT $1 OFFSET $2`, [limit, offset]);
            (0, response_1.sendSuccess)(res, {
                items: reviewsRes.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * DELETE /api/admin/reviews/:id
     * Xóa đánh giá không phù hợp hoặc spam
     */
    async deleteReview(req, res, next) {
        try {
            const { id } = req.params;
            const reviewCheck = await db_1.pool.query("SELECT id FROM public.reviews WHERE id = $1", [id]);
            if (reviewCheck.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", `Không tìm thấy đánh giá '${id}'.`, 404);
                return;
            }
            await db_1.pool.query("DELETE FROM public.reviews WHERE id = $1", [id]);
            (0, response_1.sendSuccess)(res, {
                id,
                deleted: true,
                message: "Đã xóa đánh giá thành công.",
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * GET /api/admin/itineraries
     * Lấy danh sách toàn bộ lộ trình trong hệ thống (cả riêng tư và công khai) phục vụ quản trị
     */
    async getItineraries(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
            const offset = (page - 1) * limit;
            const { q, isPublic } = req.query;
            const whereClauses = [];
            const values = [];
            let idx = 1;
            if (q && typeof q === "string" && q.trim()) {
                whereClauses.push(`(i.title ILIKE $${idx} OR i.summary ILIKE $${idx} OR u.name ILIKE $${idx})`);
                values.push(`%${q.trim()}%`);
                idx++;
            }
            if (isPublic !== undefined && isPublic !== "") {
                whereClauses.push(`i.is_public = $${idx}`);
                values.push(isPublic === "true");
                idx++;
            }
            const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
            const countRes = await db_1.pool.query(`SELECT count(*)::int as total FROM public.itineraries i LEFT JOIN public.users u ON i.user_id = u.id ${whereSql}`, values);
            const total = countRes.rows[0]?.total || 0;
            const listRes = await db_1.pool.query(`SELECT 
           i.*,
           u.name as author_name,
           u.email as author_email,
           u.avatar_url as author_avatar,
           (i.end_date - i.start_date + 1) as days_count,
           (SELECT count(*)::int FROM public.itinerary_comments c WHERE c.itinerary_id = i.id) as comments_count
         FROM public.itineraries i
         LEFT JOIN public.users u ON i.user_id = u.id
         ${whereSql}
         ORDER BY i.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`, [...values, limit, offset]);
            (0, response_1.sendSuccess)(res, {
                items: listRes.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * PATCH /api/admin/itineraries/:id/visibility
     * Admin bật/tắt quyền hiển thị công khai lộ trình (hạ quyền công khai nếu vi phạm tiêu chuẩn)
     */
    async toggleItineraryVisibility(req, res, next) {
        try {
            const { id } = req.params;
            const { isPublic } = req.body;
            if (typeof isPublic !== "boolean") {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Tham số isPublic phải là true hoặc false.", 422);
                return;
            }
            const check = await db_1.pool.query("SELECT id, title FROM public.itineraries WHERE id = $1", [id]);
            if (check.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", "Không tìm thấy lịch trình.", 404);
                return;
            }
            const updateRes = await db_1.pool.query("UPDATE public.itineraries SET is_public = $1, updated_at = NOW() WHERE id = $2 RETURNING *", [isPublic, id]);
            (0, response_1.sendSuccess)(res, {
                itinerary: updateRes.rows[0],
                message: isPublic
                    ? "Đã cho phép lộ trình hiển thị công khai trên cộng đồng."
                    : "Đã chuyển lộ trình về chế độ riêng tư (ẩn khỏi cộng đồng).",
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * DELETE /api/admin/itineraries/:id
     * Admin xóa lộ trình vi phạm
     */
    async deleteItinerary(req, res, next) {
        try {
            const { id } = req.params;
            const check = await db_1.pool.query("SELECT id, title FROM public.itineraries WHERE id = $1", [id]);
            if (check.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", "Không tìm thấy lịch trình.", 404);
                return;
            }
            await db_1.pool.query("DELETE FROM public.itineraries WHERE id = $1", [id]);
            (0, response_1.sendSuccess)(res, {
                id,
                deleted: true,
                message: `Đã xóa lịch trình "${check.rows[0].title}" thành công.`,
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * GET /api/admin/itinerary-comments
     * Lấy danh sách toàn bộ nhận xét và đánh giá sao lộ trình cộng đồng
     */
    async getItineraryComments(req, res, next) {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
            const offset = (page - 1) * limit;
            const countRes = await db_1.pool.query("SELECT count(*)::int as total FROM public.itinerary_comments");
            const total = countRes.rows[0]?.total || 0;
            const commentsRes = await db_1.pool.query(`SELECT 
           c.id,
           c.itinerary_id,
           i.title as itinerary_title,
           c.content,
           c.rating,
           c.created_at,
           u.name as user_name,
           u.email as user_email,
           u.avatar_url as user_avatar
         FROM public.itinerary_comments c
         LEFT JOIN public.itineraries i ON c.itinerary_id = i.id
         LEFT JOIN public.users u ON c.user_id = u.id
         ORDER BY c.created_at DESC
         LIMIT $1 OFFSET $2`, [limit, offset]);
            (0, response_1.sendSuccess)(res, {
                items: commentsRes.rows,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * DELETE /api/admin/itinerary-comments/:id
     * Admin xóa nhận xét lộ trình vi phạm hoặc spam
     */
    async deleteItineraryComment(req, res, next) {
        try {
            const { id } = req.params;
            const check = await db_1.pool.query("SELECT id, itinerary_id FROM public.itinerary_comments WHERE id = $1", [id]);
            if (check.rows.length === 0) {
                (0, response_1.sendError)(res, "NOT_FOUND", "Không tìm thấy bình luận này.", 404);
                return;
            }
            const itineraryId = check.rows[0].itinerary_id;
            await db_1.pool.query("DELETE FROM public.itinerary_comments WHERE id = $1", [id]);
            // Tính lại điểm trung bình
            await db_1.pool.query(`UPDATE public.itineraries
         SET rating = (
           SELECT ROUND(AVG(rating)::numeric, 1)
           FROM public.itinerary_comments
           WHERE itinerary_id = $1 AND rating IS NOT NULL
         )
         WHERE id = $1`, [itineraryId]);
            (0, response_1.sendSuccess)(res, {
                id,
                deleted: true,
                message: "Đã xóa nhận xét lộ trình thành công.",
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * GET /api/admin/logs
     * Lấy lịch sử các requests gọi vào hệ thống (HTTP API Requests Log)
     */
    async getLogs(req, res, next) {
        try {
            const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
            const method = req.query.method;
            const statusCode = req.query.statusCode ? parseInt(req.query.statusCode, 10) : undefined;
            const logs = logger_middleware_1.RequestLogStore.getLogs(limit, method, statusCode);
            const stats = logger_middleware_1.RequestLogStore.getStats();
            (0, response_1.sendSuccess)(res, {
                items: logs,
                stats,
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * GET /api/admin/places/export-csv
     * Xuất danh sách địa điểm ra định dạng CSV có BOM UTF-8
     */
    async exportPlacesCSV(req, res, next) {
        try {
            const { q, category, status } = req.query;
            const whereClauses = [];
            const values = [];
            let idx = 1;
            if (q && typeof q === "string" && q.trim()) {
                whereClauses.push(`(name ILIKE $${idx} OR address ILIKE $${idx} OR description ILIKE $${idx})`);
                values.push(`%${q.trim()}%`);
                idx++;
            }
            if (category && typeof category === "string" && category.trim()) {
                whereClauses.push(`category = $${idx}`);
                values.push(category.trim());
                idx++;
            }
            if (status && typeof status === "string" && status.trim() && status !== "all") {
                whereClauses.push(`status = $${idx}`);
                values.push(status.trim());
                idx++;
            }
            const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
            const query = `
        SELECT 
          id, name, category, lat, lng, address, price, is_local,
          opening_hours, estimated_duration_minutes, best_time_to_visit,
          rating, description, image_url, status, notes, created_at
        FROM public.places
        ${whereSQL}
        ORDER BY created_at DESC
      `;
            const result = await db_1.pool.query(query, values);
            const rows = result.rows;
            // Chuẩn bị header CSV
            const headers = [
                "id",
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
                "status",
                "notes",
            ];
            const escapeCSV = (str) => {
                if (str === null || str === undefined)
                    return "";
                let val = String(str);
                if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                return val;
            };
            const csvLines = [headers.join(",")];
            for (const row of rows) {
                const line = headers.map((h) => escapeCSV(row[h])).join(",");
                csvLines.push(line);
            }
            // BOM UTF-8 (\uFEFF) giúp Excel tự động nhận diện ký tự tiếng Việt có dấu
            const csvContent = "\uFEFF" + csvLines.join("\r\n");
            const filename = `places_export_${new Date().toISOString().slice(0, 10)}.csv`;
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
            res.status(200).send(csvContent);
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * POST /api/admin/places/import-csv/preview
     * Kiểm tra trước tính hợp lệ và phát hiện trùng khớp khi import file CSV
     */
    async previewImportCSV(req, res, next) {
        try {
            const { items } = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Danh sách dữ liệu tải lên trống hoặc không đúng định dạng.", 422);
                return;
            }
            // Lấy toàn bộ danh sách địa điểm hiện có để so sánh trùng khớp
            const existingPlacesRes = await db_1.pool.query("SELECT id, LOWER(TRIM(name)) as norm_name, lat, lng, address FROM public.places");
            const existingPlaces = existingPlacesRes.rows;
            // Tạo map tra cứu nhanh
            const idMap = new Set(existingPlaces.map((p) => p.id));
            const nameMap = new Map();
            for (const p of existingPlaces) {
                if (p.norm_name)
                    nameMap.set(p.norm_name, p.id);
            }
            const validatedItems = [];
            let validCount = 0;
            let duplicateCount = 0;
            let errorCount = 0;
            // Danh sách theo dõi trùng lặp nội bộ trong cùng file CSV
            const batchIds = new Set();
            const batchNames = new Set();
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const rowNum = i + 1;
                const name = (item.name || "").trim();
                const category = (item.category || "").trim();
                const rawLat = item.lat;
                const rawLng = item.lng;
                const numLat = Number(rawLat);
                const numLng = Number(rawLng);
                const errors = [];
                let isDuplicate = false;
                let duplicateReason = "";
                let matchedPlaceId = null;
                // 1. Kiểm tra bắt buộc tên
                if (!name) {
                    errors.push("Thiếu tên địa điểm");
                }
                // 2. Kiểm tra bắt buộc category
                if (!category) {
                    errors.push("Thiếu danh mục (category)");
                }
                // 3. Kiểm tra tọa độ
                if (isNaN(numLat) || isNaN(numLng)) {
                    errors.push("Tọa độ lat/lng không hợp lệ hoặc để trống");
                }
                else if (numLat < 15.0 || numLat > 18.0 || numLng < 106.0 || numLng > 109.0) {
                    errors.push("Tọa độ nằm ngoài phạm vi tỉnh Thừa Thiên Huế (15.0-18.0, 106.0-109.0)");
                }
                // 3.1. Kiểm tra rating nếu có
                if (item.rating !== undefined && item.rating !== "" && !isNaN(Number(item.rating))) {
                    const r = Number(item.rating);
                    if (r < 0 || r > 5.0) {
                        errors.push(`Đánh giá (rating) phải từ 0 đến 5.0 (giá trị hiện tại: ${item.rating})`);
                    }
                }
                // 3.2. Kiểm tra giá vé nếu có
                if (item.price !== undefined && item.price !== "" && !isNaN(Number(item.price))) {
                    const p = Number(item.price);
                    if (p < 0) {
                        errors.push(`Giá vé không được âm (giá trị hiện tại: ${item.price})`);
                    }
                }
                // 4. Kiểm tra trùng ID hoặc Tên trong hệ thống
                const normName = name.toLowerCase();
                let proposedId = item.id ? slugify(item.id) : slugify(name);
                if (item.id && idMap.has(item.id)) {
                    isDuplicate = true;
                    duplicateReason = `Trùng ID đã có trong hệ thống (${item.id})`;
                    matchedPlaceId = item.id;
                }
                else if (nameMap.has(normName)) {
                    isDuplicate = true;
                    duplicateReason = `Trùng tên với địa điểm đã tồn tại (${nameMap.get(normName)})`;
                    matchedPlaceId = nameMap.get(normName) || null;
                }
                else if (batchNames.has(normName)) {
                    isDuplicate = true;
                    duplicateReason = "Trùng tên với một dòng khác trong cùng tệp CSV này";
                }
                else {
                    // 5. Kiểm tra khoảng cách tọa độ xem có quá sát vị trí hiện có không (< ~35 mét)
                    if (!isNaN(numLat) && !isNaN(numLng)) {
                        const nearby = existingPlaces.find((p) => {
                            const dLat = Math.abs(p.lat - numLat);
                            const dLng = Math.abs(p.lng - numLng);
                            return dLat < 0.0003 && dLng < 0.0003;
                        });
                        if (nearby) {
                            isDuplicate = true;
                            duplicateReason = `Tọa độ trùng sát với địa điểm '${nearby.id}' (cách < 35m)`;
                            matchedPlaceId = nearby.id;
                        }
                    }
                }
                if (normName)
                    batchNames.add(normName);
                if (item.id)
                    batchIds.add(item.id);
                if (errors.length > 0) {
                    errorCount++;
                }
                else if (isDuplicate) {
                    duplicateCount++;
                }
                else {
                    validCount++;
                }
                validatedItems.push({
                    rowNum,
                    ...item,
                    name,
                    category,
                    lat: numLat,
                    lng: numLng,
                    isValid: errors.length === 0,
                    errors,
                    isDuplicate,
                    duplicateReason,
                    matchedPlaceId,
                });
            }
            (0, response_1.sendSuccess)(res, {
                total: items.length,
                validCount,
                duplicateCount,
                errorCount,
                items: validatedItems,
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * POST /api/admin/places/import-csv
     * Thực hiện lưu các địa điểm từ CSV vào Database theo chiến lược xử lý trùng
     */
    async importPlacesCSV(req, res, next) {
        try {
            const { items, duplicateStrategy = "skip" } = req.body;
            // duplicateStrategy: "skip" (bỏ qua bản ghi trùng) | "overwrite" (cập nhật bản ghi trùng)
            if (!Array.isArray(items) || items.length === 0) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Không có dữ liệu để thực hiện nhập.", 422);
                return;
            }
            const created_by = req.user?.id || null;
            let insertedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;
            const errors = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const rowNum = item.rowNum || i + 1;
                const name = (item.name || "").trim();
                const category = (item.category || "").trim();
                const numLat = Number(item.lat);
                const numLng = Number(item.lng);
                if (!name || !category || isNaN(numLat) || isNaN(numLng)) {
                    errors.push({ rowNum, name: name || "Không tên", error: "Dữ liệu thiếu hoặc tọa độ không hợp lệ" });
                    continue;
                }
                // Tìm xem bản ghi có tồn tại chưa
                let targetId = item.id ? slugify(item.id) : slugify(name);
                if (!targetId)
                    targetId = `place-${Date.now()}-${i}`;
                let matchedId = item.matchedPlaceId || null;
                if (!matchedId) {
                    const matchCheck = await db_1.pool.query("SELECT id FROM public.places WHERE id = $1 OR LOWER(TRIM(name)) = LOWER($2) LIMIT 1", [targetId, name]);
                    if (matchCheck.rows.length > 0) {
                        matchedId = matchCheck.rows[0].id;
                    }
                }
                if (matchedId) {
                    if (duplicateStrategy === "skip") {
                        skippedCount++;
                        continue;
                    }
                    else if (duplicateStrategy === "overwrite") {
                        // Safe parse số
                        const safePrice = item.price !== undefined && item.price !== "" && !isNaN(Number(item.price)) ? Math.max(0, Number(item.price)) : null;
                        const safeDuration = item.estimated_duration_minutes !== undefined && item.estimated_duration_minutes !== "" && !isNaN(Number(item.estimated_duration_minutes)) ? Math.max(1, Math.round(Number(item.estimated_duration_minutes))) : null;
                        let safeRating = null;
                        if (item.rating !== undefined && item.rating !== "" && !isNaN(Number(item.rating))) {
                            const r = Number(item.rating);
                            safeRating = Math.min(5.0, Math.max(0.0, Math.round(r * 100) / 100));
                        }
                        const safeIsLocal = item.is_local !== undefined && item.is_local !== "" ? (item.is_local === true || String(item.is_local).toLowerCase() === "true" || item.is_local === 1 || item.is_local === "1") : null;
                        // Cập nhật bản ghi hiện có
                        await db_1.pool.query(`UPDATE public.places SET
                name = $1,
                category = $2,
                lat = $3,
                lng = $4,
                address = COALESCE($5, address),
                price = COALESCE($6, price),
                is_local = COALESCE($7, is_local),
                opening_hours = COALESCE($8, opening_hours),
                estimated_duration_minutes = COALESCE($9, estimated_duration_minutes),
                best_time_to_visit = COALESCE($10, best_time_to_visit),
                rating = COALESCE($11, rating),
                description = COALESCE($12, description),
                image_url = COALESCE($13, image_url),
                notes = COALESCE($14, notes),
                status = COALESCE($15, status),
                updated_at = NOW()
              WHERE id = $16`, [
                            name,
                            category,
                            numLat,
                            numLng,
                            (item.address || "").trim() || null,
                            safePrice,
                            safeIsLocal,
                            (item.opening_hours || "").trim() || null,
                            safeDuration,
                            (item.best_time_to_visit || "").trim() || null,
                            safeRating,
                            (item.description || "").trim() || null,
                            (item.image_url || "").trim() || null,
                            (item.notes || "").trim() || null,
                            item.status ? String(item.status).trim() : null,
                            matchedId,
                        ]);
                        updatedCount++;
                        continue;
                    }
                }
                // Nếu không trùng, tạo mới ID độc nhất
                let finalId = targetId;
                const existCheck = await db_1.pool.query("SELECT id FROM public.places WHERE id = $1", [finalId]);
                if (existCheck.rows.length > 0) {
                    finalId = `${finalId}-${Date.now().toString().slice(-4)}`;
                }
                const imgUrl = (item.image_url || "").trim() || null;
                const safePrice = item.price !== undefined && item.price !== "" && !isNaN(Number(item.price)) ? Math.max(0, Number(item.price)) : 0;
                const safeDuration = item.estimated_duration_minutes !== undefined && item.estimated_duration_minutes !== "" && !isNaN(Number(item.estimated_duration_minutes)) ? Math.max(1, Math.round(Number(item.estimated_duration_minutes))) : 60;
                let safeRating = 4.5;
                if (item.rating !== undefined && item.rating !== "" && !isNaN(Number(item.rating))) {
                    const r = Number(item.rating);
                    safeRating = Math.min(5.0, Math.max(0.0, Math.round(r * 100) / 100));
                }
                const safeIsLocal = item.is_local === true || String(item.is_local).toLowerCase() === "true" || item.is_local === 1 || item.is_local === "1";
                await db_1.pool.query(`INSERT INTO public.places (
            id, name, category, lat, lng, address, price, is_local,
            opening_hours, estimated_duration_minutes, best_time_to_visit,
            rating, description, image_url, images, highlights, notes,
            status, created_by, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16, $17,
            $18, $19, NOW(), NOW()
          )`, [
                    finalId,
                    name,
                    category,
                    numLat,
                    numLng,
                    (item.address || "").trim() || "",
                    safePrice,
                    safeIsLocal,
                    (item.opening_hours || "").trim() || "",
                    safeDuration,
                    (item.best_time_to_visit || "").trim() || "",
                    safeRating,
                    (item.description || "").trim() || "",
                    imgUrl,
                    imgUrl ? [imgUrl] : [],
                    item.highlights ? (Array.isArray(item.highlights) ? item.highlights : [item.highlights]) : [],
                    (item.notes || "").trim() || "",
                    item.status || "approved",
                    created_by,
                ]);
                insertedCount++;
            }
            (0, response_1.sendSuccess)(res, {
                totalProcessed: items.length,
                insertedCount,
                updatedCount,
                skippedCount,
                errorCount: errors.length,
                errors,
                message: `Đã xử lý xong: thêm mới ${insertedCount}, cập nhật ${updatedCount}, bỏ qua ${skippedCount}, lỗi ${errors.length}.`,
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * DELETE /api/admin/logs
     * Xóa sạch log hiện tại trong bộ nhớ
     */
    async clearLogs(_req, res, next) {
        try {
            logger_middleware_1.RequestLogStore.clearLogs();
            (0, response_1.sendSuccess)(res, { message: "Đã xóa toàn bộ nhật ký requests." });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * GET /api/admin/ai-settings
     * Lấy cấu hình model và tham số của AI tư vấn
     */
    async getAISettings(_req, res, next) {
        try {
            const config = await settings_model_1.SettingsModel.getAIConfig();
            const zenApiKey = process.env.OPENCODE_ZEN_API_KEY || "";
            const geminiApiKey = config.geminiApiKey || process.env.GEMINI_API_KEY || "";
            const maskKey = (key) => key ? `${key.slice(0, 7)}...${key.slice(-4)}` : "CHƯA_CẤU_HÌNH";
            (0, response_1.sendSuccess)(res, {
                config: {
                    ...config,
                    geminiApiKey: geminiApiKey ? maskKey(geminiApiKey) : "",
                },
                defaultConfig: settings_model_1.DEFAULT_AI_CONFIG,
                apiKeyStatus: {
                    gemini: {
                        configured: !!geminiApiKey,
                        maskedKey: maskKey(geminiApiKey),
                    },
                    zen: {
                        configured: !!zenApiKey,
                        maskedKey: maskKey(zenApiKey),
                    },
                },
                supportedPresets: [
                    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Google AI Studio - Miễn phí, Ổn định & Nhanh)", provider: "google" },
                    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash (Google AI Studio - Thế hệ mới)", provider: "google" },
                    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Google AI Studio - Ngữ cảnh siêu sâu)", provider: "google" },
                    { id: "big-pickle", name: "Big Pickle (OpenCode Zen)", provider: "opencode-zen" },
                    { id: "gpt-4o-mini", name: "GPT-4o Mini (OpenCode Zen)", provider: "opencode-zen" },
                    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet (OpenCode Zen)", provider: "opencode-zen" },
                ],
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * PUT /api/admin/ai-settings
     * Cập nhật model và tham số của AI tư vấn
     */
    async updateAISettings(req, res, next) {
        try {
            const { model, temperature, maxTokens, customInstruction, provider, geminiApiKey } = req.body || {};
            if (model !== undefined && (typeof model !== "string" || !model.trim())) {
                (0, response_1.sendError)(res, "VALIDATION_ERROR", "Tên model không được để trống.", 422);
                return;
            }
            if (temperature !== undefined) {
                const temp = Number(temperature);
                if (isNaN(temp) || temp < 0 || temp > 1.0) {
                    (0, response_1.sendError)(res, "VALIDATION_ERROR", "Nhiệt độ (temperature) phải từ 0.0 đến 1.0.", 422);
                    return;
                }
            }
            if (maxTokens !== undefined) {
                const tokens = Number(maxTokens);
                if (isNaN(tokens) || tokens < 512 || tokens > 16384) {
                    (0, response_1.sendError)(res, "VALIDATION_ERROR", "Số lượng tokens (maxTokens) phải từ 512 đến 16384.", 422);
                    return;
                }
            }
            // Nếu truyền geminiApiKey là dạng masked (ví dụ AIzaSy...xxxx) thì không ghi đè giá trị cũ
            let keyToSave = undefined;
            if (typeof geminiApiKey === "string") {
                const trimmed = geminiApiKey.trim();
                if (!trimmed.includes("...")) {
                    keyToSave = trimmed;
                }
            }
            const updated = await settings_model_1.SettingsModel.saveAIConfig({
                model: model ? model.trim() : undefined,
                temperature: temperature !== undefined ? Number(temperature) : undefined,
                maxTokens: maxTokens !== undefined ? Number(maxTokens) : undefined,
                customInstruction: typeof customInstruction === "string" ? customInstruction : undefined,
                provider: typeof provider === "string" ? provider.trim() : undefined,
                geminiApiKey: keyToSave,
            });
            (0, response_1.sendSuccess)(res, {
                config: updated,
                message: "Cập nhật cấu hình model AI tư vấn thành công!",
            });
        }
        catch (error) {
            next(error);
        }
    },
    /**
     * POST /api/admin/ai-settings/test
     * Gửi request kiểm tra khả năng phản hồi của model được chọn
     */
    async testAIModel(req, res, next) {
        try {
            const { model, temperature, provider, geminiApiKey } = req.body || {};
            const currentConfig = await settings_model_1.SettingsModel.getAIConfig();
            const rawModel = (typeof model === "string" && model.trim()) ? model.trim() : currentConfig.model;
            const testModel = (0, settings_model_1.normalizeModelName)(rawModel);
            const testTemp = typeof temperature === "number" ? temperature : 0.4;
            const testProvider = typeof provider === "string" ? provider.trim() : (testModel.includes("gemini") ? "google" : currentConfig.provider);
            const effectiveGeminiKey = (typeof geminiApiKey === "string" && geminiApiKey.trim() && !geminiApiKey.includes("..."))
                ? geminiApiKey.trim()
                : currentConfig.geminiApiKey;
            const startTime = Date.now();
            const testMessages = [
                {
                    role: "system",
                    content: "Bạn là AI tư vấn viên du lịch của ứng dụng HueDiMo. Hãy trả về JSON ngắn gọn: {\"status\":\"ok\",\"reply\":\"lời chào 1 câu giới thiệu về Huế\"}",
                },
                {
                    role: "user",
                    content: "Kiểm tra kết nối và khả năng sinh lịch trình du lịch Huế.",
                },
            ];
            const result = await (0, itinerary_service_1.callAI)({
                provider: testProvider,
                model: testModel,
                geminiApiKey: effectiveGeminiKey,
                temperature: testTemp,
                maxTokens: 512,
            }, testMessages);
            const latencyMs = Date.now() - startTime;
            if (!result.ok) {
                (0, response_1.sendError)(res, "UPSTREAM_ERROR", `Model "${testModel}" phản hồi thất bại: Mã HTTP ${result.status || "timeout"}${result.error ? ` (${result.error})` : ""}.`, 502);
                return;
            }
            (0, response_1.sendSuccess)(res, {
                modelUsed: result.modelUsed,
                latencyMs,
                responseSample: result.text,
                message: `Kết nối thành công tới model "${result.modelUsed}" (${latencyMs}ms)!`,
            });
        }
        catch (error) {
            next(error);
        }
    },
};
