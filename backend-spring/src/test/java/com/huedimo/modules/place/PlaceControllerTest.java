package com.huedimo.modules.place;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.huedimo.modules.place.dto.CreatePlaceRequest;

@ExtendWith(MockitoExtension.class)
class PlaceControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PlaceService placeService;

    @InjectMocks
    private PlaceController placeController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(placeController).build();
    }

    @Test
    void getMyPlaces_shouldReturnPlaceList() throws Exception {
        UUID userId = UUID.randomUUID();
        Place p = Place.builder()
                .id("place-123")
                .name("Chùa Thiên Mụ")
                .createdBy(userId)
                .status("pending")
                .build();

        when(placeService.getMyPlaces()).thenReturn(List.of(p));

        mockMvc.perform(get("/api/places/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value("place-123"))
                .andExpect(jsonPath("$.data[0].name").value("Chùa Thiên Mụ"));

        verify(placeService).getMyPlaces();
    }

    @Test
    void createPlace_withValidData_shouldReturnCreatedPlace() throws Exception {
        CreatePlaceRequest req = CreatePlaceRequest.builder()
                .name("Lăng Tự Đức")
                .category("history")
                .lat(16.433)
                .lng(107.565)
                .address("Thủy Xuân, Huế")
                .price(150000L)
                .build();

        Place created = Place.builder()
                .id("place-tu-duc")
                .name("Lăng Tự Đức")
                .category("history")
                .lat(16.433)
                .lng(107.565)
                .address("Thủy Xuân, Huế")
                .status("pending")
                .build();

        when(placeService.createPlace(any(CreatePlaceRequest.class))).thenReturn(created);

        mockMvc.perform(post("/api/places")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("place-tu-duc"))
                .andExpect(jsonPath("$.data.name").value("Lăng Tự Đức"));

        verify(placeService).createPlace(any(CreatePlaceRequest.class));
    }
}
