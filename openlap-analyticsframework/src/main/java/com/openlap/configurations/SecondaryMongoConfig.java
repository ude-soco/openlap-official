package com.openlap.configurations;

import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDbFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDbFactory;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
    basePackages = "com.openlap.analytics_statements.repositories",
    mongoTemplateRef = "secondaryMongoTemplate")
public class SecondaryMongoConfig {

  @Value("${spring.data.mongodb.secondary.uri}")
  private String secondaryUri;

  @Bean(name = "secondaryMongoClient")
  public MongoClient secondaryMongoClient() {
    return MongoClients.create(secondaryUri);
  }

  @Bean(name = "secondaryMongoDbFactory")
  public MongoDbFactory secondaryMongoDbFactory(
      @Qualifier("secondaryMongoClient") MongoClient client) {

    String db = new ConnectionString(secondaryUri).getDatabase();
    return new SimpleMongoClientDbFactory(client, db);
  }

  @Bean(name = "secondaryMongoTemplate")
  public MongoTemplate secondaryMongoTemplate(
      @Qualifier("secondaryMongoDbFactory") MongoDbFactory factory) {
    return new MongoTemplate(factory);
  }
}
