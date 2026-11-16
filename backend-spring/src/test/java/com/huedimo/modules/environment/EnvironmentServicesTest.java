package com.huedimo.modules.environment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.huedimo.common.exceptions.status400.BadRequestException;

class EnvironmentServicesTest {
    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final String url = "https://provider.example/data";

    @Test
    void rainfallReturnsSortedReadingsAndCachesTheSummary() {
        server.expect(requestTo(url)).andRespond(withSuccess("""
                [
                    {"color":"#fff","level":"Không mưa","station":{"name":"A","lat":16.4,"lng":107.5},"sumDepth":0},
                    {"color":"#f00","level":"Mưa to","station":{"name":"B","lat":16.5,"lng":107.6},"sumDepth":55.12}
                ]
                """, MediaType.APPLICATION_JSON));
        var service = new RainfallService(builder.build(), mapper, url);

        var result = service.getRainfall();

        assertThat(result.source()).isEqualTo("live");
        assertThat(result.summary().maxRainStation().name()).isEqualTo("B");
        assertThat(result.summary().floodRiskLevel()).isEqualTo("high");
        assertThat(result.summary().avgRainDepth()).isEqualTo(27.6);
        assertThat(result.stations()).extracting(RainfallService.Reading::sumDepth).containsExactly(55.1, 0.0);
        assertThat(service.getRainfall()).isEqualTo(result);
        server.verify();
    }

    @Test
    void rainfallFallsBackWhenAnyUpstreamStationIsMalformed() {
        server.expect(requestTo(url)).andRespond(withSuccess("""
                [{"color":"#fff","level":"Không mưa","station":{"name":"A","lat":16.4,"lng":107.5},"sumDepth":0},{}]
                """, MediaType.APPLICATION_JSON));
        var service = new RainfallService(builder.build(), mapper, url);

        var result = service.getRainfall();

        assertThat(result.source()).isEqualTo("fallback");
        assertThat(result.stations()).isNotEmpty();
        server.verify();
    }

    @Test
    void reverseGeocodingFormatsAndCachesTheAddress() {
        server.expect(requestTo(url + "?lat=16.4&lon=107.5&format=json&accept-language=vi&addressdetails=1"))
                .andRespond(withSuccess("""
                        {"display_name":"5 Lê Lợi, Huế, Việt Nam","address":{"house_number":"5","road":"Lê Lợi","city":"Huế"}}
                        """, MediaType.APPLICATION_JSON));
        var service = new ReverseGeocodeService(builder.build(), mapper, url);

        var result = service.reverse(16.4, 107.5);

        assertThat(result.address()).isEqualTo("5 Lê Lợi, Huế");
        assertThat(result.cached()).isFalse();
        assertThat(service.reverse(16.4, 107.5).cached()).isTrue();
        server.verify();
    }

    @Test
    void reverseGeocodingRejectsInvalidCoordinatesAndSupportsAnUnconfiguredProvider() {
        var service = new ReverseGeocodeService(builder.build(), mapper, "");
        assertThatThrownBy(() -> service.reverse(Double.NaN, 107.5)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.reverse(16.4, 181)).isInstanceOf(BadRequestException.class);

        var result = service.reverse(-16.4, -107.5);

        assertThat(result.source()).isEqualTo("coordinates");
        assertThat(result.address()).isEqualTo("16.4000°N, 107.5000°T");
    }
}
