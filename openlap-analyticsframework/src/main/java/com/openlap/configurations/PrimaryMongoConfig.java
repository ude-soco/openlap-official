package com.openlap.configurations;

import com.mongodb.ConnectionString;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.mongodb.MongoDbFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDbFactory;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

@Configuration
@EnableMongoRepositories(
    basePackages = {
      "com.openlap.analytics_module.repositories",
      "com.openlap.analytics_technique.repositories",
      "com.openlap.user.repositories",
      "com.openlap.visualization_methods.repositories",
      "com.openlap.isc_module.repositories"
    },
    mongoTemplateRef = "primaryMongoTemplate")
public class PrimaryMongoConfig {

  @Value("${spring.data.mongodb.primary.uri}")
  private String primaryUri;

  @Primary
  @Bean(name = "primaryMongoClient")
  public MongoClient primaryMongoClient() {
    return MongoClients.create(primaryUri);
  }

  @Primary
  @Bean(name = "primaryMongoDbFactory")
  public MongoDbFactory primaryMongoDbFactory(@Qualifier("primaryMongoClient") MongoClient client) {

    String db = new ConnectionString(primaryUri).getDatabase();
    return new SimpleMongoClientDbFactory(client, db);
  }

  @Primary
  @Bean(name = "primaryMongoTemplate")
  public MongoTemplate primaryMongoTemplate(
      @Qualifier("primaryMongoDbFactory") MongoDbFactory factory) {
    return new MongoTemplate(factory);
  }
}
