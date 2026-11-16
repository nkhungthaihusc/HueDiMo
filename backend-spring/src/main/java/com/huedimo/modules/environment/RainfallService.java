package com.huedimo.modules.environment;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.huedimo.common.exceptions.status503.ServiceUnavailableException;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class RainfallService {
    private final RestClient client;
    private final ObjectMapper mapper;
    private final String url;
    private Report cached;
    private Instant expiresAt = Instant.EPOCH;

    public RainfallService(@Qualifier("environmentClient") RestClient client, ObjectMapper mapper,
            @Value("${weather.rainfall-url:https://data.vrain.vn/public/current/31.json}") String url) {
        this.client = client;
        this.mapper = mapper;
        this.url = url;
    }

    public synchronized Report getRainfall() {
        if (Instant.now().isBefore(expiresAt)) {
            return cached;
        }

        try {
            String body = client.get().uri(url).retrieve().body(String.class);
            if (body == null) {
                throw new IOException("Empty rainfall response");
            }
            cached = report(mapper.readValue(body, Reading[].class), "live");
        } catch (IOException | RestClientException ex) {
            log.warn("Vrain unavailable or invalid ({}). Using bundled rainfall data.", ex.getClass().getSimpleName());
            try (var input = new ClassPathResource("data/vrain-weather-fallback.json").getInputStream()) {
                cached = report(mapper.readValue(input, Reading[].class), "fallback");
            } catch (IOException fallbackError) {
                log.error("Cannot load bundled rainfall data", fallbackError);
                throw new ServiceUnavailableException("Không thể lấy dữ liệu lượng mưa.");
            }
        }
        expiresAt = Instant.now().plus(Duration.ofMinutes(5));
        return cached;
    }

    private static Report report(Reading[] readings, String source) throws IOException {
        if (readings == null || readings.length == 0) {
            throw new IOException("Missing rainfall stations");
        }
        var stations = new ArrayList<Reading>(readings.length);
        for (Reading reading : readings) {
            if (reading == null || reading.station() == null || reading.station().name() == null
                    || reading.station().lat() == null || !Double.isFinite(reading.station().lat())
                    || reading.station().lng() == null || !Double.isFinite(reading.station().lng())
                    || reading.level() == null || reading.color() == null || reading.sumDepth() == null
                    || !Double.isFinite(reading.sumDepth()) || reading.sumDepth() < 0) {
                throw new IOException("Invalid rainfall station");
            }
            stations.add(new Reading(reading.color(), reading.level(), reading.station(), round(reading.sumDepth())));
        }
        stations.sort(Comparator.comparingDouble((Reading reading) -> reading.sumDepth()).reversed());

        int raining = 0, veryHeavy = 0, heavy = 0, medium = 0, light = 0, none = 0;
        double totalDepth = 0;
        for (Reading reading : stations) {
            double depth = reading.sumDepth();
            totalDepth += depth;
            if (depth > 0) {
                raining++;
            }
            if (depth >= 100 || reading.level().equals("Mưa rất to")) {
                veryHeavy++;
            } else if (depth >= 50 || reading.level().equals("Mưa to")) {
                heavy++;
            } else if (depth >= 25 || reading.level().equals("Mưa vừa")) {
                medium++;
            } else if (depth > 0 || reading.level().equals("Mưa nhỏ")) {
                light++;
            } else {
                none++;
            }
        }

        Reading max = stations.getFirst();
        Station station = max.station();
        var maxStation = new MaxStation(station.name(), station.address(), max.sumDepth(), max.level(),
                max.color(), station.area() == null ? "" : station.area().name());
        Risk risk = Risk.LOW;
        if (max.sumDepth() >= 100 || veryHeavy >= 3) {
            risk = Risk.SEVERE;
        } else if (max.sumDepth() >= 50 || heavy >= 5) {
            risk = Risk.HIGH;
        } else if (max.sumDepth() >= 25 || raining > stations.size() / 2) {
            risk = Risk.MEDIUM;
        }

        var summary = new Summary(stations.size(), raining, maxStation, round(totalDepth / stations.size()),
                risk.name().toLowerCase(java.util.Locale.ROOT), risk.label,
                new LevelCounts(veryHeavy, heavy, medium, light, none));
        return new Report(source, Instant.now().toString(), summary, List.copyOf(stations));
    }

    private static double round(double depth) {
        return Math.round(depth * 10) / 10.0;
    }

    private enum Risk {
        LOW("An toàn - Điều kiện thời tiết ổn định, thuận lợi di chuyển"),
        MEDIUM("Lưu ý - Có mưa vừa rải rác trên diện rộng, đường trơn trượt khi tham quan ngoài trời"),
        HIGH("Cảnh báo - Mưa to kéo dài, đề phòng ngập úng cục bộ tại các điểm trũng thấp Cố Đô"),
        SEVERE("Báo động đỏ - Mưa rất lớn, nguy cơ cao ngập lụt diện rộng & lũ quét vùng núi");

        private final String label;

        Risk(String label) {
            this.label = label;
        }
    }

    public record Report(String source, String updatedAt, Summary summary, List<Reading> stations) {}
    public record Summary(int totalStations, int rainingStations, MaxStation maxRainStation, double avgRainDepth,
            String floodRiskLevel, String floodRiskLabel, LevelCounts levelCounts) {}
    public record LevelCounts(int veryHeavy, int heavy, int medium, int light, int none) {}
    public record MaxStation(String name, String address, double sumDepth, String level, String color, String areaName) {}
    public record Reading(String color, String level, Station station, Double sumDepth) {}
    public record Station(String address, Region area, Region city, Double lat, Double lng, String name, String uuid) {}
    public record Region(Integer id, String name, String type, String codeName) {}
}
