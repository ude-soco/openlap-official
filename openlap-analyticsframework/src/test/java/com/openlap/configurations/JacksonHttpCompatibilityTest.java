package com.openlap.configurations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openlap.infrastructure.error.ApiErrorResponseFactory;
import com.openlap.infrastructure.web.GlobalApiExceptionHandler;
import com.openlap.response.ApiSuccess;
import com.openlap.visualization_methods.dto.VisualizationLibraryResponse;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.junit.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.http.converter.autoconfigure.HttpMessageConvertersAutoConfiguration;
import org.springframework.boot.jackson.autoconfigure.JacksonAutoConfiguration;
import org.springframework.boot.jackson2.autoconfigure.Jackson2AutoConfiguration;
import org.springframework.boot.test.context.runner.WebApplicationContextRunner;
import org.springframework.boot.webmvc.autoconfigure.WebMvcAutoConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.support.ResourcePropertySource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerAdapter;

/** Verifies the real Boot 4 HTTP converter keeps existing Jackson 2 response and error contracts. */
public class JacksonHttpCompatibilityTest {

  @Test
  public void applicationDefaultsChooseTheJackson2HttpConverterEvenWhenJackson3IsPresent() {
    runner().run(context -> {
      assertThat(context).hasNotFailed().hasSingleBean(ObjectMapper.class);
      RequestMappingHandlerAdapter adapter = context.getBean(RequestMappingHandlerAdapter.class);
      assertThat(adapter.getMessageConverters().stream()
          .filter(converter -> converter.canWrite(ApiSuccess.class, MediaType.APPLICATION_JSON))
          .findFirst().orElseThrow()).isInstanceOf(MappingJackson2HttpMessageConverter.class);

      MockMvc mvc = MockMvcBuilders.webAppContextSetup(context).build();
      mvc.perform(get("/compatibility"))
          .andExpect(status().isOk())
          .andExpect(jsonPath("$.httpStatus").value("OK"))
          .andExpect(jsonPath("$.message").value("Existing API contract"))
          .andExpect(jsonPath("$.data.id").value("library-1"))
          .andExpect(jsonPath("$.data.name").value("Charts"))
          .andExpect(jsonPath("$.data.creator").doesNotExist())
          .andExpect(jsonPath("$.data.description").doesNotExist());
    });
  }

  @Test
  public void invalidEnumStillUsesTheExistingStructuredMalformedRequestHandler() {
    runner().run(context -> {
      MockMvc mvc = MockMvcBuilders.webAppContextSetup(context).build();
      mvc.perform(post("/compatibility")
              .contentType(MediaType.APPLICATION_JSON)
              .content("{\"status\":\"INVALID_STATUS\"}"))
          .andExpect(status().isBadRequest())
          .andExpect(jsonPath("$.status").value(400))
          .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
          .andExpect(jsonPath("$.details.fieldErrors[0].field").value("status"))
          .andExpect(jsonPath("$.httpStatus").value("BAD_REQUEST"))
          .andExpect(jsonPath("$.cause").doesNotExist());
    });
  }

  private WebApplicationContextRunner runner() {
    return new WebApplicationContextRunner()
        .withInitializer(context -> {
          // Exercise the checked-in preference without inheriting an operator's environment.
          context.getEnvironment().getPropertySources()
              .remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
          context.getEnvironment().getPropertySources()
              .remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
          try {
            context.getEnvironment().getPropertySources()
                .addLast(new ResourcePropertySource("classpath:application.properties"));
          } catch (IOException exception) {
            throw new UncheckedIOException(exception);
          }
        })
        .withConfiguration(AutoConfigurations.of(
            JacksonAutoConfiguration.class, Jackson2AutoConfiguration.class,
            HttpMessageConvertersAutoConfiguration.class, WebMvcAutoConfiguration.class))
        .withUserConfiguration(HttpFixture.class);
  }

  @Configuration(proxyBeanMethods = false)
  static class HttpFixture {
    @Bean CompatibilityController compatibilityController() { return new CompatibilityController(); }
    @Bean GlobalApiExceptionHandler errorHandler() {
      return new GlobalApiExceptionHandler(new ApiErrorResponseFactory(true));
    }
  }

  @RestController
  static class CompatibilityController {
    @GetMapping("/compatibility")
    ApiSuccess getResponse() {
      return new ApiSuccess(HttpStatus.OK, "Existing API contract",
          new VisualizationLibraryResponse("library-1", null, "Charts", null));
    }

    @PostMapping("/compatibility")
    ApiSuccess readRequest(@RequestBody EnumRequest request) {
      return new ApiSuccess(request.status, "Existing API contract");
    }
  }

  static class EnumRequest {
    public HttpStatus status;
  }
}
