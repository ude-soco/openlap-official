package com.openlap.configurations;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * Mongo configuration for the Learning Locker LRS database ({@code learninglocker_v2}).
 *
 * <p>Self-contained with uniquely named beans (see {@link PrimaryMongoConfig} for why we no longer
 * extend {@code AbstractMongoClientConfiguration}). Repositories under {@code
 * com.openlap.analytics_statements.repositories} and any {@code @Qualifier("secondaryMongoTemplate")}
 * injection point bind to this template, which always targets the secondary database.
 */
@Configuration
@EnableMongoRepositories(
    basePackages = "com.openlap.analytics_statements.repositories",
    mongoTemplateRef = "secondaryMongoTemplate")
public class SecondaryMongoConfig {

  @Value("${spring.data.mongodb.secondary.uri}")
  private String mongoURI;

  @Value("${spring.data.mongodb.secondary.database}")
  private String mongoDatabase;

  @Bean(name = "secondaryMongoClient")
  public MongoClient secondaryMongoClient() {
    return MongoClients.create(mongoURI);
  }

  @Bean(name = "secondaryMongoTemplate")
  public MongoTemplate secondaryMongoTemplate() {
    return new MongoTemplate(secondaryMongoClient(), mongoDatabase);
  }
}
