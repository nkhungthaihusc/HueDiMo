"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const auth_service_1 = require("../services/auth.service");
const app_1 = __importDefault(require("../app"));
const http_1 = __importDefault(require("http"));
async function runTests() {
    console.log("=== BẮT ĐẦU KIỂM THỬ BẢO MẬT & API ADMIN ===");
    const server = http_1.default.createServer(app_1.default);
    await new Promise((resolve) => server.listen(0, resolve));
    const address = server.address();
    const baseUrl = `http://localhost:${address.port}`;
    let passed = 0;
    let failed = 0;
    async function assertCase(name, fn) {
        try {
            const ok = await fn();
            if (ok) {
                console.log(`✅ PASS: ${name}`);
                passed++;
            }
            else {
                console.error(`❌ FAIL: ${name}`);
                failed++;
            }
        }
        catch (e) {
            console.error(`❌ ERROR: ${name}`, e);
            failed++;
        }
    }
    // Tokens
    const userToken = (await auth_service_1.AuthService.generateTokens({
        id: "2b9b26ab-221f-4298-a549-a59ceb45a91a",
        email: "test_1788934879025@huedimo.example.com",
        name: "User Normal",
        role: "user",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        avatar_url: "",
    })).accessToken;
    const adminToken = (await auth_service_1.AuthService.generateTokens({
        id: "77c414a0-65e2-44a4-8707-75b9e94258ad",
        email: "admin@huedimo.vn",
        name: "HueDiMo Administrator",
        role: "admin",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        avatar_url: "",
    })).accessToken;
    // 1. Chặn request không có token (401)
    await assertCase("Từ chối truy cập /api/admin/stats khi không có Token (401)", async () => {
        const res = await fetch(`${baseUrl}/api/admin/stats`);
        const json = await res.json();
        return res.status === 401 && json.error?.code === "UNAUTHORIZED";
    });
    // 2. Chặn request có token role 'user' (403)
    await assertCase("Từ chối truy cập /api/admin/stats khi có role 'user' (403 Forbidden)", async () => {
        const res = await fetch(`${baseUrl}/api/admin/stats`, {
            headers: { Authorization: `Bearer ${userToken}` },
        });
        const json = await res.json();
        return res.status === 403 && json.error?.code === "FORBIDDEN";
    });
    // 3. Cho phép request khi role 'admin' (200)
    await assertCase("Cấp phép truy cập /api/admin/stats khi có role 'admin' (200 OK)", async () => {
        const res = await fetch(`${baseUrl}/api/admin/stats`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const json = await res.json();
        return (res.status === 200 &&
            json.data?.overview?.totalPlaces > 0 &&
            Array.isArray(json.data?.categoryDistribution));
    });
    // 4. Lấy danh sách địa điểm phân trang
    await assertCase("Lấy danh sách địa điểm /api/admin/places (200 OK)", async () => {
        const res = await fetch(`${baseUrl}/api/admin/places?limit=5`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const json = await res.json();
        return res.status === 200 && json.data?.items?.length > 0 && json.data?.pagination?.total > 0;
    });
    // 5. Thử tạo địa điểm mới với validation coordinates
    const testPlaceId = `test-admin-place-${Date.now()}`;
    await assertCase("Tạo địa điểm mới hợp lệ /api/admin/places (201 Created)", async () => {
        const res = await fetch(`${baseUrl}/api/admin/places`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
                id: testPlaceId,
                name: "Địa điểm Test Quản Trị",
                category: "cultural",
                lat: 16.465,
                lng: 107.585,
                address: "Khu vực Hoàng Thành, TP Huế",
                price: 30000,
                description: "Mô tả kiểm thử chức năng admin",
            }),
        });
        const json = await res.json();
        return res.status === 201 && json.data?.id === testPlaceId;
    });
    // 6. Cập nhật địa điểm vừa tạo
    await assertCase("Cập nhật địa điểm /api/admin/places/:id (200 OK)", async () => {
        const res = await fetch(`${baseUrl}/api/admin/places/${testPlaceId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
                name: "Địa điểm Test Quản Trị - Đã Cập Nhật",
                price: 45000,
            }),
        });
        const json = await res.json();
        return res.status === 200 && json.data?.name === "Địa điểm Test Quản Trị - Đã Cập Nhật";
    });
    // 7. Xóa địa điểm kiểm thử
    await assertCase("Xóa địa điểm /api/admin/places/:id (200 OK)", async () => {
        const res = await fetch(`${baseUrl}/api/admin/places/${testPlaceId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const json = await res.json();
        return res.status === 200 && json.data?.deleted === true;
    });
    // 8. Lấy danh sách users
    await assertCase("Lấy danh sách người dùng /api/admin/users (200 OK)", async () => {
        const res = await fetch(`${baseUrl}/api/admin/users?limit=5`, {
            headers: { Authorization: `Bearer ${adminToken}` },
        });
        const json = await res.json();
        return res.status === 200 && Array.isArray(json.data?.items) && json.data.items.length > 0;
    });
    server.close();
    console.log(`\n=== TỔNG KẾT: ${passed} PASS, ${failed} FAIL ===`);
    if (failed > 0)
        process.exit(1);
    process.exit(0);
}
runTests().catch((e) => {
    console.error("Fatal test error:", e);
    process.exit(1);
});
