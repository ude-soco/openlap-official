package com.openlap.configurations;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * Mongo configuration for the OpenLAP application database ({@code openlap_v2}).
 *
 * <p>This config is intentionally self-contained and does NOT extend {@code
 * AbstractMongoClientConfiguration}. Extending it in both this class and {@link SecondaryMongoConfig}
 * caused the inherited infrastructure beans ({@code mongoClient}, {@code mongoDbFactory}, {@code
 * mongoTemplate}, ...) to be registered under identical names from two configs, so "last one wins"
 * during component scan and the primary template would non-deterministically point at the secondary
 * database. Each config now owns uniquely named beans and builds its {@link MongoTemplate} directly
 * from its own client + explicit database name.
 */
@Configuration
@EnableMongoRepositories(
    basePackages = {
      "com.openlap.analytics_module.repositories",
      "com.openlap.analytics_technique.repositories",
      "com.openlap.admin.audit",
      "com.openlap.user.repositories",
      "com.openlap.visualization_methods.repositories",
      "com.openlap.isc_module.repositories"
    },
    mongoTemplateRef = "primaryMongoTemplate")
public class PrimaryMongoConfig {

  @Value("${spring.data.mongodb.primary.uri}")
  private String mongoURI;

  @Value("${spring.data.mongodb.primary.database}")
  private String mongoDatabase;

  @Primary
  @Bean(name = "primaryMongoClient")
  public MongoClient primaryMongoClient() {
    return MongoClients.create(mongoURI);
  }

  @Primary
  @Bean(name = "primaryMongoTemplate")
  public MongoTemplate primaryMongoTemplate() {
    return new MongoTemplate(primaryMongoClient(), mongoDatabase);
  }
}
