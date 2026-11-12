package com.openlap.configurations;

import com.mongodb.client.MongoClient;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.SimpleMongoClientDatabaseFactory;
import org.springframework.data.mongodb.core.convert.DefaultDbRefResolver;
import org.springframework.data.mongodb.core.convert.MappingMongoConverter;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions;
import org.springframework.data.mongodb.core.convert.MongoCustomConversions.BigDecimalRepresentation;
import org.springframework.data.mongodb.core.mapping.MongoMappingContext;

/** Preserves the existing BSON representation and index policy across Spring Data upgrades. */
public final class MongoTemplateFactory {
  private MongoTemplateFactory() {}

  public static MongoTemplate create(MongoClient client, String database) {
    SimpleMongoClientDatabaseFactory factory = new SimpleMongoClientDatabaseFactory(client, database);
    // Spring Data 5 no longer defaults big-number conversion. Existing documents use strings.
    MongoCustomConversions conversions = MongoCustomConversions.create(
        adapter -> adapter.bigDecimal(BigDecimalRepresentation.STRING)
            .registerConverter(new ChartConfigurationReadConverter()));
    MongoMappingContext context = new MongoMappingContext();
    context.setSimpleTypeHolder(conversions.getSimpleTypeHolder());
    // Match Spring Data 2's policy; existing explicit and annotation-based indexes stay authoritative.
    context.setAutoIndexCreation(true);
    context.afterPropertiesSet();

    MappingMongoConverter converter = new MappingMongoConverter(new DefaultDbRefResolver(factory), context);
    converter.setCustomConversions(conversions);
    converter.setCodecRegistryProvider(factory);
    converter.afterPropertiesSet();
    return new MongoTemplate(factory, converter);
  }
}
