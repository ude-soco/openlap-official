package com.openlap.configurations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openlap.analytics_module.entities.AnalyticsQuestion;
import com.openlap.analytics_module.repositories.QuestionRepository;
import com.openlap.analytics_module.services.AnalyticsGoalsService;
import com.openlap.analytics_module.services.IndicatorService;
import com.openlap.analytics_module.services.IndicatorUtilityService;
import com.openlap.analytics_module.services.QuestionService;
import com.openlap.analytics_module.services.impl.QuestionServiceImpl;
import com.openlap.user.entities.User;
import com.openlap.user.services.TokenService;
import org.bson.types.ObjectId;
import org.junit.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.cache.autoconfigure.CacheAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockHttpServletRequest;

/** Exercises the production cache configuration and the real question-service cache annotations. */
public class CacheConfigurationTest {

  @Test
  public void autoConfiguredCacheManagerStillCachesBothQuestionQueries() {
    new ApplicationContextRunner()
        .withConfiguration(AutoConfigurations.of(CacheAutoConfiguration.class))
        .withUserConfiguration(CacheConfiguration.class, QuestionFixture.class)
        .run(context -> {
          assertThat(context).hasNotFailed().hasSingleBean(CacheManager.class);
          CacheManager manager = context.getBean(CacheManager.class);
          assertThat(manager).isInstanceOf(ConcurrentMapCacheManager.class);
          QuestionRepository repository = context.getBean(QuestionRepository.class);
          TokenService tokens = context.getBean(TokenService.class);
          when(repository.findAll(any(Pageable.class))).thenReturn(Page.<AnalyticsQuestion>empty());
          when(repository.findByCreatedBy_Id(any(ObjectId.class), any(Pageable.class)))
              .thenReturn(Page.<AnalyticsQuestion>empty());
          User user = new User();
          user.setId("000000000000000000000001");
          MockHttpServletRequest request = new MockHttpServletRequest();
          when(tokens.getUserFromToken(request)).thenReturn(user);

          QuestionService service = context.getBean(QuestionService.class);
          Page<?> available = service.getAllAvailableQuestions(0, 10, "name", "asc");
          assertThat(service.getAllAvailableQuestions(0, 10, "name", "asc")).isSameAs(available);
          Page<?> mine = service.getAllMyQuestions(request, 0, 10, "name", "asc");
          assertThat(service.getAllMyQuestions(request, 0, 10, "name", "asc")).isSameAs(mine);

          verify(repository, times(1)).findAll(any(Pageable.class));
          verify(repository, times(1)).findByCreatedBy_Id(any(ObjectId.class), any(Pageable.class));
          assertThat(manager.getCacheNames()).contains("questions", "myQuestions");
        });
  }

  @Configuration(proxyBeanMethods = false)
  static class QuestionFixture {
    @Bean QuestionRepository questionRepository() { return mock(QuestionRepository.class); }
    @Bean TokenService tokenService() { return mock(TokenService.class); }
    @Bean QuestionService questionService(QuestionRepository repository, TokenService tokens) {
      return new QuestionServiceImpl(repository, mock(AnalyticsGoalsService.class),
          mock(IndicatorUtilityService.class), mock(IndicatorService.class), tokens);
    }
  }
}
