package com.huedimo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import com.huedimo.modules.admin.AdminPlaceService;
import com.huedimo.modules.admin.AdminUserService;
import com.huedimo.modules.user.User;
import com.huedimo.common.exceptions.status400.BadRequestException;

import java.util.List;
import java.util.UUID;

@SpringBootTest(properties = "APP_CORS_ALLOWED_ORIGINS=http://localhost:3000")
class BackendSpringApplicationTests {
	@Autowired
	private AdminPlaceService adminPlaces;

	@Autowired
	private AdminUserService adminUsers;

	@Autowired
	private WebApplicationContext context;

	@Autowired
	private FilterChainProxy security;

	@Test
	void adminQueriesWorkAgainstPostgres() {
		var dashboard = adminPlaces.stats();
		assertThat(dashboard.overview().totalPlaces()).isNotNegative();
		assertThat(dashboard.recentPlaces()).hasSizeLessThanOrEqualTo(5);

		var page = adminPlaces.list(1, 1, "", "", "pending");
		assertThat(page.pagination().total()).isNotNegative();
		assertThat(page.items()).hasSizeLessThanOrEqualTo(1);
		assertThat(page.items()).allMatch(place -> "pending".equals(place.getStatus()));

		var empty = adminPlaces.list(1, 20, "__missing_category__", "__missing_category__", "all");
		assertThat(empty.items()).isEmpty();
	}

	@Test
	void publicGeocodingAndAdminCorsUseTheSpringSecurityChain() throws Exception {
		var mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(security).build();

		mvc.perform(get("/api/reverse-geocode").param("lat", "NaN").param("lng", "107.5"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.success").value(false));
		mvc.perform(get("/api/admin/places"))
				.andExpect(status().is4xxClientError());
		mvc.perform(options("/api/admin/places/any/status")
				.header("Origin", "http://localhost:3000")
				.header("Access-Control-Request-Method", "PATCH")
				.header("Access-Control-Request-Headers", "Authorization,Content-Type"))
				.andExpect(status().isOk())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
	}

	@Test
	void adminUserQueriesWorkAgainstPostgres() {
		var page = adminUsers.list(1, 1, "", "");
		assertThat(page.pagination().total()).isNotNegative();
		assertThat(page.items()).hasSizeLessThanOrEqualTo(1);
		for (var user : page.items()) {
			assertThat(adminUsers.get(user.id()).id()).isEqualTo(user.id());
		}
	}

	@Test
	void adminsCannotBanOrDemoteThemselves() {
		var id = UUID.randomUUID();
		var context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(new UsernamePasswordAuthenticationToken(
				User.builder().id(id).role("admin").build(), null, List.of()));
		SecurityContextHolder.setContext(context);
		try {
			assertThatThrownBy(() -> adminUsers.updateRole(id, "user")).isInstanceOf(BadRequestException.class);
			assertThatThrownBy(() -> adminUsers.updateStatus(id, "banned")).isInstanceOf(BadRequestException.class);
		} finally {
			SecurityContextHolder.clearContext();
		}
	}
}
