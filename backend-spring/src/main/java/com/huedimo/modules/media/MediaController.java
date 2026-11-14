package com.huedimo.modules.media;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.huedimo.common.dto.ApiResponse;
import com.huedimo.common.exceptions.status400.BadRequestException;
import com.huedimo.common.exceptions.status503.ServiceUnavailableException;

@RestController
@RequestMapping("/api/upload")
public class MediaController {
    private static final Set<String> FOLDERS = Set.of("places", "reviews", "avatars", "general");
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp",
            "image/gif", "gif", "image/svg+xml", "svg", "image/heic", "heic", "image/heif", "heif");
    private static final long MAX_BYTES = 10 * 1024 * 1024;
    private static final String BUCKET = "huedimo-media";

    private final String storageUrl;
    private final String serviceRoleKey;
    private final RestClient storage = RestClient.create();

    public MediaController(@Value("${supabase.url}") String supabaseUrl,
            @Value("${supabase.service-role-key}") String serviceRoleKey) {
        this.storageUrl = supabaseUrl.replaceFirst("/+$", "") + "/storage/v1";
        this.serviceRoleKey = serviceRoleKey;
    }

    @CrossOrigin
    @PostMapping("/presign")
    public ResponseEntity<ApiResponse<List<SignedUpload>>> presign(@RequestBody UploadRequest request) {
        if (request.folder() == null || !FOLDERS.contains(request.folder())
                || request.files() == null || request.files().isEmpty() || request.files().size() > 5) {
            throw new BadRequestException("Chọn thư mục hợp lệ và từ 1 đến 5 ảnh.");
        }

        List<String> extensions = request.files().stream().map(file -> {
            if (file == null || file.contentType() == null || !EXTENSIONS.containsKey(file.contentType())
                    || file.size() < 1 || file.size() > MAX_BYTES) {
                throw new BadRequestException("Định dạng ảnh không hợp lệ hoặc dung lượng vượt quá 10 MB.");
            }
            return EXTENSIONS.get(file.contentType());
        }).toList();

        if (storageUrl.startsWith("/") || serviceRoleKey.isBlank()) {
            throw new ServiceUnavailableException("Máy chủ chưa cấu hình Supabase Storage.");
        }
        List<SignedUpload> uploads = extensions.stream()
                .map(extension -> sign(request.folder() + "/" + UUID.randomUUID() + "." + extension))
                .toList();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(ApiResponse.success(uploads));
    }

    private SignedUpload sign(String path) {
        String signPath = "/object/upload/sign/" + BUCKET + "/" + path;
        try {
            StorageResponse response = storage.post().uri(storageUrl + signPath)
                    .header("apikey", serviceRoleKey)
                    .headers(headers -> headers.setBearerAuth(serviceRoleKey))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of())
                    .retrieve()
                    .body(StorageResponse.class);
            if (response == null || response.url() == null || !response.url().startsWith(signPath + "?token=")) {
                throw new ServiceUnavailableException("Supabase không trả về URL tải ảnh hợp lệ.");
            }
            return new SignedUpload(storageUrl + response.url(), storageUrl + "/object/public/" + BUCKET + "/" + path);
        } catch (RestClientException ex) {
            throw new ServiceUnavailableException("Không thể tạo URL tải ảnh.");
        }
    }

    public record UploadRequest(String folder, List<FileMetadata> files) {}
    public record FileMetadata(String contentType, long size) {}
    public record SignedUpload(String uploadUrl, String publicUrl) {}
    private record StorageResponse(String url) {}
}
