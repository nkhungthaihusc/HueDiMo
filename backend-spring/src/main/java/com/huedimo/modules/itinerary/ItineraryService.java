package com.huedimo.modules.itinerary;

import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.huedimo.common.exceptions.status403.ForbiddenException;
import com.huedimo.common.exceptions.status404.NotFoundException;
import com.huedimo.common.exceptions.status503.ServiceUnavailableException;
import com.huedimo.common.utils.SecurityUtils;
import com.huedimo.modules.user.User;
import com.huedimo.modules.user.UserRepository;
import com.huedimo.modules.itinerary.bookmark.ItineraryBookmarkService;
import com.huedimo.modules.itinerary.comment.ItineraryCommentService;
import com.huedimo.modules.itinerary.dto.request.CommunityFilterRequest;
import com.huedimo.modules.itinerary.dto.request.GenerateItineraryRequest;
import com.huedimo.modules.itinerary.dto.request.SaveItineraryRequest;
import com.huedimo.modules.itinerary.dto.request.UpdateVisibilityRequest;
import com.huedimo.modules.itinerary.dto.response.CommunityItineraryListResponse;
import com.huedimo.modules.itinerary.dto.response.ItineraryResponse;
import com.huedimo.modules.itinerary.reaction.ItineraryReactionService;
import com.huedimo.modules.place.Place;
import com.huedimo.modules.place.PlaceRepository;

