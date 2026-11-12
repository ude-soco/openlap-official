package com.openlap.configurations;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.openlap.template.model.ChartConfiguration;
import com.openlap.visualization_methods.entities.VisType;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import org.bson.Document;
import org.junit.Test;
import org.springframework.data.mongodb.core.MongoTemplate;

/** Exercises the actual published template and the converter used by both production templates. */
public class ChartConfigurationCompatibilityTest {

  @Test
  public void allPublishedFlagsReadAndRoundTripUsingTheirStoredMongoFieldNames() throws Exception {
    List<Field> fields = flagFields();
    assertThat(fields).hasSize(28);
    try (MongoClient client = client()) {
      MongoTemplate template = MongoTemplateFactory.create(client, "chart_compatibility");
      // Every capability is tested independently so swapped constructor arguments cannot be hidden.
      for (Field enabled : fields) {
        Document legacy = new Document();
        for (Field field : fields) legacy.put(field.getName(), field.equals(enabled));
        VisType restored = template.getConverter().read(VisType.class,
            new Document("chartConfiguration", legacy));
        ChartConfiguration configuration = restored.getChartConfiguration();
        for (Field field : fields) {
          field.setAccessible(true);
          assertThat(field.getBoolean(configuration)).as(field.getName()).isEqualTo(field.equals(enabled));
        }

        Document roundTrip = new Document();
        template.getConverter().write(restored, roundTrip);
        assertThat(roundTrip.get("chartConfiguration", Document.class)).containsExactlyInAnyOrderEntriesOf(legacy);
      }
    }
  }

  @Test
  public void absentOrNullOptionalCapabilitiesStayDisabledAndGetterAliasesAreNotMongoFields() {
    try (MongoClient client = client()) {
      MongoTemplate template = MongoTemplateFactory.create(client, "chart_defaults");
      ChartConfiguration configuration = template.getConverter().read(ChartConfiguration.class,
          new Document("isShowHideLegendAvailable", null).append("showHideLegendAvailable", true));
      assertThat(configuration.isShowHideLegendAvailable()).isFalse();
      assertThat(configuration.isCategoriesFilteringAvailable()).isFalse();
    }
  }

  @Test
  public void storedNonBooleanCapabilitiesAreRejectedInsteadOfSilentlyChangingTheirMeaning() {
    try (MongoClient client = client()) {
      MongoTemplate template = MongoTemplateFactory.create(client, "chart_invalid");
      for (Object invalid : List.of("true", 1, List.of(true))) {
        assertThatThrownBy(() -> template.getConverter().read(ChartConfiguration.class,
            new Document("isShowHideLegendAvailable", invalid)))
            .hasRootCauseInstanceOf(IllegalArgumentException.class);
      }
    }
  }

  private List<Field> flagFields() {
    return Arrays.stream(ChartConfiguration.class.getDeclaredFields())
        .filter(field -> field.getType() == boolean.class && !Modifier.isStatic(field.getModifiers()))
        .collect(Collectors.toList());
  }

  private MongoClient client() {
    return MongoClients.create("mongodb://127.0.0.1:1/?connectTimeoutMS=20&serverSelectionTimeoutMS=20");
  }
}
