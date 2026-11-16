package com.huedimo.modules.environment;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.huedimo.common.exceptions.status400.BadRequestException;

@Service
public class ReverseGeocodeService {
    private static final int CACHE_LIMIT = 1024;
    private static final Duration CACHE_TTL = Duration.ofMinutes(15);
    private final RestClient client;
    private final ObjectMapper mapper;
    private final String url;
    private final LinkedHashMap<String, CachedAddress> cache = new LinkedHashMap<>();
    private Instant nextRequest = Instant.EPOCH;

    public ReverseGeocodeService(@Qualifier("environmentClient") RestClient client, ObjectMapper mapper,
            @Value("${GEOCODING_REVERSE_URL:}") String url) {
        this.client = client;
        this.mapper = mapper;
        this.url = url;
    }

    public Address reverse(double lat, double lng) {
        if (!Double.isFinite(lat) || !Double.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
            throw new BadRequestException("Toạ độ không hợp lệ (lat: -90 đến 90, lng: -180 đến 180).");
        }

        String key = String.format(Locale.ROOT, "%.4f,%.4f", lat, lng);
        Address result = lookup(key, lat, lng);
        if (result != null) {
            return result;
        }
        String coordinates = String.format(Locale.ROOT, "%.4f°%s, %.4f°%s",
                Math.abs(lat), lat < 0 ? "N" : "B", Math.abs(lng), lng < 0 ? "T" : "Đ");
        return new Address(coordinates, null, null, null, coordinates, "coordinates", false);
    }

    private Address lookup(String key, double lat, double lng) {
        synchronized (cache) {
            Instant now = Instant.now();
            CachedAddress existing = cache.get(key);
            if (existing != null && now.isBefore(existing.expiresAt())) {
                Address saved = existing.address();
                return new Address(saved.address(), saved.road(), saved.ward(), saved.city(), saved.fullAddress(),
                        saved.source(), true);
            }
            if (url.isBlank() || now.isBefore(nextRequest)) {
                return null;
            }
            nextRequest = now.plusSeconds(1);
        }

        try {
            String body = client.get()
                    .uri(url + "?lat={lat}&lon={lng}&format=json&accept-language=vi&addressdetails=1", lat, lng)
                    .retrieve().body(String.class);
            if (body == null) {
                return null;
            }
            JsonNode response = mapper.readTree(body);
            if (response == null || !response.isObject()) {
                return null;
            }
            String full = text(response, "display_name");
            if (full == null) {
                return null;
            }
            JsonNode details = response.path("address");
            String road = text(details, "road", "pedestrian", "footway", "path", "street");
            String house = text(details, "house_number");
            if (road != null && house != null) {
                road = house + " " + road;
            }
            if (road == null) {
                road = text(details, "tourism", "historic", "amenity", "building");
            }
            String ward = text(details, "quarter", "suburb", "neighbourhood", "village");
            String city = text(details, "city", "town", "county", "district");
            String shortAddress = Stream.of(road, ward, city).filter(java.util.Objects::nonNull)
                    .distinct().collect(Collectors.joining(", "));
            var result = new Address(shortAddress.isBlank() ? full : shortAddress, road, ward, city, full,
                    "nominatim", false);
            synchronized (cache) {
                cache.put(key, new CachedAddress(result, Instant.now().plus(CACHE_TTL)));
                if (cache.size() > CACHE_LIMIT) {
                    cache.pollFirstEntry();
                }
            }
            return result;
        } catch (RestClientException | IOException ex) {
            return null;
        }
    }

    private static String text(JsonNode node, String... fields) {
        for (String field : fields) {
            JsonNode value = node.path(field);
            if (value.isTextual() && !value.textValue().isBlank()) {
                return value.textValue().strip();
            }
        }
        return null;
    }

    private record CachedAddress(Address address, Instant expiresAt) {}
    public record Address(String address, String road, String ward, String city, String fullAddress,
            String source, boolean cached) {}
}
