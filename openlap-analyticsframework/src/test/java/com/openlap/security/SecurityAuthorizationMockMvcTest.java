package com.openlap.security;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.openlap.admin.audit.AdminAuditService;
import com.openlap.admin.dto.AdminUsageResponse;
import com.openlap.admin.dto.AdminVisLibraryResponse;
import com.openlap.admin.services.AdminCatalogService;
import com.openlap.admin.services.AdminUsageService;
import com.openlap.analytics_engine.services.EngineService;
import com.openlap.analytics_statements.services.LrsService;
import com.openlap.analytics_statements.services.StatementService;
import com.openlap.analytics_technique.services.AnalyticsTechniqueService;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.infrastructure.error.ErrorResponseWriter;
import com.openlap.infrastructure.security.RestAccessDeniedHandler;
import com.openlap.infrastructure.security.RestAuthenticationEntryPoint;
import com.openlap.user.dto.request.TokenRequest;
import com.openlap.user.dto.response.AdminUserDetailResponse;
import com.openlap.user.dto.response.AdminUserResponse;
import com.openlap.user.dto.response.UserResponse;
import com.openlap.user.dto.response.utils.AdminLrsProviderConnection;
import com.openlap.user.services.TokenService;
import com.openlap.user.services.UserRegisterService;
import com.openlap.user.services.UserRoleService;
import com.openlap.user.services.UserService;
import com.openlap.visualization_methods.services.VisualizationLibraryService;
import com.openlap.visualization_methods.services.VisualizationMethodUtilityService;
import com.openlap.visualization_methods.services.VisualizationTypeService;
import java.util.Collections;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit4.SpringRunner;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Characterization tests for the authorization rules in {@link SecurityConfig}, driven through the
 * real security filter chain via a sliced MockMvc context (no MongoDB, no plugin loading).
 *
 * <p>Documents three behaviours the P0 work must preserve: protected endpoints require a token,
 * a valid token with a sufficient role is allowed through, and public endpoints stay open.
 */
@RunWith(SpringRunner.class)
@WebMvcTest(
    controllers = {
      com.openlap.user.controller.UserController.class,
      com.openlap.user.controller.UserRegisterController.class,
      com.openlap.user.controller.AdminUserController.class,
      com.openlap.admin.controller.AdminUsageController.class,
      com.openlap.admin.controller.AdminUserDetailController.class,
      com.openlap.analytics_technique.controller.AnalyticsTechniqueController.class,
      com.openlap.visualization_methods.controllers.VisualizationMethodController.class,
      com.openlap.admin.controller.AdminCatalogController.class,
      com.openlap.admin.controller.AdminAuditController.class,
      com.openlap.admin.controller.AdminContentController.class,
      com.openlap.admin.controller.AdminPluginController.class,
      com.openlap.content.PublicContentController.class
    })
@Import({
  SecurityConfig.class,
  AuthTokenProperties.class,
  ApiErrorResponseFactory.class,
  ErrorResponseWriter.class,
  RestAuthenticationEntryPoint.class,
  RestAccessDeniedHandler.class
})
@TestPropertySource(
    properties = {
      "server.token=test-secret-key-that-is-long-enough-1234567890",
      "frontend.urls=http://localhost:5173"
    })
public class SecurityAuthorizationMockMvcTest {

  @Autowired private MockMvc mockMvc;

  // SecurityConfig collaborators
  @MockBean private UserDetailsService userDetailsService;
  @MockBean private TokenService tokenService;
  @MockBean private BCryptPasswordEncoder bCryptPasswordEncoder;
  @MockBean private UrlBasedCorsConfigurationSource corsConfigurationSource;

  // Controller collaborators
  @MockBean private UserService userService;
  @MockBean private AdminUsageService adminUsageService;
  @MockBean private AdminCatalogService adminCatalogService;
  @MockBean private AdminAuditService adminAuditService;
  @MockBean private com.openlap.content.ContentService contentService;
  @MockBean private com.openlap.plugins.management.PluginManagementService pluginManagementService;
  @MockBean private com.openlap.plugins.management.PluginCatalogEditor pluginCatalogEditor;
  @MockBean private com.openlap.plugins.management.PluginRemovalService pluginRemovalService;
  @MockBean private com.openlap.plugins.management.PluginArtifactCleanup pluginArtifactCleanup;
  @MockBean private AnalyticsTechniqueService analyticsTechniqueService;
  @MockBean private VisualizationLibraryService visualizationLibraryService;
  @MockBean private VisualizationTypeService visualizationTypeService;
  @MockBean private VisualizationMethodUtilityService visualizationMethodUtilityService;
  @MockBean private UserRegisterService userRegisterService;
  @MockBean private StatementService statementService;
  @MockBean private LrsService lrsService;