import jakarta.persistence.criteria.Predicate;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ItineraryService {

    ItineraryRepository itineraryRepository;
    ItineraryBookmarkService bookmarkService;
    ItineraryReactionService reactionService;
    ItineraryCommentService commentService;
    UserRepository userRepository;
    PlaceRepository placeRepository;
    ObjectMapper objectMapper;

    @NonFinal
    @Value("${gemini.api-key}")
    String geminiApiKey;

    @NonFinal
    @Value("${gemini.model:gemini-1.5-flash}")
    String geminiModel;

    /**
     * 1. POST /api/itineraries/generate
     * Sinh lịch trình du lịch thông minh bằng AI (tối ưu cung đường liền kề, chống đi zig-zag)
     */
    public Object generateItinerary(GenerateItineraryRequest request) {
        log.info("Generating itinerary with AI for request: {} -> {}", request.getStartDate(), request.getEndDate());

        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new ServiceUnavailableException("Hệ thống chưa được cấu hình Gemini API Key. Vui lòng kiểm tra file application.yaml hoặc .env!");
        }

        // 1. Chuẩn bị catalog địa điểm và prompts
        String catalog = buildCatalogString(request);
        String systemPrompt = buildSystemPrompt();
        String userPrompt = buildUserPrompt(request, catalog);

        // 2. Chuẩn bị payload gửi Gemini REST API
        String endpoint = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                geminiModel, geminiApiKey);

        Map<String, Object> requestBody = Map.of(
            "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
            "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", userPrompt)))),
            "generationConfig", Map.of(
                "temperature", 0.4,
                "maxOutputTokens", 4096,
                "responseMimeType", "application/json"
            )
        );

        // 3. Gọi Gemini API qua RestClient
        try {
            RestClient restClient = RestClient.create();
            String rawResponse = restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            if (rawResponse == null || rawResponse.isBlank()) {
                throw new ServiceUnavailableException("Không nhận được phản hồi từ AI Gemini.");
            }

            // 4. Bóc tách kết quả JSON
            JsonNode rootNode = objectMapper.readTree(rawResponse);
            JsonNode candidates = rootNode.path("candidates");
            if (candidates.isEmpty()) {
                throw new ServiceUnavailableException("AI không thể tạo lịch trình từ các thông tin được cung cấp. Vui lòng thử lại!");
            }

            String aiGeneratedText = candidates.get(0)
                    .path("content")
                    .path("parts").get(0)
                    .path("text").asText();

            JsonNode itineraryResult = objectMapper.readTree(aiGeneratedText);

            // Bổ sung các thông số chuyến đi vào kết quả trả về
            if (itineraryResult instanceof ObjectNode objNode) {
                if (request.getBudget() != null && !objNode.has("budget")) {
                    objNode.put("budget", request.getBudget());
                }
                if (request.getTransportMode() != null && !objNode.has("transportMode")) {
                    objNode.put("transportMode", request.getTransportMode());
                }
                if (request.getGroupSize() != null && !objNode.has("groupSize")) {
                    objNode.put("groupSize", request.getGroupSize());
                }
                if (request.getNotes() != null && !objNode.has("notes")) {
                    objNode.put("notes", request.getNotes());
                }
                return objNode;
            }

            return itineraryResult;

        } catch (ServiceUnavailableException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Lỗi khi kết nối hoặc xử lý kết quả từ Google Gemini API: ", ex);
            throw new ServiceUnavailableException("Hệ thống AI đang quá tải hoặc gặp sự cố kết nối (503 Service Unavailable). Vui lòng thử lại!");
        }
    }

    private String buildCatalogString(GenerateItineraryRequest request) {
        StringBuilder sb = new StringBuilder();
        if (request.getPlaces() != null && !request.getPlaces().isEmpty()) {
            for (GenerateItineraryRequest.PlaceInputDto p : request.getPlaces()) {
                appendPlaceInfo(sb, p.getId(), p.getName(), p.getCategory(), p.getLat(), p.getLng(), p.getPrice(), p.getRating(), p.getDescription());
            }
        } else {
            List<Place> places = placeRepository.findByStatusOrderByRatingDesc("approved");
            for (Place p : places) {
                appendPlaceInfo(sb, p.getId(), p.getName(), p.getCategory(), p.getLat(), p.getLng(), p.getPrice(), p.getRating(), p.getDescription());
            }
        }
        return sb.toString();
    }

    private void appendPlaceInfo(StringBuilder sb, String id, String name, String category, Double lat, Double lng, Long price, Double rating, String desc) {
        String priceStr = (price != null && price > 0) ? String.format("%,d VND", price) : "miễn phí / không mất vé";
        String ratingStr = (rating != null) ? String.format("%.1f/5", rating) : "—";
        String coords = (lat != null && lng != null) ? String.format("(lat: %.4f, lng: %.4f)", lat, lng) : "(chưa có tọa độ)";
        String cleanDesc = (desc != null && !desc.isBlank()) ? desc.replaceAll("\n", " ") : "Địa điểm du lịch tại Huế";
        if (cleanDesc.length() > 90) cleanDesc = cleanDesc.substring(0, 87) + "...";

        sb.append(String.format("- id: %s | %s | tọa độ: %s | thể loại: %s | rating: %s | giá: %s | mô tả: %s\n",
                id, name, coords, category != null ? category : "khác", ratingStr, priceStr, cleanDesc));
    }

    private String buildSystemPrompt() {
        return """
            Bạn là chuyên gia du lịch và quy hoạch lộ trình bản địa tại Cố đô Huế, Việt Nam.
            Nhiệm vụ của bạn là thiết kế lịch trình tham quan thông minh, mượt mà và thực tế cho du khách CHỈ DỰA TRÊN CATALOG ĐỊA ĐIỂM ĐƯỢC CUNG CẤP.

            QUY TẮC BẮT BUỘC (TUÂN THỦ TUYỆT ĐỐI):
            1. TÍNH CHÍNH XÁC CỦA ĐỊA ĐIỂM:
               - CHỈ ĐƯỢC DÙNG các 'placeId' có mặt trong CATALOG. Tuyệt đối không tự bịa ra ID hoặc địa danh ngoài danh sách.
               - MỖI ĐỊA ĐIỂM CHỈ ĐƯỢC XUẤT HIỆN DUY NHẤT 1 LẦN trong toàn bộ chuyến đi (không lặp lại dù ở ngày khác).
               - Mỗi ngày chọn từ 3 đến 5 địa điểm phân bổ theo thứ tự thời gian hợp lý (sáng, trưa, chiều, tối).

            2. TỐI ƯU CUNG ĐƯỜNG ĐỊA LÝ & CHỐNG LỘ TRÌNH ĐI CHÉO / ZIG-ZAG (QUAN TRỌNG NHẤT):
               - TUYỆT ĐỐI CẤM chọn các địa điểm nhảy cóc qua lại hai đầu thành phố trong cùng 1 ngày, tạo thành các đường nối chéo nhau rối rắm trên bản đồ.
               - PHÂN CỤM THEO VÙNG ĐỊA LÝ CHO TỪNG NGÀY:
                 + Cụm 1 - Nội thành Bờ Bắc (Đại Nội, Cột Cờ, Chợ Đông Ba, Phố cổ Gia Hội, Chùa Thiên Mụ dọc đường Kim Long...): Dành cho ngày khám phá lịch sử, di sản cổ kính nội đô.
                 + Cụm 2 - Trung tâm Bờ Nam (Cầu Tràng Tiền, Phố đi bộ, công viên bờ sông, các quán cà phê/ẩm thực phố mới): Dành cho ngày dạo phố, ẩm thực và thư giãn nhẹ nhàng.
                 + Cụm 3 - Tuyến Di tích phía Tây Nam (Lăng Tự Đức, Lăng Khải Định, Đồi Vọng Cảnh, Làng hương Thủy Xuân, Chùa Từ Hiếu...): Các điểm này nằm sát nhau dọc trục đường du lịch Tây Nam, gom vào cùng 1 ngày.
                 + Cụm 4 - Tuyến Thượng nguồn phía Tây (Lăng Minh Mạng, Lăng Gia Long, Chùa Huyền Không Sơn Thượng...): Gom vào cùng 1 ngày nếu có phương tiện di chuyển nhanh.
                 + Cụm 5 - Tuyến Phía Đông / Đầm phá & Biển (Biển Thuận An, Đầm Chuồn, Rú Chá, Làng Sình...): Gom vào cùng 1 buổi hoặc 1 ngày.
               - NGUYÊN TẮC LIỀN KỀ (NEAREST NEIGHBOR ROUTING):
                 + Thứ tự các điểm trong ngày phải nối tiếp nhau theo một chiều di chuyển liên tục: Điểm 2 PHẢI gần điểm 1 nhất; Điểm 3 PHẢI gần điểm 2 nhất; Điểm 4 PHẢI gần điểm 3 nhất.
                 + Hãy đối chiếu tọa độ (lat, lng) trong Catalog: Khoảng cách giữa 2 điểm liên tiếp chỉ nên dưới 1km - 3km (nội thành) hoặc cùng trục giao thông dưới 5km (ngoại ô).
                 + TUYỆT ĐỐI KHÔNG xếp buổi sáng ở Đông (Biển Thuận An/Rú Chá), trưa chạy về Tây (Lăng Khải Định/Minh Mạng), rồi chiều lại quay về Đông.

            3. TỐI ƯU THEO PHƯƠNG TIỆN DI CHUYỂN:
               - Nếu là "walking" (Đi bộ) hoặc "bicycle" (Xe đạp): BẮT BUỘC 100% các điểm trong ngày phải nằm gần nhau trong nội thành (bán kính dưới 2km giữa 2 điểm liên tiếp). KHÔNG được chọn các điểm ngoại ô xa như Lăng Khải Định, Minh Mạng, Gia Long, Biển Thuận An, Rú Chá!
               - Nếu là "motorbike" (Xe máy) hoặc "car" (Ô tô / Taxi): Có thể đi các điểm ngoại ô nhưng phải gom cùng một cung đường.

            4. NGÂN SÁCH & CHI PHÍ:
               - 'estimatedCost' là chi phí ước tính (VND) cho 1 người khi ghé thăm địa điểm. Nếu địa điểm có giá (price > 0) thì 'estimatedCost' phải bằng đúng giá đó.
               - Tổng chi phí 'totalEstimatedCost' KHÔNG ĐƯỢC VƯỢT QUÁ ngân sách của du khách.

            5. ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
               Trả về DUY NHẤT một chuỗi JSON hợp lệ, không bọc markdown ```json, không giải thích ngoài lề, đúng cấu trúc:
               {
                 "summary": "Tóm tắt tổng quan về chuyến đi và logic cung đường...",
                 "totalEstimatedCost": 350000,
                 "days": [
                   {
                     "date": "YYYY-MM-DD",
                     "title": "Tiêu đề ngày (ví dụ: Khám phá Cố đô Bờ Bắc sông Hương)",
                     "places": [
                       {
                         "placeId": "id trong catalog",
                         "reason": "Lý do chọn và thời điểm ghé thăm (ví dụ: Tham quan buổi sáng để tránh nắng)",
                         "estimatedCost": 0
                       }
                     ]
                   }
                 ]
               }
            """;
    }

    private String buildUserPrompt(GenerateItineraryRequest req, String catalog) {
        String prefs = (req.getPreferences() != null && !req.getPreferences().isEmpty())
                ? String.join(", ", req.getPreferences())
                : "Đa dạng, cân bằng trải nghiệm";

        String transport = req.getTransportMode() != null ? req.getTransportMode() : "motorbike";
        String startEndInfo = "Xuất phát tự nhiên từ nơi ở hiện tại";
        if (req.getStartPlaceId() != null && req.getEndPlaceId() != null) {
            startEndInfo = String.format("Bắt đầu tại: %s, kết thúc tại: %s", req.getStartPlaceId(), req.getEndPlaceId());
        } else if (req.getStartPlaceId() != null) {
            startEndInfo = String.format("Bắt đầu tại: %s, kết thúc tự do", req.getStartPlaceId());
        } else if (req.getEndPlaceId() != null) {
            startEndInfo = String.format("Bắt đầu tự do, kết thúc tại: %s", req.getEndPlaceId());
        }

        return String.format("""
            THÔNG TIN CHUYẾN ĐI CỦA DU KHÁCH:
            - Thời gian: %s → %s
            - Số lượng người: %d người
            - Phương tiện di chuyển: %s
            - Sở thích / Phong cách du lịch: %s
            - Ngân sách tối đa cho cả chuyến đi: %,.0f VND
            - Nơi lưu trú / Vị trí hiện tại: %s
            - Điểm bắt đầu / Điểm kết thúc: %s
            - Ghi chú & Yêu cầu riêng: %s

            CATALOG ĐỊA ĐIỂM (CHỈ ĐƯỢC CHỌN TRONG DANH SÁCH NÀY):
            %s

            HÃY PHÂN CỤM ĐỊA LÝ THEO TỪNG VÙNG VÀ SẮP XẾP THỨ TỰ CÁC ĐIỂM TRONG NGÀY LIỀN KỀ NHAU (CHỐNG ĐI ĐƯỜNG CHÉO ZIG-ZAG).
            Trả về DUY NHẤT một chuỗi JSON chuẩn.
            """,
            req.getStartDate(), req.getEndDate(),
            req.getGroupSize() != null ? req.getGroupSize() : 1,
            transport,
            prefs,
            req.getBudget() != null ? req.getBudget() : 0.0,
            req.getCurrentLocation() != null ? req.getCurrentLocation() : "Trung tâm TP Huế",
            startEndInfo,
            (req.getNotes() != null && !req.getNotes().isBlank()) ? req.getNotes().trim() : "Không có yêu cầu đặc biệt",
            catalog
        );
    }

    /**
     * 2. POST /api/itineraries/save
     * Lưu hoặc cập nhật lịch trình cá nhân của người dùng
     */
    @Transactional
    public ItineraryResponse saveItinerary(SaveItineraryRequest request) {
        User currentUser = SecurityUtils.getCurrentUser();
        log.info("Saving itinerary for user {}: {}", currentUser.getId(), request.getTitle());

        Itinerary itineraryToSave;

        if (request.getId() != null) {
            Itinerary existing = itineraryRepository.findById(request.getId())
                    .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch trình với ID: " + request.getId()));

            boolean isOwner = existing.getUserId().equals(currentUser.getId());
            boolean isAdmin = currentUser.getRole() != null && "admin".equalsIgnoreCase(currentUser.getRole());
            if (!isOwner && !isAdmin) {
                throw new ForbiddenException("Bạn không có quyền cập nhật lịch trình này");
            }

            existing.setTitle(request.getTitle().trim());
            existing.setStartDate(request.getStartDate());
            existing.setEndDate(request.getEndDate());
            existing.setBudget(request.getBudget());
            existing.setTotalEstimatedCost(request.getTotalEstimatedCost());
            existing.setTransportMode(request.getTransportMode());
            existing.setGroupSize(request.getGroupSize());
            existing.setCurrentLocation(request.getCurrentLocation());
            existing.setPreferences(request.getPreferences());
            existing.setSummary(request.getSummary());
            if (request.getDays() != null) {
                existing.setDays(request.getDays());
            }
            if (request.getIsPublic() != null) {
                existing.setIsPublic(request.getIsPublic());
            }
            itineraryToSave = existing;
        } else {
            // Kiểm tra xem đã có bản ghi cùng tiêu đề và ngày đi/về của user chưa để tránh tạo trùng lặp
            Optional<Itinerary> duplicateOpt = itineraryRepository
                    .findFirstByUserIdAndTitleAndStartDateAndEndDateOrderByUpdatedAtDesc(
                            currentUser.getId(), request.getTitle().trim(), request.getStartDate(), request.getEndDate());

            if (duplicateOpt.isPresent()) {
                itineraryToSave = duplicateOpt.get();
                itineraryToSave.setBudget(request.getBudget());
                itineraryToSave.setTotalEstimatedCost(request.getTotalEstimatedCost());
                itineraryToSave.setTransportMode(request.getTransportMode());
                itineraryToSave.setGroupSize(request.getGroupSize());
                itineraryToSave.setCurrentLocation(request.getCurrentLocation());
                itineraryToSave.setPreferences(request.getPreferences());
                itineraryToSave.setSummary(request.getSummary());
                if (request.getDays() != null) {
                    itineraryToSave.setDays(request.getDays());
                }
                if (request.getIsPublic() != null) {
                    itineraryToSave.setIsPublic(request.getIsPublic());
                }
            } else {
                itineraryToSave = Itinerary.builder()
                        .userId(currentUser.getId())
                        .title(request.getTitle().trim())
                        .startDate(request.getStartDate())
                        .endDate(request.getEndDate())
                        .budget(request.getBudget())
                        .totalEstimatedCost(request.getTotalEstimatedCost())
                        .transportMode(request.getTransportMode())
                        .groupSize(request.getGroupSize())
                        .currentLocation(request.getCurrentLocation())
                        .preferences(request.getPreferences())
                        .summary(request.getSummary())
                        .days(request.getDays())
                        .isPublic(request.getIsPublic() != null ? request.getIsPublic() : false)
                        .viewsCount(0L)
                        .likesCount(0L)
                        .bookmarksCount(0L)
                        .forksCount(0L)
                        .build();
            }
        }

        Itinerary saved = itineraryRepository.save(itineraryToSave);
        return toItineraryResponse(saved, currentUser, currentUser.getId());
    }

    /**
     * 3. GET /api/itineraries/my
     * Lấy danh sách tất cả lịch trình của người dùng hiện tại (cả private và public)
     */
    public List<ItineraryResponse> getMyItineraries() {
        User currentUser = SecurityUtils.getCurrentUser();
        log.info("Fetching my itineraries for user: {}", currentUser.getId());

        List<Itinerary> list = itineraryRepository.findByUserIdOrderByCreatedAtDesc(currentUser.getId());
        return list.stream()
                .map(it -> toItineraryResponse(it, currentUser, currentUser.getId()))
                .toList();
    }

    /**
     * 4. GET /api/itineraries/community
     * Khám phá danh sách lịch trình công khai từ cộng đồng có filter, sorting, pagination
     */
    public CommunityItineraryListResponse getCommunityItineraries(CommunityFilterRequest filter) {
        log.info("Fetching community itineraries with filter: {}", filter);

        if (filter == null) {
            filter = CommunityFilterRequest.builder().build();
        }

        final CommunityFilterRequest finalFilter = filter;

        Specification<Itinerary> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Chỉ lấy các lịch trình ở chế độ công khai
            predicates.add(cb.isTrue(root.get("isPublic")));

            // Tìm kiếm theo từ khóa trong tiêu đề hoặc tóm tắt
            if (finalFilter.getSearch() != null && !finalFilter.getSearch().trim().isEmpty()) {
                String pattern = "%" + finalFilter.getSearch().trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("title")), pattern),
                        cb.like(cb.lower(root.get("summary")), pattern)
                ));
            }

            // Lọc theo phương tiện di chuyển
            if (finalFilter.getTransportMode() != null && !finalFilter.getTransportMode().trim().isEmpty()) {
                predicates.add(cb.equal(root.get("transportMode"), finalFilter.getTransportMode().trim()));
            }

            // Lọc theo ngân sách tối đa
            if (finalFilter.getMaxBudget() != null && finalFilter.getMaxBudget() > 0) {
                predicates.add(cb.or(
                        cb.and(cb.isNotNull(root.get("budget")), cb.lessThanOrEqualTo(root.get("budget"), finalFilter.getMaxBudget())),
                        cb.and(cb.isNotNull(root.get("totalEstimatedCost")), cb.lessThanOrEqualTo(root.get("totalEstimatedCost"), finalFilter.getMaxBudget()))
                ));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        // Xác định tiêu chí sắp xếp
        String sortParam = filter.getSort() != null ? filter.getSort().toLowerCase() : "newest";
        Sort sort = switch (sortParam) {
            case "most_liked", "popular" -> Sort.by(Sort.Order.desc("likesCount"), Sort.Order.desc("createdAt"));
            case "most_viewed" -> Sort.by(Sort.Order.desc("viewsCount"), Sort.Order.desc("createdAt"));
            case "highest_rated", "rating" -> Sort.by(Sort.Order.desc("rating").nullsLast(), Sort.Order.desc("createdAt"));
            case "cost_asc" -> Sort.by(Sort.Order.asc("totalEstimatedCost"), Sort.Order.desc("createdAt"));
            case "cost_desc" -> Sort.by(Sort.Order.desc("totalEstimatedCost"), Sort.Order.desc("createdAt"));
            default -> Sort.by(Sort.Order.desc("createdAt"));
        };

        int pageNum = (filter.getPage() != null && filter.getPage() > 0) ? filter.getPage() - 1 : 0;
        int limit = (filter.getLimit() != null && filter.getLimit() > 0) ? filter.getLimit() : 12;

        Pageable pageable = PageRequest.of(pageNum, limit, sort);
        Page<Itinerary> pageResult = itineraryRepository.findAll(spec, pageable);

        UUID currentUserId = SecurityUtils.getCurrentUserOptional().map(User::getId).orElse(null);

        // Batch nạp thông tin tác giả để tránh N+1 queries
        Set<UUID> userIds = pageResult.getContent().stream()
                .map(Itinerary::getUserId)
                .collect(Collectors.toSet());
        Map<UUID, User> authorMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<ItineraryResponse> items = pageResult.getContent().stream()
                .map(it -> toItineraryResponse(it, authorMap.get(it.getUserId()), currentUserId))
                .toList();

        // Lọc theo daysCount nếu có yêu cầu
        if (filter.getDaysCount() != null && filter.getDaysCount() > 0) {
            final int targetDays = filter.getDaysCount();
            if (targetDays >= 4) {
                items = items.stream()
                        .filter(item -> item.getDaysCount() != null && item.getDaysCount() >= 4)
                        .toList();
            } else {
                items = items.stream()
                        .filter(item -> item.getDaysCount() != null && item.getDaysCount() == targetDays)
                        .toList();
            }
        }

        return CommunityItineraryListResponse.builder()
                .items(items)
                .pagination(CommunityItineraryListResponse.Pagination.builder()
                        .page(pageNum + 1)
                        .limit(limit)
                        .total(pageResult.getTotalElements())
                        .totalPages(pageResult.getTotalPages())
                        .build())
                .build();
    }

    /**
     * 5. GET /api/itineraries/{id}
     * Xem chi tiết 1 lịch trình (tăng views_count, kiểm tra quyền xem nếu private)
     */
    @Transactional
    public ItineraryResponse getItineraryById(UUID id) {
        log.info("Fetching itinerary details for id: {}", id);

        Itinerary itinerary = itineraryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch trình với ID: " + id));

        Optional<User> currentUserOpt = SecurityUtils.getCurrentUserOptional();

        boolean isPublic = Boolean.TRUE.equals(itinerary.getIsPublic());
        if (!isPublic) {
            if (currentUserOpt.isEmpty()) {
                throw new ForbiddenException("Lịch trình này ở chế độ riêng tư của tác giả.");
            }
            User currentUser = currentUserOpt.get();
            boolean isOwner = itinerary.getUserId().equals(currentUser.getId());
            boolean isAdmin = currentUser.getRole() != null && "admin".equalsIgnoreCase(currentUser.getRole());
            if (!isOwner && !isAdmin) {
                throw new ForbiddenException("Lịch trình này ở chế độ riêng tư của tác giả.");
            }
        }

        // Tăng lượt xem views_count
        itinerary.setViewsCount((itinerary.getViewsCount() != null ? itinerary.getViewsCount() : 0L) + 1L);
        itineraryRepository.save(itinerary);

        User author = userRepository.findById(itinerary.getUserId()).orElse(null);
        UUID currentUserId = currentUserOpt.map(User::getId).orElse(null);

        return toItineraryResponse(itinerary, author, currentUserId);
    }

    /**
     * 6. PATCH /api/itineraries/{id}/visibility
     * Bật/tắt trạng thái công khai (isPublic) cho lịch trình chính chủ
     */
    @Transactional
    public ItineraryResponse toggleVisibility(UUID id, UpdateVisibilityRequest request) {
        User currentUser = SecurityUtils.getCurrentUser();
        log.info("User {} toggling visibility of itinerary {} to {}", currentUser.getId(), id, request.getIsPublic());

        Itinerary itinerary = itineraryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch trình với ID: " + id));

        boolean isOwner = itinerary.getUserId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() != null && "admin".equalsIgnoreCase(currentUser.getRole());
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền thay đổi trạng thái của lịch trình này");
        }

        itinerary.setIsPublic(request.getIsPublic());
        Itinerary saved = itineraryRepository.save(itinerary);
        return toItineraryResponse(saved, currentUser, currentUser.getId());
    }

    /**
     * 7. POST /api/itineraries/{id}/fork
     * Nhân bản / Sử dụng lộ trình cộng đồng về tài khoản cá nhân
     */
    @Transactional
    public ItineraryResponse forkItinerary(UUID id) {
        User currentUser = SecurityUtils.getCurrentUser();
        log.info("User {} forking itinerary {}", currentUser.getId(), id);

        Itinerary source = itineraryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lộ trình gốc với ID: " + id));

        boolean isPublic = Boolean.TRUE.equals(source.getIsPublic());
        boolean isOwner = source.getUserId().equals(currentUser.getId());
        if (!isPublic && !isOwner) {
            throw new ForbiddenException("Không thể sao chép lịch trình riêng tư.");
        }

        // Tăng forks_count trên lộ trình gốc
        source.setForksCount((source.getForksCount() != null ? source.getForksCount() : 0L) + 1L);
        itineraryRepository.save(source);

        // Tạo bản sao cho người dùng hiện tại
        String clonedTitle = source.getTitle() != null && source.getTitle().startsWith("[Bản sao] ")
                ? source.getTitle()
                : "[Bản sao] " + (source.getTitle() != null ? source.getTitle() : "Lịch trình Huế");

        Itinerary cloned = Itinerary.builder()
                .userId(currentUser.getId())
                .title(clonedTitle)
                .startDate(source.getStartDate())
                .endDate(source.getEndDate())
                .budget(source.getBudget())
                .totalEstimatedCost(source.getTotalEstimatedCost())
                .transportMode(source.getTransportMode())
                .groupSize(source.getGroupSize())
                .currentLocation(source.getCurrentLocation())
                .preferences(source.getPreferences() != null ? new ArrayList<>(source.getPreferences()) : null)
                .summary(source.getSummary())
                .days(source.getDays() != null ? source.getDays().deepCopy() : null)
                .isPublic(false) // Mặc định bản sao chép ở chế độ riêng tư
                .viewsCount(0L)
                .likesCount(0L)
                .bookmarksCount(0L)
                .forksCount(0L)
                .build();

        Itinerary saved = itineraryRepository.save(cloned);
        return toItineraryResponse(saved, currentUser, currentUser.getId());
    }

    /**
     * 8. DELETE /api/itineraries/{id}
     * Xóa lịch trình (chỉ chủ sở hữu hoặc admin mới có quyền)
     */
    @Transactional
    public void deleteItinerary(UUID id) {
        User currentUser = SecurityUtils.getCurrentUser();
        log.info("User {} deleting itinerary {}", currentUser.getId(), id);

        Itinerary itinerary = itineraryRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy lịch trình với ID: " + id));

        boolean isOwner = itinerary.getUserId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() != null && "admin".equalsIgnoreCase(currentUser.getRole());
        if (!isOwner && !isAdmin) {
            throw new ForbiddenException("Bạn không có quyền xóa lịch trình này");
        }

        // Xóa cascade an toàn các dữ liệu phụ thuộc
        bookmarkService.deleteByItineraryId(id);
        reactionService.deleteByItineraryId(id);
        commentService.deleteByItineraryId(id);

        itineraryRepository.delete(itinerary);
    }

    // ==========================================
    // HELPER MAPPERS (Hỗ trợ convert Entity -> DTO)
    // ==========================================

    public ItineraryResponse toItineraryResponse(Itinerary entity, User author, boolean isLiked, boolean isBookmarked, long commentsCount) {
        if (entity == null) return null;

        Integer daysCount = null;
        if (entity.getStartDate() != null && entity.getEndDate() != null) {
            daysCount = (int) ChronoUnit.DAYS.between(entity.getStartDate(), entity.getEndDate()) + 1;
        }

        String authorName = author != null
                ? (author.getName() != null && !author.getName().isBlank() ? author.getName() : author.getEmail())
                : "Du khách Huế";

        return ItineraryResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .title(entity.getTitle())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .daysCount(daysCount)
                .budget(entity.getBudget())
                .totalEstimatedCost(entity.getTotalEstimatedCost())
                .transportMode(entity.getTransportMode())
                .groupSize(entity.getGroupSize())
                .currentLocation(entity.getCurrentLocation())
                .preferences(entity.getPreferences())
                .summary(entity.getSummary())
                .days(entity.getDays())
                .isPublic(entity.getIsPublic())
                .viewsCount(entity.getViewsCount() != null ? entity.getViewsCount() : 0L)
                .likesCount(entity.getLikesCount() != null ? entity.getLikesCount() : 0L)
                .bookmarksCount(entity.getBookmarksCount() != null ? entity.getBookmarksCount() : 0L)
                .forksCount(entity.getForksCount() != null ? entity.getForksCount() : 0L)
                .rating(entity.getRating())
                .authorName(authorName)
                .authorAvatar(author != null ? author.getAvatarUrl() : null)
                .authorRole(author != null ? author.getRole() : "user")
                .isLiked(isLiked)
                .isBookmarked(isBookmarked)
                .commentsCount(commentsCount)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    public ItineraryResponse toItineraryResponse(Itinerary entity, User author, UUID currentUserId) {
        if (entity == null) return null;
        boolean isLiked = reactionService.isLikedByUser(entity.getId(), currentUserId);
        boolean isBookmarked = bookmarkService.isBookmarkedByUser(entity.getId(), currentUserId);
        long commentsCount = commentService.countByItineraryId(entity.getId());
        return toItineraryResponse(entity, author, isLiked, isBookmarked, commentsCount);
    }
}
