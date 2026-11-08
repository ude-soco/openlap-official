package com.openlap.content.migration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.openlap.content.ContentValidator;
import java.util.Arrays;
import org.springframework.data.mongodb.core.MongoTemplate;

/** Standalone command: connects only to primary MongoDB and starts no HTTP server. */
public final class ContentMigrationApplication {
  private ContentMigrationApplication() {}

  public static void main(String[] args) throws Exception {
    String uri = System.getenv().getOrDefault("MONGODB_PRIMARY_URI", "mongodb://127.0.0.1:27017");
    String database = System.getenv().getOrDefault("OPENLAP_MONGODB_DB", "openlap_v2");
    boolean resume = Arrays.asList(args).contains("--resume-abandoned");
    MongoClient client = MongoClients.create(uri);
    try {
      MongoTemplate template = new MongoTemplate(client, database);
      boolean imported = new HomepageContentMigration(template, new ContentValidator(), new ObjectMapper()).migrate(resume);
      System.out.println(imported ? "Homepage content migrated: 7 news entries and 9 publications."
          : "Homepage content migration already completed; no content changed.");
    } finally { client.close(); }
  }
}
