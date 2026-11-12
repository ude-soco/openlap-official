package com.openlap.configurations;

import static org.assertj.core.api.Assertions.assertThat;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.util.Map;
import org.bson.Document;
import org.junit.Test;
import org.springframework.data.mongodb.core.MongoTemplate;

/** Offline conversion checks: no database operations or collection/index changes are performed. */
public class MongoMappingCompatibilityTest {

  @Test
  public void typedBigNumbersAndNestedMapValuesKeepTheirLegacyStringRepresentation() {
    try (MongoClient client = client()) {
      MongoTemplate template = MongoTemplateFactory.create(client, "numeric_compatibility");
      NumericValue source = new NumericValue();
      source.decimal = new BigDecimal("12345.6700");
      source.integer = new BigInteger("12345678901234567890123456789012345678901234567890");
      source.metadata = Map.of("decimal", source.decimal, "integer", source.integer);
      Document written = new Document();

      template.getConverter().write(source, written);

      assertThat(written.get("decimal")).isEqualTo("12345.6700");
      assertThat(written.get("integer")).isEqualTo(source.integer.toString());
      Document metadata = written.get("metadata", Document.class);
      assertThat(metadata.get("decimal")).isEqualTo("12345.6700");
      assertThat(metadata.get("integer")).isEqualTo(source.integer.toString());
      NumericValue restored = template.getConverter().read(NumericValue.class, written);
      assertThat(restored.decimal).isEqualTo(source.decimal);
      assertThat(restored.integer).isEqualTo(source.integer);
      assertThat(restored.metadata).containsEntry("decimal", "12345.6700")
          .containsEntry("integer", source.integer.toString());
    }
  }

  @Test
  public void legacyStoredStringsStillReadIntoTypedBigNumbersWithoutChangingPrecision() {
    try (MongoClient client = client()) {
      MongoTemplate template = MongoTemplateFactory.create(client, "legacy_numeric_compatibility");
      Document legacy = new Document("decimal", "0.000000000000000000000000000012300")
          .append("integer", "12345678901234567890123456789012345678901234567890");

      NumericValue restored = template.getConverter().read(NumericValue.class, legacy);

      assertThat(restored.decimal).isEqualTo(new BigDecimal(legacy.getString("decimal")));
      assertThat(restored.integer).isEqualTo(new BigInteger(legacy.getString("integer")));
    }
  }

  @Test
  public void rootMapValuesUseTheSameLegacyBigNumberConversions() {
    try (MongoClient client = client()) {
      MongoTemplate template = MongoTemplateFactory.create(client, "map_numeric_compatibility");
      Document written = new Document();

      template.getConverter().write(Map.of("decimal", new BigDecimal("1.200"),
          "integer", new BigInteger("12345678901234567890")), written);

      assertThat(written.get("decimal")).isEqualTo("1.200");
      assertThat(written.get("integer")).isEqualTo("12345678901234567890");
    }
  }

  private MongoClient client() {
    return MongoClients.create("mongodb://127.0.0.1:1/?connectTimeoutMS=20&serverSelectionTimeoutMS=20");
  }

  static class NumericValue {
    public BigDecimal decimal;
    public BigInteger integer;
    public Map<String, Object> metadata;
  }
}