  // Bootstrap CommandLineRunner safety net (prevents any MongoDB access if it is invoked)
  @MockBean private UserRoleService userRoleService;
  @MockBean private EngineService engineService;

  @Test
  public void pluginWorkflowIsForbiddenWithoutSuperAdminForEveryOperation() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));
    mockMvc.perform(get("/v1/admin/plugins").param("kind", "ANALYTICS"))
        .andExpect(status().isForbidden());
    mockMvc.perform(get("/v1/admin/plugins/example").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden());
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/v1/admin/plugins/upload")
        .file(new org.springframework.mock.web.MockMultipartFile("file", "test.jar", "application/java-archive", new byte[] {1}))
        .param("kind", "ANALYTICS").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden());
    for (String action : new String[] {"inspect", "activate", "replacement", "retire-previous", "discard", "reopen"}) {
      mockMvc.perform(post("/v1/admin/plugins/example/" + action).header(AUTHORIZATION, "Bearer valid-token")
          .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0,\"trusted\":true}"))
          .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }
    mockMvc.perform(get("/v1/admin/plugins/catalog/ANALYTICS_METHOD/example").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden());
    mockMvc.perform(patch("/v1/admin/plugins/catalog/ANALYTICS_METHOD/example").header(AUTHORIZATION, "Bearer valid-token")
        .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0,\"name\":\"Edit\"}"))
        .andExpect(status().isForbidden());
    org.mockito.Mockito.verifyZeroInteractions(pluginCatalogEditor);
    org.mockito.Mockito.verifyZeroInteractions(pluginManagementService);
    for (String path : new String[] {"removed?kind=ANALYTICS_METHOD", "cleanup", "catalog/ANALYTICS_METHOD/example/removal"})
      mockMvc.perform(get("/v1/admin/plugins/" + path).header(AUTHORIZATION, "Bearer valid-token")).andExpect(status().isForbidden());
    for (String path : new String[] {"cleanup", "removals/example/restore", "removals/example/resume"})
      mockMvc.perform(post("/v1/admin/plugins/" + path).header(AUTHORIZATION, "Bearer valid-token")
          .contentType(MediaType.APPLICATION_JSON).content("{\"confirmed\":true}")).andExpect(status().isForbidden());
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/v1/admin/plugins/catalog/ANALYTICS_METHOD/example")
        .header(AUTHORIZATION, "Bearer valid-token").contentType(MediaType.APPLICATION_JSON).content("{\"expectedVersions\":{}}"))
        .andExpect(status().isForbidden());
    org.mockito.Mockito.verifyZeroInteractions(pluginRemovalService, pluginArtifactCleanup);
  }

  @Test
  public void superAdminRemovalRecoveryAndCleanupAreAudited() throws Exception {
    given(tokenService.verifyToken(any())).willReturn(new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    String token = "00000000-0000-0000-0000-000000000000";
    java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
    result.put("id", token); result.put("catalogId", "method-1"); result.put("kind", "ANALYTICS_METHOD"); result.put("name", "Method"); result.put("state", "REMOVED");
    given(pluginRemovalService.remove(org.mockito.ArgumentMatchers.eq(com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD), org.mockito.ArgumentMatchers.eq("method-1"), any())).willReturn(result);
    given(pluginRemovalService.restore(token)).willReturn(result);
    given(pluginArtifactCleanup.run(true, Collections.singletonList("analytics-" + String.join("", Collections.nCopies(64, "a"))))).willReturn(Collections.singletonMap("purged", 1));
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/v1/admin/plugins/catalog/ANALYTICS_METHOD/method-1")
        .header(AUTHORIZATION, "Bearer valid-token").contentType(MediaType.APPLICATION_JSON).content("{\"expectedVersions\":{\"analytics-technique:method-1\":0}}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data.state").value("REMOVED"));
    mockMvc.perform(post("/v1/admin/plugins/removals/" + token + "/restore").header(AUTHORIZATION, "Bearer valid-token")).andExpect(status().isOk());
    mockMvc.perform(post("/v1/admin/plugins/cleanup").header(AUTHORIZATION, "Bearer valid-token")
        .contentType(MediaType.APPLICATION_JSON).content("{\"confirmed\":true,\"artifactIds\":[\"analytics-" + String.join("", Collections.nCopies(64, "a")) + "\"]}")).andExpect(status().isOk());
    org.mockito.Mockito.verify(adminAuditService).logSuccess(any(), org.mockito.ArgumentMatchers.eq("PLUGIN_REMOVE"), org.mockito.ArgumentMatchers.eq("ANALYTICS_METHOD"), org.mockito.ArgumentMatchers.eq("method-1"), org.mockito.ArgumentMatchers.eq("Method"), any());
    org.mockito.Mockito.verify(adminAuditService).logSuccess(any(), org.mockito.ArgumentMatchers.eq("PLUGIN_RESTORE"), org.mockito.ArgumentMatchers.eq("PLUGIN_REMOVAL"), org.mockito.ArgumentMatchers.eq(token), org.mockito.ArgumentMatchers.eq("Method"), any());
    org.mockito.Mockito.verify(adminAuditService).logSuccess(any(), org.mockito.ArgumentMatchers.eq("PLUGIN_ARTIFACT_CLEANUP"), org.mockito.ArgumentMatchers.eq("PLUGIN_INSTALLATION"), org.mockito.ArgumentMatchers.eq("retention-cleanup"), any(), any());
  }

  @Test
  public void superAdminCanReadPluginUploadCapability() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    given(pluginManagementService.available()).willReturn(true);
    given(pluginManagementService.recent(com.openlap.plugins.artifacts.PluginKind.ANALYTICS))
        .willReturn(Collections.emptyList());
    mockMvc.perform(get("/v1/admin/plugins").param("kind", "ANALYTICS").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data.available").value(true));
  }

  @Test
  public void superAdminCanInspectAndActivateWithAuditRecords() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    String id = "analytics-" + String.join("", Collections.nCopies(64, "a"));
    java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
    result.put("id", id); result.put("filename", "example.jar"); result.put("state", "INSPECTED"); result.put("version", 2L);
    given(pluginManagementService.inspect(id, 0L, true)).willReturn(result);
    given(pluginManagementService.activate(id, 2L)).willReturn(result);
    mockMvc.perform(post("/v1/admin/plugins/" + id + "/inspect").header(AUTHORIZATION, "Bearer valid-token")
        .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0,\"trusted\":true}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data.state").value("INSPECTED"));
    mockMvc.perform(post("/v1/admin/plugins/" + id + "/activate").header(AUTHORIZATION, "Bearer valid-token")
        .contentType(MediaType.APPLICATION_JSON).content("{\"version\":2}"))
        .andExpect(status().isOk());
    for (String action : new String[] {"PLUGIN_INSPECT", "PLUGIN_ACTIVATE"}) {
      org.mockito.Mockito.verify(adminAuditService).logSuccess(any(), org.mockito.ArgumentMatchers.eq(action),
          org.mockito.ArgumentMatchers.eq("PLUGIN_INSTALLATION"), org.mockito.ArgumentMatchers.eq(id),
          org.mockito.ArgumentMatchers.eq("example.jar"), any());
    }
  }

  @Test
  public void superAdminCanEditPluginDetailsWithResourceSpecificAudit() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
    result.put("id", "method-1"); result.put("kind", "ANALYTICS_METHOD"); result.put("name", "Edited name"); result.put("version", 1L);
    given(pluginCatalogEditor.edit(org.mockito.ArgumentMatchers.eq(com.openlap.plugins.management.PluginCatalogKind.ANALYTICS_METHOD),
        org.mockito.ArgumentMatchers.eq("method-1"), any())).willReturn(result);
    mockMvc.perform(patch("/v1/admin/plugins/catalog/ANALYTICS_METHOD/method-1").header(AUTHORIZATION, "Bearer valid-token")
        .contentType(MediaType.APPLICATION_JSON).content("{\"version\":0,\"name\":\"Edited name\"}"))
        .andExpect(status().isOk()).andExpect(jsonPath("$.data.version").value(1));
    org.mockito.Mockito.verify(adminAuditService).logSuccess(any(), org.mockito.ArgumentMatchers.eq("PLUGIN_DETAILS_UPDATE"),
        org.mockito.ArgumentMatchers.eq("ANALYTICS_METHOD"), org.mockito.ArgumentMatchers.eq("method-1"),
        org.mockito.ArgumentMatchers.eq("Edited name"), any());
  }

  @Test
  public void homepageContentReadsArePublicAndDoNotExposeDrafts() throws Exception {
    given(contentService.published(any(), org.mockito.ArgumentMatchers.anyInt(), org.mockito.ArgumentMatchers.anyInt()))
        .willReturn(new PageImpl<>(Collections.singletonList(Collections.singletonMap("title", "Published content"))));
    for (String kind : new String[] {"news", "publications"}) {
      mockMvc.perform(get("/v1/content/" + kind))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.data.content[0].title").value("Published content"))
          .andExpect(jsonPath("$.data.content[0].draft").doesNotExist());
    }
  }

  @Test
  public void homepageContentAdminWritesAreForbiddenToNonAdmin() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));
    mockMvc.perform(post("/v1/admin/content/news").header(AUTHORIZATION, "Bearer valid-token")
        .contentType(MediaType.APPLICATION_JSON).content("{\"draft\":{\"title\":\"News\"}}"))
        .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    mockMvc.perform(get("/v1/admin/content/news")).andExpect(status().isForbidden());
  }

  @Test
  public void homepageContentAdminCanCreateDrafts() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    com.openlap.content.ContentEntry entry = new com.openlap.content.ContentEntry();
    entry.setId("news-1"); entry.setStatus("DRAFT"); entry.setVersion(1);
    entry.setDraft(Collections.singletonMap("title", "News"));
    given(contentService.create(any(), any())).willReturn(entry);
    mockMvc.perform(post("/v1/admin/content/news").header(AUTHORIZATION, "Bearer valid-token")
        .contentType(MediaType.APPLICATION_JSON).content("{\"draft\":{\"title\":\"News\"}}"))
        .andExpect(status().isCreated()).andExpect(jsonPath("$.data.status").value("DRAFT"))
        .andExpect(jsonPath("$.data.version").value(1));
  }

  @Test
  public void protectedEndpointWithoutTokenUsesUnifiedEntryPoint() throws Exception {
    // missing token -> RestAuthenticationEntryPoint (status preserved at 403)
    mockMvc
        .perform(get("/v1/users/my"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"))
        .andExpect(jsonPath("$.cause").doesNotExist());
  }

  @Test
  public void insufficientRoleUsesUnifiedAccessDeniedHandler() throws Exception {
    // valid token but a role that matches no rule -> RestAccessDeniedHandler (403)
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_NOBODY"}, "tok", null));

    mockMvc
        .perform(get("/v1/users/my").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"))
        .andExpect(jsonPath("$.cause").doesNotExist());
  }

  @Test
  public void protectedEndpointWithValidRoleTokenIsAllowed() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));
    given(userService.getUserDetails(any())).willReturn(new UserResponse());

    mockMvc
        .perform(get("/v1/users/my").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk());
  }

  @Test
  public void publicEndpointStaysAccessibleWithoutToken() throws Exception {
    given(lrsService.getAvailableLrs()).willReturn(Collections.emptyList());

    mockMvc.perform(get("/v1/register/lrs")).andExpect(status().isOk());
  }

  @Test
  public void listUsersIsAllowedForSuperAdminAndOmitsPassword() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(
            new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    given(userService.listUsers(any()))
        .willReturn(
            new PageImpl<>(
                Collections.singletonList(
                    new AdminUserResponse(
                        "u1",
                        "Alice",
                        "alice@mail.com",
                        Collections.singletonList("ROLE_SUPER_ADMIN")))));

    mockMvc
        .perform(get("/v1/users?page=0&size=10").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.content[0].email").value("alice@mail.com"))
        .andExpect(jsonPath("$.data.content[0].enabled").value(true))
        .andExpect(jsonPath("$.data.content[0].password").doesNotExist());
  }

  @Test
  public void listUsersIsForbiddenForNormalUser() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(get("/v1/users").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  public void adminUsageIsAllowedForSuperAdmin() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(
            new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    given(adminUsageService.getUsage())
        .willReturn(
            new AdminUsageResponse(
                Collections.emptyList(), Collections.emptyList(), Collections.emptyList()));

    mockMvc
        .perform(get("/v1/admin/usage").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk());
  }

  @Test
  public void adminUsageIsForbiddenForNormalUser() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(get("/v1/admin/usage").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  public void adminUserDetailIsAllowedForSuperAdminAndOmitsSecrets() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(
            new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    given(userService.getUserDetailById(any()))
        .willReturn(
            new AdminUserDetailResponse(
                "u1",
                "Alice",
                "alice@mail.com",
                Collections.singletonList("ROLE_USER"),
                Collections.emptyList(),
                Collections.singletonList(
                    new AdminLrsProviderConnection("lrsP", "Provider LRS", "MBOX", 42, null, null))));

    mockMvc
        .perform(get("/v1/admin/users/u1").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.enabled").value(true))
        .andExpect(jsonPath("$.data.roles[0]").value("ROLE_USER"))
        .andExpect(jsonPath("$.data.lrsProviderConnections[0].lrsTitle").value("Provider LRS"))
        .andExpect(jsonPath("$.data.lrsProviderConnections[0].basicAuth").doesNotExist())
        .andExpect(jsonPath("$.data.lrsProviderConnections[0].basicSecret").doesNotExist())
        .andExpect(jsonPath("$.data.lrsProviderConnections[0].basicKey").doesNotExist())
        .andExpect(jsonPath("$.data.password").doesNotExist());
  }

  @Test
  public void adminUserDetailIsForbiddenForNormalUser() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(get("/v1/admin/users/u1").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  public void adminCanUpdateUserNameAndEmail() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(
            new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    given(userService.getUserDetailById(any()))
        .willReturn(
            new AdminUserDetailResponse(
                "u1",
                "Old Name",
                "old@mail.com",
                Collections.singletonList("ROLE_USER"),
                Collections.emptyList(),
                Collections.emptyList()));
    given(userService.updateUserByAdmin(any(), any()))
        .willReturn(
            new AdminUserDetailResponse(
                "u1",
                "New Name",
                "new@mail.com",
                Collections.singletonList("ROLE_USER"),
                Collections.emptyList(),
                Collections.emptyList()));

    mockMvc
        .perform(
            patch("/v1/admin/users/u1")
                .header(AUTHORIZATION, "Bearer valid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"New Name\",\"email\":\"new@mail.com\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.email").value("new@mail.com"))
        .andExpect(jsonPath("$.data.password").doesNotExist());
  }

  @Test
  public void adminCanReplaceUserRoles() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(
            new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    given(userService.getUserDetailById(any()))
        .willReturn(
            new AdminUserDetailResponse(
                "u1",
                "Alice",
                "alice@mail.com",
                Collections.singletonList("ROLE_USER"),
                Collections.emptyList(),
                Collections.emptyList()));
    given(userService.replaceUserRoles(any(), any()))
        .willReturn(
            new AdminUserDetailResponse(
                "u1",
                "Alice",
                "alice@mail.com",
                Collections.singletonList("ROLE_DATA_PROVIDER"),
                Collections.emptyList(),
                Collections.emptyList()));

    mockMvc
        .perform(
            patch("/v1/admin/users/u1/roles")
                .header(AUTHORIZATION, "Bearer valid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roles\":[\"ROLE_DATA_PROVIDER\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.roles[0]").value("ROLE_DATA_PROVIDER"));
  }

  @Test
  public void adminCanUpdateUserStatus() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(
            new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    given(userService.getUserDetailById(any()))
        .willReturn(
            new AdminUserDetailResponse(
                "u1",
                "Alice",
                "alice@mail.com",
                Collections.singletonList("ROLE_USER"),
                true,
                Collections.emptyList(),
                Collections.emptyList()));
    given(userService.setUserEnabled(any(), anyBoolean()))
        .willReturn(
            new AdminUserDetailResponse(
                "u1",
                "Alice",
                "alice@mail.com",
                Collections.singletonList("ROLE_USER"),
                false,
                Collections.emptyList(),
                Collections.emptyList()));

    mockMvc
        .perform(
            patch("/v1/admin/users/u1/status")
                .header(AUTHORIZATION, "Bearer valid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":false}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.enabled").value(false))
        .andExpect(jsonPath("$.data.password").doesNotExist());
  }

  @Test
  public void normalUserCannotUpdateUser() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(
            patch("/v1/admin/users/u1")
                .header(AUTHORIZATION, "Bearer valid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"x\",\"email\":\"x@mail.com\"}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  public void normalUserCannotReplaceRoles() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(
            patch("/v1/admin/users/u1/roles")
                .header(AUTHORIZATION, "Bearer valid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"roles\":[\"ROLE_USER\"]}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  public void normalUserCannotUpdateUserStatus() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(
            patch("/v1/admin/users/u1/status")
                .header(AUTHORIZATION, "Bearer valid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":false}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  // --- Plugin-management hardening: reload/populate are SUPER_ADMIN-only; reads stay open ---

  @Test
  public void legacyPluginDeletesStillRequireAnAdminToken() throws Exception {
    for (String path : new String[] {
        "/v1/analytics/methods/delete?fileName=x.jar", "/v1/analytics/methods/method-id",
        "/v1/visualizations/delete?fileName=x.jar", "/v1/visualizations/libraries/library-id",
        "/v1/visualizations/types/type-id"}) {
      // Preserve the existing unauthenticated contract (403 / AUTH_REQUIRED).
      mockMvc.perform(delete(path)).andExpect(status().isForbidden())
          .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"));
    }
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));
    for (String path : new String[] {
        "/v1/analytics/methods/delete?fileName=x.jar", "/v1/analytics/methods/method-id",
        "/v1/visualizations/delete?fileName=x.jar", "/v1/visualizations/libraries/library-id",
        "/v1/visualizations/types/type-id"}) {
      mockMvc.perform(delete(path).header(AUTHORIZATION, "Bearer valid-token"))
          .andExpect(status().isForbidden())
          .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }
  }

  @Test
  public void normalUserForbiddenOnAnalyticsReload() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(
            get("/v1/analytics/methods/reload?fileName=x.jar")
                .header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  public void normalUserForbiddenOnAnalyticsPopulate() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(get("/v1/analytics/methods/populate").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  public void normalUserForbiddenOnVisualizationReload() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(
            get("/v1/visualizations/reload?fileName=x.jar")
                .header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  public void superAdminAllowedOnAnalyticsReloadAndPopulate() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(
            new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));

    mockMvc
        .perform(
            get("/v1/analytics/methods/reload?fileName=x.jar")
                .header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk());
    mockMvc
        .perform(get("/v1/analytics/methods/populate").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk());
  }

  @Test
  public void superAdminAllowedOnVisualizationReload() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(
            new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));

    mockMvc
        .perform(
            get("/v1/visualizations/reload?fileName=x.jar")
                .header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk());
  }

  @Test
  public void normalUserCanStillReadAnalyticsMethods() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(get("/v1/analytics/methods").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk());
  }

  @Test
  public void normalUserCanStillReadVisualizationLibraries() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));
    given(visualizationLibraryService.getAllVisualizationLibraries())
        .willReturn(Collections.emptyList());

    mockMvc
        .perform(get("/v1/visualizations/libraries").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk());
  }

  // --- Catalog soft-disable admin endpoints (/v1/admin/...) ---

  @Test
  public void adminCanListAndToggleCatalog() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(
            new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    given(adminCatalogService.getVisualizationLibraries()).willReturn(Collections.emptyList());
    given(adminCatalogService.getVisualizationLibraryById(any()))
        .willReturn(new AdminVisLibraryResponse("L1", "creator", "name", "desc", true));
    given(adminCatalogService.setVisualizationLibraryEnabled(any(), anyBoolean()))
        .willReturn(new AdminVisLibraryResponse("L1", "creator", "name", "desc", false));

    mockMvc
        .perform(
            get("/v1/admin/visualizations/libraries").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk());
    mockMvc
        .perform(
            patch("/v1/admin/visualizations/libraries/L1/status")
                .header(AUTHORIZATION, "Bearer valid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":false}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.enabled").value(false));
  }

  @Test
  public void adminCanReadAuditLogs() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(
            new TokenRequest("admin@mail.com", new String[] {"ROLE_SUPER_ADMIN"}, "tok", null));
    given(adminAuditService.listAuditLogs(any())).willReturn(new PageImpl<>(Collections.emptyList()));

    mockMvc
        .perform(get("/v1/admin/audit-logs").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isOk());
  }

  @Test
  public void normalUserCannotReadAuditLogs() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(get("/v1/admin/audit-logs").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  public void normalUserCannotListCatalogAdmin() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(
            get("/v1/admin/analytics-methods").header(AUTHORIZATION, "Bearer valid-token"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }

  @Test
  public void normalUserCannotToggleCatalogStatus() throws Exception {
    given(tokenService.verifyToken(any()))
        .willReturn(new TokenRequest("user@mail.com", new String[] {"ROLE_USER"}, "tok", null));

    mockMvc
        .perform(
            patch("/v1/admin/analytics-methods/M1/status")
                .header(AUTHORIZATION, "Bearer valid-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":false}"))
        .andExpect(status().isForbidden())
        .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
  }
}
