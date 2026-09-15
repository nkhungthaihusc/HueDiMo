"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const db_1 = require("../config/db");
const response_1 = require("../utils/response");
const logger_middleware_1 = require("../middleware/logger.middleware");
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
};
