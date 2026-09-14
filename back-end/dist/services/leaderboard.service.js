"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaderboardService = void 0;
const db_1 = require("../config/db");
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
class LeaderboardService {
    /**
     * Lấy danh sách Top bảng xếp hạng du khách (sắp xếp theo điểm giảm dần, checkin_count giảm dần)
     */
    static async getTopUsers(limit = 20) {
        const res = await db_1.pool.query(`SELECT id, name, avatar_url, role, COALESCE(points, 0) as points, COALESCE(checkin_count, 0) as checkin_count
       FROM public.users
       ORDER BY points DESC, checkin_count DESC, created_at ASC
       LIMIT $1`, [limit]);
        return res.rows.map((row, index) => ({
            id: row.id,
            name: row.name,
            avatar_url: row.avatar_url || "",
            role: row.role,
            points: Number(row.points || 0),
            checkin_count: Number(row.checkin_count || 0),
            rank: index + 1,
        }));
    }
    /**
     * Thực hiện Check-in tại một địa điểm du lịch
     * Mỗi địa điểm check-in sẽ được tặng 100 điểm thưởng (khám phá)
     */
    static async checkin(userId, placeId, note, userLat, userLng) {
        const POINTS_PER_CHECKIN = 100;
        const MAX_CHECKIN_RADIUS_METERS = 550; // 500m + 50m buffer sai số GPS
        // 0. Kiểm tra vị trí địa lý nếu có tọa độ du khách gửi lên
        if (typeof userLat === "number" && typeof userLng === "number") {
            const placeRes = await db_1.pool.query(`SELECT id, name, lat, lng FROM public.places WHERE id = $1 LIMIT 1`, [placeId]);
            if (placeRes.rows.length > 0) {
                const p = placeRes.rows[0];
                if (p.lat && p.lng) {
                    const dist = calculateDistanceMeters(userLat, userLng, Number(p.lat), Number(p.lng));
                    if (dist > MAX_CHECKIN_RADIUS_METERS) {
                        const distKm = (dist / 1000).toFixed(1);
                        throw new Error(`LOCATION_TOO_FAR: Bạn đang cách ${p.name} khoảng ${distKm} km (${Math.round(dist)}m). Bạn cần có mặt trong bán kính 500m của địa điểm để có thể check-in!`);
                    }
                }
            }
        }
        // Kiểm tra xem trong ngày hôm nay đã check-in địa điểm này chưa (chống spam)
        const todayCheck = await db_1.pool.query(`SELECT id FROM public.checkins 
       WHERE user_id = $1 AND place_id = $2 AND created_at >= CURRENT_DATE`, [userId, placeId]);
        if (todayCheck.rows.length > 0) {
            throw new Error("ALREADY_CHECKED_IN: Bạn đã check-in địa điểm này trong ngày hôm nay rồi!");
        }
        const client = await db_1.pool.connect();
        try {
            await client.query("BEGIN");
            // 1. Thêm bản ghi check-in
            const checkinRes = await client.query(`INSERT INTO public.checkins (user_id, place_id, points_earned, note)
         VALUES ($1, $2, $3, $4)
         RETURNING id, created_at`, [userId, placeId, POINTS_PER_CHECKIN, note || null]);
            // 2. Tăng điểm và số lượt check-in của user
            const userRes = await client.query(`UPDATE public.users
         SET points = COALESCE(points, 0) + $1,
             checkin_count = COALESCE(checkin_count, 0) + 1,
             updated_at = NOW()
         WHERE id = $2
         RETURNING points, checkin_count`, [POINTS_PER_CHECKIN, userId]);
            await client.query("COMMIT");
            const userStats = userRes.rows[0] || { points: POINTS_PER_CHECKIN, checkin_count: 1 };
            return {
                checkinId: checkinRes.rows[0].id,
                placeId,
                pointsEarned: POINTS_PER_CHECKIN,
                totalPoints: Number(userStats.points),
                totalCheckins: Number(userStats.checkin_count),
                message: `Chúc mừng bạn đã check-in thành công và nhận được +${POINTS_PER_CHECKIN} điểm khám phá Huế! 🎉`,
            };
        }
        catch (error) {
            await client.query("ROLLBACK");
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Lấy danh sách ID các địa điểm người dùng đã check-in
     */
    static async getUserCheckins(userId) {
        const res = await db_1.pool.query(`SELECT DISTINCT place_id FROM public.checkins WHERE user_id = $1`, [userId]);
        return res.rows.map((r) => r.place_id);
    }
}
exports.LeaderboardService = LeaderboardService;
