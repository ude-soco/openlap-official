package com.openlap.configurations;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.AbstractMongoClientConfiguration;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
    basePackages = "com.openlap.analytics_statements.repositories",
    mongoTemplateRef = "secondaryMongoTemplate")
public class SecondaryMongoConfig extends AbstractMongoClientConfiguration {

  @Value("${spring.data.mongodb.secondary.uri}")
  private String mongoURI;

  @Value("${spring.data.mongodb.secondary.database}")
  private String mongoDatabase;

  @Override
  public MongoClient mongoClient() {
    return MongoClients.create(mongoURI);
  }

  @Override
  protected String getDatabaseName() {
    return mongoDatabase;
  }

  @Bean(name = "secondaryMongoTemplate")
  public MongoTemplate secondaryMongoTemplate() {
    return new MongoTemplate(mongoClient(), getDatabaseName());
  }
}
