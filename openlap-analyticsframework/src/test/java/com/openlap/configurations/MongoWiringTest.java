package com.openlap.configurations;

import static org.assertj.core.api.Assertions.assertThat;

import com.mongodb.client.MongoClient;
import com.openlap.analytics_statements.repositories.StatementRepository;
import com.openlap.user.repositories.RoleRepository;
import java.io.IOException;
import java.io.UncheckedIOException;
import org.junit.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.boot.test.context.assertj.AssertableApplicationContext;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.support.ResourcePropertySource;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.util.ReflectionTestUtils;

/** Regression coverage for the primary/secondary bean collision reported in issue #650. */
public class MongoWiringTest {

  // No database operations are performed. Closed loopback ports keep these tests independent
  // of installed MongoDB servers; the clients only create local database handles.
  private static final String PRIMARY_URI =
      "spring.data.mongodb.primary.uri=mongodb://127.0.0.1:1/?connectTimeoutMS=50&serverSelectionTimeoutMS=50";
  private static final String SECONDARY_URI =
      "spring.data.mongodb.secondary.uri=mongodb://127.0.0.1:2/?connectTimeoutMS=50&serverSelectionTimeoutMS=50";

  @Test
  public void primaryConfigurationRegisteredFirstKeepsTheDefaultDatabasesSeparate() {
    runner(false).run(context -> assertRouting(context, "openlap_v2", "learninglocker_v2"));
  }

  @Test
  public void secondaryConfigurationRegisteredFirstKeepsTheDefaultDatabasesSeparate() {
    runner(true).run(context -> assertRouting(context, "openlap_v2", "learninglocker_v2"));
  }

  @Test
  public void clientsAndTemplatesRemainSeparateWhenBothUrisUseTheSameServer() {
    runner(false)
        .withPropertyValues(SECONDARY_URI.replace(":2/", ":1/"))
        .run(context -> assertRouting(context, "openlap_v2", "learninglocker_v2"));
  }

  @Test
  public void environmentDatabaseNamesOverrideApplicationDefaults() {
    runner(false)
        .withPropertyValues("OPENLAP_MONGODB_DB=custom_openlap", "LRS_MONGODB_DB=custom_lrs")
        .run(context -> assertRouting(context, "custom_openlap", "custom_lrs"));
  }

  @Test
  public void explicitDatabaseNamesTakePrecedenceOverDatabasePathsInUris() {
    runner(true)
        .withPropertyValues(
            PRIMARY_URI.replace(":1/?", ":1/uri_primary?"),
            SECONDARY_URI.replace(":2/?", ":2/uri_secondary?"),
            "spring.data.mongodb.primary.database=explicit_primary",
            "spring.data.mongodb.secondary.database=explicit_secondary")
        .run(context -> assertRouting(context, "explicit_primary", "explicit_secondary"));
  }

  @Test
  public void blankPrimaryDatabaseFailsAtStartup() {
    runner(false)
        .withPropertyValues("spring.data.mongodb.primary.database= ")
        .run(
            context ->
                assertThat(context.getStartupFailure())
                    .hasRootCauseInstanceOf(IllegalArgumentException.class));
  }

  @Test
  public void blankSecondaryDatabaseFailsAtStartup() {
    runner(true)
        .withPropertyValues("spring.data.mongodb.secondary.database= ")
        .run(
            context ->
                assertThat(context.getStartupFailure())
                    .hasRootCauseInstanceOf(IllegalArgumentException.class));
  }

  private ApplicationContextRunner runner(boolean secondaryFirst) {
    return new ApplicationContextRunner()
        .withInitializer(
            context -> {
              ((DefaultListableBeanFactory) context.getBeanFactory())
                  .setAllowBeanDefinitionOverriding(false);
              // Exercise the real application defaults without inheriting a developer's DB settings.
              context
                  .getEnvironment()
                  .getPropertySources()
                  .remove(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME);
              context
                  .getEnvironment()
                  .getPropertySources()
                  .remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
              try {
                context
                    .getEnvironment()
                    .getPropertySources()
                    .addLast(new ResourcePropertySource("classpath:application.properties"));
              } catch (IOException e) {
                throw new UncheckedIOException(e);
              }
            })
        .withPropertyValues(PRIMARY_URI, SECONDARY_URI)
        .withUserConfiguration(
            secondaryFirst ? SecondaryMongoConfig.class : PrimaryMongoConfig.class,
            secondaryFirst ? PrimaryMongoConfig.class : SecondaryMongoConfig.class);
  }

  private void assertRouting(
      AssertableApplicationContext context,
      String primaryDatabase,
      String secondaryDatabase) {
    assertThat(context.getStartupFailure()).isNull();
    MongoTemplate primary = context.getBean("primaryMongoTemplate", MongoTemplate.class);
    MongoTemplate secondary = context.getBean("secondaryMongoTemplate", MongoTemplate.class);
    assertThat(primary.getDb().getName()).isEqualTo(primaryDatabase);
    assertThat(secondary.getDb().getName()).isEqualTo(secondaryDatabase);
    MongoClient primaryClient = context.getBean("primaryMongoClient", MongoClient.class);
    MongoClient secondaryClient = context.getBean("secondaryMongoClient", MongoClient.class);

    assertThat(context.getBeansOfType(MongoClient.class)).hasSize(2);
    assertThat(context.getBeansOfType(MongoTemplate.class)).hasSize(2);
    assertThat(primaryClient).isNotSameAs(secondaryClient);
    assertThat(primary).isNotSameAs(secondary);
    assertThat(((MongoMappingContext) primary.getConverter().getMappingContext()).isAutoIndexCreation()).isTrue();
    assertThat(((MongoMappingContext) secondary.getConverter().getMappingContext()).isAutoIndexCreation()).isTrue();
    assertThat(primary.getMongoDatabaseFactory()).isNotSameAs(secondary.getMongoDatabaseFactory());
    assertThat(context.getBean(MongoClient.class)).isSameAs(primaryClient);
    assertThat(context.getBean(MongoTemplate.class)).isSameAs(primary);
    assertThat(ReflectionTestUtils.getField(primary.getMongoDatabaseFactory(), "mongoClient"))
        .isSameAs(primaryClient);
    assertThat(ReflectionTestUtils.getField(secondary.getMongoDatabaseFactory(), "mongoClient"))
        .isSameAs(secondaryClient);

    assertRepositoryTemplate(context.getBean(RoleRepository.class), primary);
    assertRepositoryTemplate(context.getBean(StatementRepository.class), secondary);
  }

  private void assertRepositoryTemplate(Object repository, MongoTemplate expected) {
    Object target = AopTestUtils.getUltimateTargetObject(repository);
    assertThat(ReflectionTestUtils.getField(target, "mongoOperations")).isSameAs(expected);
  }
}
