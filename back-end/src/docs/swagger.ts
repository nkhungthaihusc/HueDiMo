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
      CSVPlaceItem: {
        type: "object",
        required: ["name", "category", "lat", "lng"],
        properties: {
          id: { type: "string", example: "lang-tu-duc" },
          name: { type: "string", example: "Lăng Tự Đức (Khiêm Lăng)" },
          category: { type: "string", example: "ancient" },
          lat: { type: "number", example: 16.43255 },
          lng: { type: "number", example: 107.56608 },
          address: { type: "string", example: "Thôn Thượng Ba, P. Thủy Xuân, TP. Huế" },
          price: { type: "number", example: 150000 },
          is_local: { type: "boolean", example: false },
          opening_hours: { type: "string", example: "07:00 - 17:30" },
          estimated_duration_minutes: { type: "number", example: 100 },
          best_time_to_visit: { type: "string", example: "Buổi chiều mát (14:30 - 17:00)" },
          rating: { type: "number", example: 4.6 },
          description: { type: "string", example: "Khu lăng tẩm mang phong cách hoa viên sơn thủy hữu tình..." },
          image_url: { type: "string", example: "https://example.com/image.jpg" },
          notes: { type: "string", example: "Khuôn viên nhiều bóng mát, thích hợp tản bộ." },
          status: { type: "string", enum: ["approved", "pending", "rejected"], example: "approved" },
        },
      },
      PreviewImportCSVRequest: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/CSVPlaceItem" },
          },
        },
      },
      ImportPlacesCSVRequest: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/CSVPlaceItem" },
          },
          duplicateStrategy: {
            type: "string",
            enum: ["skip", "overwrite"],
            default: "skip",
            description: "Chiến lược xử lý khi trùng lặp: 'skip' (bỏ qua), 'overwrite' (ghi đè/cập nhật thông tin mới)",
            example: "skip",
          },
        },
      },
      ItineraryPlace: {
        type: "object",
        required: ["placeId"],
        properties: {
          placeId: { type: "string", example: "dai-noi-hue", description: "ID của địa điểm trong cơ sở dữ liệu" },
          reason: { type: "string", example: "Di tích lịch sử quan trọng nhất triều Nguyễn" },
          estimatedCost: { type: "number", example: 200000 },
          customName: { type: "string", example: "Đại Nội Huế" },
          note: { type: "string", example: "Nên mang ô/nón và nước uống." },
        },
      },
      ItineraryDay: {
        type: "object",
        required: ["date", "places"],
        properties: {
          date: { type: "string", format: "date", example: "2026-09-17" },
          title: { type: "string", example: "Ngày 1: Khám phá Quần thể Di tích Cố đô" },
          places: {
            type: "array",
            items: { $ref: "#/components/schemas/ItineraryPlace" },
          },
        },
      },
      Itinerary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "d9e80b2a-714a-4a25-8854-c9f53833cb91" },
          user_id: { type: "string", format: "uuid", example: "71c08796-03fc-4cb3-a5c7-8dc5f466b026" },
          title: { type: "string", example: "Lộ trình 17/9/2026 → 18/9/2026" },
          start_date: { type: "string", format: "date", example: "2026-09-17" },
          end_date: { type: "string", format: "date", example: "2026-09-18" },
          budget: { type: "number", example: 1000000 },
          total_estimated_cost: { type: "number", example: 750000 },
          transport_mode: {
            type: "string",
            enum: ["motorbike", "car", "bicycle", "walking"],
            example: "motorbike",
          },
          group_size: { type: "number", example: 2 },
          current_location: { type: "string", example: "Ga Huế" },
          preferences: {
            type: "array",
            items: { type: "string" },
            example: ["ancient", "food"],
          },
          summary: { type: "string", example: "Hành trình 2 ngày trải nghiệm lịch sử Cố đô và ẩm thực Cung đình Huế." },
          days: {
            type: "array",
            items: { $ref: "#/components/schemas/ItineraryDay" },
          },
          is_public: { type: "boolean", example: true },
          likes_count: { type: "number", example: 12 },
          bookmarks_count: { type: "number", example: 5 },
          views_count: { type: "number", example: 89 },
          forks_count: { type: "number", example: 3 },
          comments_count: { type: "number", example: 4 },
          rating: { type: "number", example: 4.8, description: "Điểm đánh giá trung bình từ 1.0 đến 5.0" },
          author_name: { type: "string", example: "Nguyễn Kim Hưng Thái" },
          author_avatar: { type: "string", example: "" },
          is_liked: { type: "boolean", example: false },
          is_bookmarked: { type: "boolean", example: false },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      SaveItineraryRequest: {
        type: "object",
        required: ["title", "startDate", "endDate", "days"],
        properties: {
          id: { type: "string", example: "d9e80b2a-714a-4a25-8854-c9f53833cb91", description: "ID của lộ trình nếu là cập nhật (hoặc bỏ trống nếu tạo mới)" },
          title: { type: "string", example: "Lộ trình 17/9/2026 → 18/9/2026" },
          startDate: { type: "string", format: "date", example: "2026-09-17" },
          endDate: { type: "string", format: "date", example: "2026-09-18" },
          budget: { type: "number", example: 1000000 },
          totalEstimatedCost: { type: "number", example: 750000 },
          transportMode: {
            type: "string",
            enum: ["motorbike", "car", "bicycle", "walking"],
            example: "motorbike",
          },
          groupSize: { type: "number", example: 2 },
          currentLocation: { type: "string", example: "Ga Huế" },
          preferences: {
            type: "array",
            items: { type: "string" },
            example: ["ancient", "food"],
          },
          summary: { type: "string", example: "Hành trình 2 ngày trải nghiệm lịch sử Cố đô và ẩm thực Cung đình Huế." },
          days: {
            type: "array",
            items: { $ref: "#/components/schemas/ItineraryDay" },
          },
          isPublic: { type: "boolean", example: false, description: "Bật true để chia sẻ lên cộng đồng" },
        },
      },
      ItineraryComment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", example: "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
          itinerary_id: { type: "string", format: "uuid", example: "d9e80b2a-714a-4a25-8854-c9f53833cb91" },
          user_id: { type: "string", format: "uuid", example: "71c08796-03fc-4cb3-a5c7-8dc5f466b026" },
          content: { type: "string", example: "Lộ trình rất hợp lý, các điểm lăng tẩm đi buổi chiều mát mẻ hơn nhiều!" },
          rating: { type: "number", minimum: 1, maximum: 5, example: 5, description: "Số sao đánh giá từ 1 đến 5" },
          user_name: { type: "string", example: "Lê Thị B" },
          user_avatar: { type: "string", example: "" },
          user_role: { type: "string", example: "user" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      AddCommentRequest: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string", example: "Cung đường di chuyển rất tối ưu, đồ ăn quán bánh bèo rất ngon!" },
          rating: {
            type: "number",
            minimum: 1,
            maximum: 5,
            example: 5,
            description: "Số sao đánh giá lộ trình (1 - 5 sao)",
          },
        },
      },
      ToggleVisibilityRequest: {
        type: "object",
        required: ["isPublic"],
        properties: {
          isPublic: { type: "boolean", example: true, description: "true để công khai, false để riêng tư" },
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
    "/api/admin/ai-settings": {
      get: {
        tags: ["Admin - AI Service"],
        summary: "Lấy cấu hình hiện tại của AI tư vấn du lịch (Admin)",
        description: "Yêu cầu quyền Quản trị viên (Admin). Trả về model AI đang sử dụng, các tham số temperature, maxTokens, customInstruction, trạng thái API key và danh sách model được gợi ý.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Cấu hình AI hiện tại",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        config: {
                          type: "object",
                          properties: {
                            model: { type: "string", example: "big-pickle" },
                            temperature: { type: "number", example: 0.4 },
                            maxTokens: { type: "number", example: 4096 },
                            customInstruction: { type: "string", example: "Ưu tiên các món ăn đậm chất Huế." },
                          },
                        },
                        apiKeyStatus: {
                          type: "object",
                          properties: {
                            configured: { type: "boolean", example: true },
                            maskedKey: { type: "string", example: "sk-Rr8T...0U4l" },
                          },
                        },
                        supportedPresets: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              name: { type: "string" },
                              provider: { type: "string" },
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
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
      put: {
        tags: ["Admin - AI Service"],
        summary: "Cập nhật model và tham số của AI tư vấn (Admin)",
        description: "Yêu cầu quyền Quản trị viên (Admin). Cho phép chỉnh sửa model AI (ví dụ: big-pickle, gemini-2.5-flash, gpt-4o...), nhiệt độ temperature, maxTokens và chỉ thị bổ sung customInstruction.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  model: { type: "string", example: "gemini-2.5-flash" },
                  temperature: { type: "number", example: 0.4, minimum: 0, maximum: 1 },
                  maxTokens: { type: "number", example: 4096, minimum: 512, maximum: 16384 },
                  customInstruction: { type: "string", example: "Luôn gợi ý thêm đặc sản ẩm thực Huế cho mỗi ngày." },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Cập nhật cấu hình thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        config: { type: "object" },
                        message: { type: "string", example: "Cập nhật cấu hình model AI tư vấn thành công!" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
          "422": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/admin/ai-settings/test": {
      post: {
        tags: ["Admin - AI Service"],
        summary: "Kiểm tra kết nối và khả năng phản hồi của model AI (Admin)",
        description: "Yêu cầu quyền Quản trị viên (Admin). Gửi request thử nghiệm nhanh tới model AI chỉ định để đo độ trễ và kiểm tra phản hồi.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  model: { type: "string", example: "gemini-2.5-flash" },
                  temperature: { type: "number", example: 0.4 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Kiểm tra kết nối thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        modelUsed: { type: "string", example: "gemini-2.5-flash" },
                        latencyMs: { type: "number", example: 1200 },
                        responseSample: { type: "string" },
                        message: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
          "502": { $ref: "#/components/schemas/ErrorResponse" },
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
    "/api/admin/places/export-csv": {
      get: {
        tags: ["Admin - Places Management"],
        summary: "Xuất danh sách địa điểm ra tệp CSV (Admin)",
        description: "Yêu cầu quyền Quản trị viên (Admin). Hỗ trợ lọc theo từ khóa tìm kiếm (q), danh mục (category) và trạng thái kiểm duyệt (status). Tệp CSV trả về kèm tiền tố UTF-8 BOM để mở tiếng Việt trên Microsoft Excel không bị lỗi phông.",
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "q",
            in: "query",
            required: false,
            description: "Từ khóa tìm kiếm theo tên, địa chỉ hoặc mô tả",
            schema: { type: "string", example: "Lăng" },
          },
          {
            name: "category",
            in: "query",
            required: false,
            description: "Lọc theo mã danh mục (ancient, spiritual, food, hotel,...)",
            schema: { type: "string", example: "ancient" },
          },
          {
            name: "status",
            in: "query",
            required: false,
            description: "Lọc theo trạng thái kiểm duyệt ('all', 'approved', 'pending', 'rejected')",
            schema: { type: "string", enum: ["all", "approved", "pending", "rejected"], example: "approved" },
          },
        ],
        responses: {
          "200": {
            description: "Tệp CSV danh sách địa điểm kèm header Content-Disposition tải về",
            content: {
              "text/csv": {
                schema: {
                  type: "string",
                  format: "binary",
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/admin/places/import-csv/preview": {
      post: {
        tags: ["Admin - Places Management"],
        summary: "Kiểm tra trước và phát hiện trùng khớp dữ liệu CSV (Admin Preview / Dry-run)",
        description: "Yêu cầu quyền Quản trị viên (Admin). Nhận mảng các dòng parse được từ file CSV, kiểm tra hợp lệ tọa độ Thừa Thiên Huế (15.0 - 18.0, 106.0 - 109.0), và đối chiếu với cơ sở dữ liệu để gắn cờ trùng lặp (trùng ID, trùng tên, trùng tọa độ lân cận < 35m, hoặc trùng nội bộ trong file).",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PreviewImportCSVRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Kết quả kiểm tra trước dữ liệu nhập",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        total: { type: "number", example: 10 },
                        validCount: { type: "number", example: 7 },
                        duplicateCount: { type: "number", example: 2 },
                        errorCount: { type: "number", example: 1 },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              rowNum: { type: "number", example: 1 },
                              name: { type: "string", example: "Lăng Tự Đức" },
                              category: { type: "string", example: "ancient" },
                              lat: { type: "number", example: 16.43255 },
                              lng: { type: "number", example: 107.56608 },
                              isValid: { type: "boolean", example: true },
                              errors: { type: "array", items: { type: "string" } },
                              isDuplicate: { type: "boolean", example: true },
                              duplicateReason: { type: "string", example: "Trùng tên với địa điểm đã tồn tại (lang-tu-duc)" },
                              matchedPlaceId: { type: "string", example: "lang-tu-duc" },
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
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
          "422": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/admin/places/import-csv": {
      post: {
        tags: ["Admin - Places Management"],
        summary: "Thực hiện nhập danh sách địa điểm từ CSV vào hệ thống (Admin)",
        description: "Yêu cầu quyền Quản trị viên (Admin). Nhận danh sách các địa điểm đã kiểm tra kèm tùy chọn xử lý trùng lặp `duplicateStrategy` ('skip' để bỏ qua, 'overwrite' để cập nhật dữ liệu mới lên địa điểm cũ).",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ImportPlacesCSVRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Nhập dữ liệu thành công kèm thống kê số lượng xử lý",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        totalProcessed: { type: "number", example: 10 },
                        insertedCount: { type: "number", example: 7 },
                        updatedCount: { type: "number", example: 2 },
                        skippedCount: { type: "number", example: 0 },
                        errorCount: { type: "number", example: 1 },
                        message: { type: "string", example: "Đã xử lý xong: thêm mới 7, cập nhật 2, bỏ qua 0, lỗi 1." },
                        errors: { type: "array", items: { type: "object" } },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
          "422": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/itineraries/community": {
      get: {
        tags: ["Itineraries"],
        summary: "Lấy danh sách lộ trình du lịch công khai từ cộng đồng",
        description: "Hỗ trợ tìm kiếm từ khóa, lọc theo số ngày, phương tiện di chuyển, ngân sách tối đa và sắp xếp theo mới nhất, nhiều lượt thích nhất, lượt xem nhiều nhất hoặc điểm đánh giá cao nhất.",
        parameters: [
          { name: "search", in: "query", schema: { type: "string" }, description: "Từ khóa tìm kiếm trong tiêu đề hoặc tóm tắt" },
          { name: "daysCount", in: "query", schema: { type: "integer" }, description: "Lọc theo số ngày (1, 2, 3, hoặc 4+)" },
          { name: "transportMode", in: "query", schema: { type: "string", enum: ["motorbike", "car", "bicycle", "walking"] }, description: "Phương tiện di chuyển" },
          { name: "maxBudget", in: "query", schema: { type: "number" }, description: "Ngân sách tối đa" },
          { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "highest_rated", "most_liked", "most_viewed"], default: "newest" }, description: "Tiêu chí sắp xếp" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 }, description: "Số trang" },
          { name: "limit", in: "query", schema: { type: "integer", default: 12 }, description: "Số bản ghi mỗi trang" },
        ],
        responses: {
          "200": {
            description: "Danh sách lịch trình cộng đồng phân trang",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        items: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Itinerary" },
                        },
                        pagination: {
                          type: "object",
                          properties: {
                            page: { type: "integer", example: 1 },
                            limit: { type: "integer", example: 12 },
                            total: { type: "integer", example: 45 },
                            totalPages: { type: "integer", example: 4 },
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
    },
    "/api/itineraries/save": {
      post: {
        tags: ["Itineraries"],
        summary: "Lưu hoặc cập nhật lộ trình cá nhân",
        description: "Yêu cầu đăng nhập. Tự động cập nhật nếu đã tồn tại lộ trình trùng khớp của người dùng, hoặc tạo mới nếu chưa có.",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SaveItineraryRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Cập nhật thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        itinerary: { $ref: "#/components/schemas/Itinerary" },
                        message: { type: "string", example: "Cập nhật lịch trình thành công!" },
                      },
                    },
                  },
                },
              },
            },
          },
          "201": {
            description: "Lưu mới thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        itinerary: { $ref: "#/components/schemas/Itinerary" },
                        message: { type: "string", example: "Lưu lịch trình thành công!" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
          "422": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/itineraries/my": {
      get: {
        tags: ["Itineraries"],
        summary: "Lấy tất cả lộ trình cá nhân của người dùng hiện tại",
        description: "Yêu cầu đăng nhập. Trả về toàn bộ danh sách lộ trình riêng tư lẫn công khai của user.",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "Danh sách lộ trình của người dùng",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Itinerary" },
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
    "/api/itineraries/{id}": {
      get: {
        tags: ["Itineraries"],
        summary: "Xem chi tiết một lộ trình cụ thể",
        description: "Tự động tăng số lượt xem views_count. Nếu lộ trình ở chế độ riêng tư, chỉ có tác giả mới có thể xem.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lịch trình" },
        ],
        responses: {
          "200": {
            description: "Thông tin chi tiết lộ trình",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { $ref: "#/components/schemas/Itinerary" },
                  },
                },
              },
            },
          },
          "403": { $ref: "#/components/schemas/ErrorResponse" },
          "404": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
      delete: {
        tags: ["Itineraries"],
        summary: "Xóa lộ trình của mình",
        description: "Yêu cầu đăng nhập. Người dùng chỉ có thể xóa lộ trình do chính mình tạo ra.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lịch trình cần xóa" },
        ],
        responses: {
          "200": {
            description: "Xóa thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string", example: "Đã xóa lịch trình thành công." },
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
        },
      },
    },
    "/api/itineraries/{id}/visibility": {
      patch: {
        tags: ["Itineraries"],
        summary: "Bật/tắt trạng thái công khai cho lộ trình",
        description: "Yêu cầu đăng nhập. Cho phép người dùng chuyển đổi giữa riêng tư (false) và công khai lên cộng đồng (true).",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lịch trình" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ToggleVisibilityRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Cập nhật trạng thái hiển thị thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        itinerary: { $ref: "#/components/schemas/Itinerary" },
                        message: { type: "string", example: "Đã chia sẻ lịch trình công khai lên cộng đồng HueDiMo!" },
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
    "/api/itineraries/{id}/reaction": {
      post: {
        tags: ["Itineraries"],
        summary: "Thả tim / Bỏ tim lộ trình",
        description: "Yêu cầu đăng nhập. Chuyển đổi trạng thái thích của người dùng đối với lộ trình.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lịch trình" },
        ],
        responses: {
          "200": {
            description: "Cập nhật lượt thích thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        isLiked: { type: "boolean", example: true },
                        likesCount: { type: "integer", example: 15 },
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
    "/api/itineraries/{id}/bookmark": {
      post: {
        tags: ["Itineraries"],
        summary: "Đánh dấu / Bỏ đánh dấu lưu lại lộ trình",
        description: "Yêu cầu đăng nhập. Lưu lộ trình vào danh sách theo dõi cá nhân.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lịch trình" },
        ],
        responses: {
          "200": {
            description: "Cập nhật đánh dấu thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        isBookmarked: { type: "boolean", example: true },
                        bookmarksCount: { type: "integer", example: 6 },
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
    "/api/itineraries/{id}/fork": {
      post: {
        tags: ["Itineraries"],
        summary: "Sử dụng / Nhân bản lộ trình cộng đồng",
        description: "Yêu cầu đăng nhập. Tạo một bản sao độc lập của lộ trình cộng đồng vào tài khoản của người dùng để tùy biến.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lịch trình gốc" },
        ],
        responses: {
          "201": {
            description: "Nhân bản lộ trình thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        itinerary: { $ref: "#/components/schemas/Itinerary" },
                        message: { type: "string", example: "Đã nạp lộ trình vào danh sách chuyến đi của bạn!" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/schemas/ErrorResponse" },
          "404": { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
    "/api/itineraries/{id}/comments": {
      get: {
        tags: ["Itineraries"],
        summary: "Lấy danh sách đánh giá và bình luận của lộ trình",
        description: "Trả về danh sách nhận xét kèm số sao đánh giá (1-5 sao) và thông tin tác giả bình luận.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lịch trình" },
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
                      items: { $ref: "#/components/schemas/ItineraryComment" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Itineraries"],
        summary: "Gửi đánh giá sao và nhận xét cho lộ trình",
        description: "Yêu cầu đăng nhập. Nhận nội dung nhận xét và tùy chọn số sao rating (1-5). Hệ thống tự động tính toán lại điểm sao trung bình của lộ trình.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lịch trình" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AddCommentRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Gửi đánh giá thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        comment: { $ref: "#/components/schemas/ItineraryComment" },
                        message: { type: "string", example: "Gửi ý kiến / đánh giá thành công!" },
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
    "/api/itineraries/{id}/comments/{commentId}": {
      delete: {
        tags: ["Itineraries"],
        summary: "Xóa bình luận hoặc đánh giá",
        description: "Yêu cầu đăng nhập. Chỉ tác giả của bình luận hoặc Quản trị viên mới có thể xóa.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lịch trình" },
          { name: "commentId", in: "path", required: true, schema: { type: "string" }, description: "UUID của bình luận cần xóa" },
        ],
        responses: {
          "200": {
            description: "Xóa bình luận thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        message: { type: "string", example: "Đã xóa bình luận thành công." },
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
        },
      },
    },
    "/api/admin/itineraries": {
      get: {
        tags: ["Admin - Itineraries Management"],
        summary: "Lấy danh sách tất cả lộ trình phục vụ quản trị (Admin)",
        description: "Yêu cầu quyền Quản trị viên. Hỗ trợ tìm kiếm theo tiêu đề/tác giả/tóm tắt và lọc theo trạng thái công khai.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "q", in: "query", schema: { type: "string" }, description: "Từ khóa tìm kiếm" },
          { name: "isPublic", in: "query", schema: { type: "string", enum: ["true", "false"] }, description: "Lọc theo trạng thái công khai" },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": {
            description: "Danh sách lộ trình phân trang",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        items: { type: "array", items: { $ref: "#/components/schemas/Itinerary" } },
                        pagination: {
                          type: "object",
                          properties: {
                            page: { type: "integer" },
                            limit: { type: "integer" },
                            total: { type: "integer" },
                            totalPages: { type: "integer" },
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
    },
    "/api/admin/itineraries/{id}": {
      delete: {
        tags: ["Admin - Itineraries Management"],
        summary: "Quản trị viên xóa lộ trình vi phạm (Admin)",
        description: "Yêu cầu quyền Quản trị viên. Xóa hoàn toàn một lộ trình khỏi cơ sở dữ liệu.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lộ trình cần xóa" },
        ],
        responses: {
          "200": {
            description: "Xóa thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        deleted: { type: "boolean", example: true },
                        message: { type: "string", example: "Đã xóa lịch trình thành công." },
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
        },
      },
    },
    "/api/admin/itineraries/{id}/visibility": {
      patch: {
        tags: ["Admin - Itineraries Management"],
        summary: "Bật hoặc ẩn lộ trình khỏi cộng đồng (Admin)",
        description: "Yêu cầu quyền Quản trị viên. Cho phép admin can thiệp ẩn lộ trình vi phạm hoặc khôi phục hiển thị.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của lộ trình" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ToggleVisibilityRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Cập nhật hiển thị thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        itinerary: { $ref: "#/components/schemas/Itinerary" },
                        message: { type: "string", example: "Đã cho phép lộ trình hiển thị công khai trên cộng đồng." },
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
    "/api/admin/itinerary-comments": {
      get: {
        tags: ["Admin - Itineraries Management"],
        summary: "Lấy danh sách tất cả nhận xét và đánh giá sao lộ trình (Admin)",
        description: "Yêu cầu quyền Quản trị viên. Giúp kiểm duyệt và theo dõi các đánh giá sao và thảo luận của du khách về lộ trình.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          "200": {
            description: "Danh sách đánh giá lộ trình phân trang",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        items: { type: "array", items: { $ref: "#/components/schemas/ItineraryComment" } },
                        pagination: {
                          type: "object",
                          properties: {
                            page: { type: "integer" },
                            limit: { type: "integer" },
                            total: { type: "integer" },
                            totalPages: { type: "integer" },
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
    },
    "/api/admin/itinerary-comments/{id}": {
      delete: {
        tags: ["Admin - Itineraries Management"],
        summary: "Quản trị viên xóa nhận xét hoặc đánh giá lộ trình vi phạm (Admin)",
        description: "Yêu cầu quyền Quản trị viên. Xóa nhận xét và tự động tính lại điểm trung bình cho lộ trình.",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" }, description: "UUID của bình luận" },
        ],
        responses: {
          "200": {
            description: "Xóa thành công",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        deleted: { type: "boolean", example: true },
                        message: { type: "string", example: "Đã xóa nhận xét lộ trình thành công." },
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
        },
      },
    },
  },
};





