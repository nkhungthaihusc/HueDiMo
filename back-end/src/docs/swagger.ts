export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "HueDiMo Travel API",
    version: "1.0.0",
    description: "Tài liệu API chuẩn OpenAPI/Swagger cho ứng dụng bản đồ du lịch Huế — HueDiMo. Cơ chế xác thực dùng cặp token: Access Token (hạn 15 phút) và Refresh Token (hạn 30 ngày) có xoay vòng (Token Rotation). Tuân thủ envelope `{ data: T }` và `{ error: { code, message, details? } }` theo skill `api-and-interface-design`.",
    contact: {
      name: "HueDiMo Team",
    },
  },
  servers: [
    {
      url: "http://localhost:3002",
      description: "Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Truyền Access Token (15 phút) theo định dạng: `Bearer <accessToken>`",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "string",
                example: "VALIDATION_ERROR",
                description: "Mã lỗi UPPER_SNAKE (VALIDATION_ERROR, UNAUTHORIZED, CONFLICT, NOT_FOUND, INTERNAL_ERROR)",
              },
              message: {
                type: "string",
                example: "Vui lòng nhập họ và tên.",
                description: "Thông điệp mô tả lỗi bằng tiếng Việt",
              },
              details: {
                type: "object",
                description: "Chi tiết lỗi bổ sung (nếu có)",
              },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "71c08796-03fc-4cb3-a5c7-8dc5f466b026" },
          name: { type: "string", example: "Nguyễn Văn A" },
          email: { type: "string", format: "email", example: "user@example.com" },
          avatar_url: { type: "string", example: "" },
          role: { type: "string", example: "user" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      AuthResponseData: {
        type: "object",
        properties: {
          data: {
            type: "object",
            properties: {
              user: { $ref: "#/components/schemas/User" },
              accessToken: {
                type: "string",
                description: "Access token JWT thời hạn 15 phút dùng để gọi các API cần đăng nhập",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              },
              accessTokenExpiresAt: {
                type: "string",
                format: "date-time",
                description: "Thời điểm hết hạn của Access Token (15 phút sau khi cấp)",
                example: "2026-09-09T14:19:26.000Z",
              },
              refreshToken: {
                type: "string",
                description: "Refresh token JWT thời hạn 30 ngày (1 tháng) dùng để xoay vòng lấy access token mới",
                example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
              },
              refreshTokenExpiresAt: {
                type: "string",
                format: "date-time",
                description: "Thời điểm hết hạn của Refresh Token (30 ngày sau khi cấp)",
                example: "2026-10-09T14:04:26.000Z",
              },
            },
          },
        },
      },
      RefreshTokenRequest: {
        type: "object",
        required: ["refreshToken"],
        properties: {
          refreshToken: {
            type: "string",
            description: "Refresh token 30 ngày đã cấp trước đó",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Nguyễn Văn A" },
          email: { type: "string", format: "email", example: "user@example.com" },
          password: { type: "string", minLength: 6, example: "MatKhau123@" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "user@example.com" },
          password: { type: "string", example: "MatKhau123@" },
        },
      },
      LogoutRequest: {
        type: "object",
        properties: {
          refreshToken: {
            type: "string",
            description: "Refresh token cần thu hồi (tùy chọn)",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
        },
      },
      Place: {
        type: "object",
        properties: {
          id: { type: "string", example: "dai-noi" },
          name: { type: "string", example: "Đại Nội Huế" },
          category: {
            type: "string",
            enum: ["ancient", "temple", "food", "hotel", "nature", "culture"],
            example: "ancient",
          },
          lat: { type: "number", example: 16.469 },
          lng: { type: "number", example: 107.5778 },
          rating: { type: "number", example: 4.8 },
          description: { type: "string", example: "Kinh thành Huế với hoàng cung, cổng Ngọ Môn." },
          price: { type: "number", example: 200000 },
          is_local: { type: "boolean", example: false },
          status: {
            type: "string",
            enum: ["pending", "approved", "rejected"],
            example: "approved",
            description: "Trạng thái phê duyệt của địa điểm: 'pending' (Chờ duyệt), 'approved' (Đã duyệt), 'rejected' (Từ chối)",
          },
          created_by: { type: "string", format: "uuid", nullable: true, example: "71c08796-03fc-4cb3-a5c7-8dc5f466b026" },
          created_at: { type: "string", format: "date-time", example: "2026-09-14T08:00:00.000Z" },
          image_url: { type: "string", nullable: true },
          images: {
            type: "array",
            items: { type: "string" },
            example: ["https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/places/sample.jpg"],
          },
          address: { type: "string", example: "Đường 23 Tháng 8, Phường Thuận Hòa, TP. Huế" },
          opening_hours: { type: "string", example: "08:00 - 17:30" },
          duration: { type: "string", example: "120 phút" },
          best_time: { type: "string", example: "morning" },
          highlights: {
            type: "array",
            items: { type: "string" },
            example: ["Ngọ Môn", "Điện Thái Hòa", "Tử Cấm Thành"],
          },
        },
      },
      ContributePlaceRequest: {
        type: "object",
        required: ["name", "category", "lat", "lng", "description"],
        properties: {
          name: { type: "string", example: "Làng Nón Tây Hồ" },
          category: {
            type: "string",
            enum: ["ancient", "temple", "food", "hotel", "nature", "culture"],
            example: "culture",
          },
          lat: { type: "number", example: 16.452 },
          lng: { type: "number", example: 107.618 },
          description: { type: "string", example: "Làng nghề làm nón bài thơ truyền thống nổi tiếng xứ Huế." },
          price: { type: "number", example: 0 },
          images: {
            type: "array",
            items: { type: "string" },
            example: ["https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/places/sample.jpg"],
          },
          address: { type: "string", example: "Xã Phú Hồ, Huyện Phú Vang, Thừa Thiên Huế" },
          openingHours: { type: "string", example: "07:00 - 18:00" },
          duration: { type: "string", example: "1 - 2 giờ" },
          bestTime: { type: "string", example: "morning" },
          highlights: { type: "array", items: { type: "string" }, example: ["Làm nón thủ công", "Check-in"] },
          notes: { type: "string", example: "Nên đến vào ban ngày để xem các nghệ nhân thao tác." },
        },
      },
      UpdatePlaceStatusRequest: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["approved", "rejected", "pending"],
            example: "approved",
            description: "Trạng thái mới: 'approved' (Duyệt đưa lên map), 'rejected' (Từ chối), 'pending' (Chờ xem xét)",
          },
        },
      },
    },
  },
  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Đăng ký tài khoản mới",
        description: "Tạo tài khoản người dùng, băm mật khẩu bcrypt và cấp cặp Access Token (15p) + Refresh Token (30 ngày).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Đăng ký thành công",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponseData" },
              },
            },
          },
          "409": {
            description: "Email đã được đăng ký",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "422": {
            description: "Dữ liệu không hợp lệ (sai định dạng email hoặc mật khẩu < 6 ký tự)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Đăng nhập",
        description: "Xác thực email và mật khẩu, cấp cặp Access Token (15p) + Refresh Token (30 ngày).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Đăng nhập thành công",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponseData" },
              },
            },
          },
          "401": {
            description: "Email hoặc mật khẩu không chính xác",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "422": {
            description: "Thiếu thông tin đăng nhập",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Xoay vòng Refresh Token (lấy Access Token mới)",
        description: "Khi Access Token (15 phút) hết hạn, gửi Refresh Token (30 ngày) vào đây để nhận cặp Access Token mới và Refresh Token mới (Refresh Token Rotation).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshTokenRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Cấp mới token thành công",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponseData" },
              },
            },
          },
          "401": {
            description: "Refresh token không hợp lệ, đã hết hạn hoặc bị thu hồi",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "422": {
            description: "Thiếu refresh token trong body",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Lấy thông tin tài khoản hiện tại",
        description: "Yêu cầu cung cấp Access Token (15 phút) qua header `Authorization: Bearer <accessToken>`.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Lấy thông tin thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Access token không hợp lệ hoặc đã hết hạn (Cần dùng /refresh)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/auth/profile": {
      patch: {
        tags: ["Authentication"],
        summary: "Cập nhật hồ sơ cá nhân",
        description: "Yêu cầu đăng nhập (Bearer Token). Cho phép người dùng cập nhật họ tên hiển thị và liên kết ảnh đại diện (avatar).",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Nguyễn Văn Huế" },
                  avatarUrl: { type: "string", example: "https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/avatars/sample.jpg" },
                  avatar_url: { type: "string", example: "https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/avatars/sample.jpg" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Cập nhật hồ sơ thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/User" },
                        message: { type: "string", example: "Cập nhật thông tin thành công!" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "422": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/auth/oauth-login": {
      post: {
        tags: ["Authentication"],
        summary: "Đăng nhập hoặc đăng ký bằng tài khoản mạng xã hội (Google, Facebook)",
        description: "Tiếp nhận thông tin tài khoản OAuth đã được xác thực từ client, tự động tạo mới người dùng nếu chưa có và cấp cặp Access Token (15p) + Refresh Token (30 ngày).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "name", "provider"],
                properties: {
                  email: { type: "string", format: "email", example: "user@gmail.com" },
                  name: { type: "string", example: "Lữ Khách Phương Xa" },
                  avatarUrl: { type: "string", example: "https://lh3.googleusercontent.com/a/sample" },
                  provider: { type: "string", enum: ["google", "facebook"], example: "google" },
                  providerId: { type: "string", example: "109823487123984" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Đăng nhập OAuth thành công",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponseData" },
              },
            },
          },
          "422": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Đăng xuất",
        description: "Hủy phiên làm việc và thu hồi Refresh Token trong cơ sở dữ liệu.",
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LogoutRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Đăng xuất thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string", example: "Đăng xuất thành công." },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/places": {
      get: {
        tags: ["Places"],
        summary: "Lấy danh sách địa điểm du lịch Huế (Đã được duyệt)",
        description: "Trả về toàn bộ các địa điểm du lịch công khai đã được Ban Quản Trị phê duyệt (`status = 'approved'`).",
        parameters: [
          {
            name: "category",
            in: "query",
            description: "Lọc theo thể loại: `ancient`, `temple`, `food`, `hotel`, `nature`, `culture`",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Danh sách địa điểm đã duyệt",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Place" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Places"],
        summary: "Đóng góp địa điểm du lịch mới (Chờ duyệt)",
        description: "Người dùng đăng nhập gửi thông tin đề xuất địa điểm du lịch mới. Địa điểm sẽ được lưu với trạng thái `pending` (Chờ duyệt), được ghim tạm thời trên bản đồ của chính tài khoản đó và chờ Ban Quản Trị phê duyệt trước khi hiển thị công khai cho toàn thể du khách.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ContributePlaceRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Đóng góp địa điểm thành công (Trạng thái: Chờ duyệt)",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        place: { $ref: "#/components/schemas/Place" },
                        message: { type: "string", example: "Đóng góp địa điểm thành công! Địa điểm sẽ được hiển thị công khai sau khi Ban Quản Trị phê duyệt." },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "422": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/places/my": {
      get: {
        tags: ["Places"],
        summary: "Lấy danh sách địa điểm do chính user đóng góp",
        description: "Yêu cầu đăng nhập. Trả về toàn bộ danh sách địa điểm do tài khoản hiện tại gửi lên hệ thống kèm theo trạng thái xét duyệt hiện tại (`pending` - Chờ duyệt, `approved` - Đã duyệt, `rejected` - Từ chối).",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Danh sách địa điểm của user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Place" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/places/search": {
      get: {

        tags: ["Places"],
        summary: "Tìm kiếm thông minh địa điểm (Top 5 kết quả)",
        description: "Tìm kiếm mờ (Fuzzy Search) hỗ trợ tiếng Việt có dấu lẫn không dấu theo tên, địa chỉ, mô tả, danh mục hoặc ghi chú. Ưu tiên điểm khớp cao nhất và rating.",
        parameters: [
          {
            name: "q",
            in: "query",
            description: "Từ khóa tìm kiếm (VD: `chùa`, `chua`, `bún bò`, `đại nội`)",
            schema: { type: "string" },
          },
          {
            name: "limit",
            in: "query",
            description: "Số lượng kết quả tối đa (mặc định: 5, tối đa: 20)",
            schema: { type: "integer", default: 5 },
          },
        ],
        responses: {
          "200": {
            description: "Danh sách 5 địa điểm phù hợp nhất",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Place" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/health": {

      get: {
        tags: ["System"],
        summary: "Kiểm tra sức khỏe hệ thống & kết nối DB",
        responses: {
          "200": {
            description: "Hệ thống hoạt động bình thường",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "ok" },
                        database: { type: "string", example: "connected" },
                        timestamp: { type: "string" },
                        totalPlaces: { type: "number", example: 10 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/admin/stats": {
      get: {
        tags: ["Admin"],
        summary: "Thống kê tổng quan hệ thống",
        description: "Yêu cầu quyền Quản trị viên (Bearer Token role 'admin').",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Thống kê tổng quan",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        overview: {
                          type: "object",
                          properties: {
                            totalPlaces: { type: "number" },
                            totalUsers: { type: "number" },
                            totalReviews: { type: "number" },
                            avgRating: { type: "number" },
                          },
                        },
                        categoryDistribution: { type: "array" },
                        recentPlaces: { type: "array" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/admin/places": {
      get: {
        tags: ["Admin"],
        summary: "Lấy danh sách địa điểm phục vụ quản trị (phân trang, tìm kiếm)",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Danh sách địa điểm" },
          "403": { description: "Yêu cầu quyền admin" },
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Thêm địa điểm du lịch mới",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "category", "lat", "lng"],
                properties: {
                  name: { type: "string", example: "Bảo tàng Cổ vật Cung đình Huế" },
                  category: { type: "string", example: "cultural" },
                  lat: { type: "number", example: 16.471 },
                  lng: { type: "number", example: 107.579 },
                  address: { type: "string", example: "03 Lê Trực, TP Huế" },
                  price: { type: "number", example: 50000 },
                  description: { type: "string", example: "Nơi lưu giữ các cổ vật triều Nguyễn." },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Thêm địa điểm thành công" },
          "422": { description: "Dữ liệu hoặc tọa độ không hợp lệ" },
        },
      },
    },
    "/api/admin/places/{id}": {
      put: {
        tags: ["Admin"],
        summary: "Cập nhật thông tin địa điểm",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Cập nhật thành công" },
          "404": { description: "Không tìm thấy địa điểm" },
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Xóa địa điểm du lịch",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Xóa thành công" },
          "404": { description: "Không tìm thấy địa điểm" },
        },
      },
    },
    "/api/admin/places/{id}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Phê duyệt hoặc từ chối địa điểm đóng góp ('approved' | 'rejected' | 'pending')",
        description: "Yêu cầu quyền admin. Thay đổi trạng thái kiểm duyệt của địa điểm: 'approved' (duyệt và đưa lên bản đồ công khai), 'rejected' (từ chối), hoặc 'pending' (chờ xem xét lại).",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" }, description: "ID địa điểm" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdatePlaceStatusRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Cập nhật trạng thái thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        place: { $ref: "#/components/schemas/Place" },
                        message: { type: "string", example: "Đã duyệt địa điểm lên hệ thống thành công!" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
          "404": { $ref: "#/components/schemas/ErrorResponse" },
          "422": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "Danh sách người dùng và phân quyền",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "role", in: "query", schema: { type: "string", enum: ["admin", "user"] } },
        ],
        responses: {
          "200": { description: "Danh sách người dùng" },
        },
      },
    },
    "/api/admin/users/{id}/role": {
      patch: {
        tags: ["Admin"],
        summary: "Cập nhật quyền hạn (Role) người dùng ('admin' | 'user')",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["admin", "user"], example: "admin" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Cập nhật vai trò thành công" },
          "422": { description: "Role không hợp lệ" },
        },
      },
    },
    "/api/admin/reviews": {
      get: {
        tags: ["Admin"],
        summary: "Danh sách đánh giá du khách",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": { description: "Danh sách đánh giá" },
        },
      },
    },
    "/api/admin/reviews/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Xóa đánh giá vi phạm",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Đã xóa đánh giá" },
        },
      },
    },
    "/api/admin/logs": {
      get: {
        tags: ["Admin"],
        summary: "Giám sát nhật ký HTTP Requests (Network Inspector)",
        description: "Lấy chi tiết toàn bộ các yêu cầu gọi tới hệ thống bao gồm: URL, Method, IP, User, Headers, Request Body, Response JSON và độ trễ mili-giây.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 50 }, description: "Số lượng log cần lấy" },
          { name: "method", in: "query", schema: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] } },
          { name: "statusCode", in: "query", schema: { type: "integer" }, description: "Lọc theo HTTP Status Code (200, 401, 403, 404, 500)" },
        ],
        responses: {
          "200": {
            description: "Danh sách log requests và thống kê hiệu năng",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        items: { type: "array" },
                        stats: {
                          type: "object",
                          properties: {
                            totalRequestsLogged: { type: "number" },
                            errorCount: { type: "number" },
                            avgLatencyMs: { type: "number" },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
      delete: {
        tags: ["Admin"],
        summary: "Xóa toàn bộ nhật ký HTTP Requests hiện tại",
        description: "Làm sạch bộ nhớ đệm lưu trữ log requests của hệ thống.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Đã xóa nhật ký thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string", example: "Đã xóa toàn bộ nhật ký requests." },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/upload": {

      post: {
        tags: ["Media & Storage"],
        summary: "Upload hình ảnh lên Supabase Storage (huedimo-media)",
        description: "Tiếp nhận file ảnh (đơn hoặc mảng tối đa 5 ảnh) qua multipart/form-data, tải trực tiếp lên bucket 'huedimo-media' và trả về Public CDN URL.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: {
                    type: "string",
                    format: "binary",
                    description: "1 file hình ảnh tải lên (JPEG, PNG, WEBP, GIF, HEIC; tối đa 10MB)",
                  },
                  files: {
                    type: "array",
                    items: {
                      type: "string",
                      format: "binary",
                    },
                    description: "Nhiều file ảnh tải lên cùng lúc (Tối đa 5 file)",
                  },
                  folder: {
                    type: "string",
                    example: "reviews",
                    description: "Thư mục lưu trữ: 'places', 'reviews', 'avatars', 'general'",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tải ảnh thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        url: { type: "string", example: "https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/reviews/17891234-abc123.jpg" },
                        urls: {
                          type: "array",
                          items: { type: "string" },
                          example: ["https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/reviews/17891234-abc123.jpg"],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Lỗi định dạng hoặc file quá lớn",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/places/{placeId}/reviews": {
      get: {
        tags: ["Places & Reviews"],
        summary: "Lấy danh sách đánh giá & hình ảnh của địa điểm",
        description: "Trả về toàn bộ các bài đánh giá, điểm số sao và danh sách link ảnh đã upload kèm review.",
        parameters: [
          {
            name: "placeId",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "dai-noi-hue",
            description: "ID của địa điểm du lịch",
          },
        ],
        responses: {
          "200": {
            description: "Danh sách đánh giá",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", example: "1" },
                          placeId: { type: "string", example: "dai-noi-hue" },
                          authorName: { type: "string", example: "Nguyễn Du Khách" },
                          rating: { type: "number", example: 5 },
                          comment: { type: "string", example: "Kiến trúc Đại Nội quá tráng lệ và cổ kính!" },
                          images: {
                            type: "array",
                            items: { type: "string" },
                            example: ["https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/reviews/sample.jpg"],
                          },
                          createdAt: { type: "string", example: "2026-09-11T09:00:00.000Z" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Places & Reviews"],
        summary: "Đăng đánh giá kèm ảnh cho địa điểm",
        description: "Người dùng gửi đánh giá cảm nhận, số sao và danh sách link ảnh đính kèm.",
        parameters: [
          {
            name: "placeId",
            in: "path",
            required: true,
            schema: { type: "string" },
            example: "dai-noi-hue",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["comment", "rating"],
                properties: {
                  authorName: { type: "string", example: "Trần Minh", description: "Tên người đánh giá (hoặc ẩn danh)" },
                  rating: { type: "number", minimum: 1, maximum: 5, example: 5 },
                  comment: { type: "string", example: "Cảnh hoàng hôn ở đây đẹp tuyệt vời, góc chụp ảnh rất đẹp!" },
                  images: {
                    type: "array",
                    items: { type: "string" },
                    example: ["https://vhyfauholmouikskxecp.supabase.co/storage/v1/object/public/huedimo-media/reviews/sample.jpg"],
                    description: "Danh sách URL ảnh đã tải lên qua /api/upload",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Đăng đánh giá thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        placeId: { type: "string" },
                        authorName: { type: "string" },
                        rating: { type: "number" },
                        comment: { type: "string" },
                        images: { type: "array", items: { type: "string" } },
                        createdAt: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "422": {
            description: "Lỗi dữ liệu gửi lên không hợp lệ",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/weather/rainfall": {
      get: {
        tags: ["Weather & Disaster Monitoring"],
        summary: "Dữ liệu lượng mưa tại các trạm đo Thừa Thiên Huế",
        description: "Truy vấn dữ liệu thời gian thực từ mạng lưới trạm đo mưa Vrain Huế kết hợp tập dữ liệu dự phòng nội bộ, tự động tính toán tổng hợp mức độ rủi ro ngập lụt.",
        responses: {
          "200": {
            description: "Dữ liệu lượng mưa và thống kê thời tiết",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        source: { type: "string", example: "live" },
                        updatedAt: { type: "string", format: "date-time" },
                        summary: { type: "object" },
                        stations: { type: "array", items: { type: "object" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/water-levels": {
      get: {
        tags: ["Weather & Disaster Monitoring"],
        summary: "Mực nước sông Hương và quan trắc ngập lụt đô thị",
        description: "Truy vấn hệ thống cảm biến thông minh Huế, đo mực nước các nhánh sông (Sông Hương, Dã Viên...) và các điểm cảnh báo ngập lụt 1.5m - 3m.",
        responses: {
          "200": {
            description: "Danh sách trạm quan trắc mực nước kèm thống kê rủi ro",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        count: { type: "number", example: 17 },
                        timestamp: { type: "string", format: "date-time" },
                        summary: { type: "object" },
                        stations: { type: "array", items: { type: "object" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/reverse-geocode": {
      get: {
        tags: ["Geocoding & Location"],
        summary: "Giải mã toạ độ GPS thành địa chỉ tại Huế",
        description: "Chuyển đổi toạ độ latitude và longitude thành tên đường, phường/xã, thành phố Huế với bộ đệm cache 15 phút và fallback đa tầng.",
        parameters: [
          {
            name: "lat",
            in: "query",
            required: true,
            description: "Vĩ độ (latitude, ví dụ: 16.4637)",
            schema: { type: "number" },
            example: 16.4637,
          },
          {
            name: "lng",
            in: "query",
            required: true,
            description: "Kinh độ (longitude, ví dụ: 107.5907)",
            schema: { type: "number" },
            example: 107.5907,
          },
        ],
        responses: {
          "200": {
            description: "Địa chỉ chi tiết tương ứng với toạ độ",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        address: { type: "string", example: "Hà Nội, P. Vĩnh Ninh, TP. Huế" },
                        road: { type: "string", example: "Hà Nội" },
                        ward: { type: "string", example: "P. Vĩnh Ninh" },
                        city: { type: "string", example: "TP. Huế" },
                        fullAddress: { type: "string" },
                        source: { type: "string", example: "nominatim" },
                        cached: { type: "boolean", example: false },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Toạ độ không hợp lệ",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/itinerary": {
      post: {
        tags: ["AI Itinerary Planner"],
        summary: "Lập lịch trình du lịch thông minh bằng AI",
        description: "Tạo lịch trình du lịch Huế tối ưu theo ngày, ngân sách, sở thích, phương tiện di chuyển và danh mục địa điểm thực tế.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["startDate", "endDate", "budget", "preferences", "currentLocation", "places"],
                properties: {
                  startDate: { type: "string", example: "2026-09-12" },
                  endDate: { type: "string", example: "2026-09-13" },
                  budget: { type: "number", example: 1000000 },
                  preferences: { type: "array", items: { type: "string" }, example: ["di-tich", "am-thuc"] },
                  transportMode: { type: "string", enum: ["motorbike", "car", "bicycle", "walking"], example: "motorbike" },
                  currentLocation: { type: "string", example: "Khách sạn Century Riverside Huế" },
                  startPlaceId: { type: "string", nullable: true, example: null },
                  endPlaceId: { type: "string", nullable: true, example: null },
                  places: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Lịch trình du lịch được khởi tạo thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        summary: { type: "string" },
                        totalEstimatedCost: { type: "number" },
                        budget: { type: "number" },
                        transportMode: { type: "string" },
                        days: { type: "array", items: { type: "object" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "422": {
            description: "Dữ liệu chuyến đi không hợp lệ",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
          "502": {
            description: "Lỗi phản hồi từ AI bên thứ ba",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },
    "/api/leaderboard": {
      get: {
        tags: ["Leaderboard & Gamification"],
        summary: "Bảng xếp hạng du khách khám phá Huế",
        description: "Lấy danh sách top người dùng có điểm thưởng tích luỹ và số lượng điểm check-in cao nhất.",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 20 }, description: "Số lượng người dùng hiển thị" },
        ],
        responses: {
          "200": {
            description: "Bảng xếp hạng du khách",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", format: "uuid" },
                          name: { type: "string" },
                          avatar_url: { type: "string" },
                          points: { type: "number" },
                          checkin_count: { type: "number" },
                          rank: { type: "number" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/checkins": {
      post: {
        tags: ["Leaderboard & Gamification"],
        summary: "Check-in tại địa điểm du lịch để nhận điểm tích lũy",
        description: "Yêu cầu đăng nhập. Kiểm tra toạ độ vị trí GPS thực tế của du khách phải nằm trong bán kính 500m của địa điểm để nhận +100 điểm thưởng khám phá.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["placeId"],
                properties: {
                  placeId: { type: "string", example: "dai-noi-hue" },
                  note: { type: "string", example: "Đã ghé thăm Ngọ Môn lúc hoàng hôn!" },
                  coords: {
                    type: "object",
                    properties: {
                      lat: { type: "number", example: 16.469 },
                      lng: { type: "number", example: 107.5778 },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Check-in thành công và cộng điểm",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        pointsEarned: { type: "number", example: 100 },
                        totalPoints: { type: "number", example: 600 },
                        message: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "400": { description: "Vị trí cách quá xa địa điểm (> 500m) hoặc đã check-in gần đây" },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/checkins/me": {
      get: {
        tags: ["Leaderboard & Gamification"],
        summary: "Lịch sử check-in của tài khoản hiện tại",
        description: "Yêu cầu đăng nhập. Trả về danh sách tất cả các địa điểm mà tài khoản này đã từng check-in thành công.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Danh sách địa điểm đã check-in",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          place_id: { type: "string" },
                          checked_in_at: { type: "string", format: "date-time" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
  },
};





