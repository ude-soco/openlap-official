package com.openlap.configurations;

import static org.assertj.core.api.Assertions.assertThat;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.openlap.analytics_module.entities.Indicator;
import com.openlap.analytics_module.entities.IndicatorAnalysisCache;
import com.openlap.analytics_module.entities.IndicatorCache;
import com.openlap.analytics_module.entities.IndicatorDrafts;
import com.openlap.analytics_module.entities.utility_entities.AnalyticsTechniqueReference;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.analytics_module.entities.utility_entities.VisualizationTechniqueReference;
import com.openlap.isc_module.entities.IndicatorSpecificationCard;
import org.bson.Document;
import org.junit.Test;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MongoConverter;

/** Existing indicator JSON remains opaque storage, without materializing external plugin DTOs. */
public class PersistedIndicatorModelCompatibilityTest {
  private static final String DATASET = "{\"columns\":{\"items\":{\"configurationData\":{"
      + "\"_class\":\"com.openlap.dataset.OpenLAPColumnConfigData\",\"id\":\"items\",\"type\":\"Text\"},"
      + "\"data\":[\"Alpha\",\"Beta\"]}}}";
  private static final String MAPPING = "{\"_class\":\"com.openlap.dataset.OpenLAPPortConfig\",\"mapping\":[]}";
  private static final String PARAMS = "[{\"_class\":\"com.openlap.dynamicparam.OpenLAPDynamicParam\","
      + "\"id\":\"limit\",\"value\":10}]";

  @Test
  public void persistedAnalysisAndVisualizationCachesKeepDatasetJsonAsStrings() {
    try (MongoClient client = client()) {
      MongoConverter converter = template(client).getConverter();
      IndicatorAnalysisCache analysis = new IndicatorAnalysisCache();
      analysis.setId("analysis-cache");
      analysis.setAnalyzedData(DATASET);
      Document analysisDocument = write(converter, analysis);
      assertThat(analysisDocument.get("analyzedData")).isEqualTo(DATASET).isInstanceOf(String.class);
      assertThat(converter.read(IndicatorAnalysisCache.class, analysisDocument).getAnalyzedData())
          .isEqualTo(DATASET);

      IndicatorCache visualization = new IndicatorCache();
      visualization.setId("visualization-cache");
      visualization.setIndicatorCode("<div>Fixture chart</div>");
      visualization.setAnalyzedDataset(DATASET);
      Document visualizationDocument = write(converter, visualization);
      assertThat(visualizationDocument.get("analyzedDataset")).isEqualTo(DATASET).isInstanceOf(String.class);
      IndicatorCache restored = converter.read(IndicatorCache.class, visualizationDocument);
      assertThat(restored.getAnalyzedDataset()).isEqualTo(DATASET);
      assertThat(restored.getIndicatorCode()).isEqualTo(visualization.getIndicatorCode());
    }
  }

  @Test
  public void savedIndicatorsKeepNestedMappingsParametersAndRequestJsonOpaque() {
    try (MongoClient client = client()) {
      MongoConverter converter = template(client).getConverter();
      Indicator source = new Indicator();
      source.setId("indicator");
      source.setName("Fixture indicator");
      source.setIndicatorType(IndicatorType.BASIC);
      source.setConfigurationRequest(DATASET);
      source.setAnalyticsTechniqueReference(new AnalyticsTechniqueReference(PARAMS, MAPPING, null));
      source.setVisualizationTechniqueReference(new VisualizationTechniqueReference(PARAMS, MAPPING, null, null));
      Document document = write(converter, source);

      assertThat(document.get("configurationRequest")).isEqualTo(DATASET).isInstanceOf(String.class);
      assertThat(document.get("analyticsTechniqueReference", Document.class).get("additionalParams"))
          .isEqualTo(PARAMS).isInstanceOf(String.class);
      assertThat(document.get("analyticsTechniqueReference", Document.class).get("queryToAnalyticsTechniqueMapping"))
          .isEqualTo(MAPPING).isInstanceOf(String.class);
      assertThat(document.get("visualizationTechniqueReference", Document.class).get("analyticsTechniqueToVisualizationMapping"))
          .isEqualTo(MAPPING).isInstanceOf(String.class);
      Indicator restored = converter.read(Indicator.class, document);
      assertThat(restored.getConfigurationRequest()).isEqualTo(DATASET);
      assertThat(restored.getAnalyticsTechniqueReference().getAdditionalParams()).isEqualTo(PARAMS);
      assertThat(restored.getAnalyticsTechniqueReference().getQueryToAnalyticsTechniqueMapping()).isEqualTo(MAPPING);
      assertThat(restored.getVisualizationTechniqueReference().getAdditionalParams()).isEqualTo(PARAMS);
      assertThat(restored.getVisualizationTechniqueReference().getAnalyticsTechniqueToVisualizationMapping()).isEqualTo(MAPPING);
    }
  }

  @Test
  public void cardAndIndicatorDraftsPreserveTheirSerializedPluginState() {
    try (MongoClient client = client()) {
      MongoConverter converter = template(client).getConverter();
      IndicatorDrafts draft = new IndicatorDrafts();
      draft.setId("draft");
      draft.setSession(DATASET);
      Document draftDocument = write(converter, draft);
      assertThat(draftDocument.get("session")).isEqualTo(DATASET).isInstanceOf(String.class);
      assertThat(converter.read(IndicatorDrafts.class, draftDocument).getSession()).isEqualTo(DATASET);

      IndicatorSpecificationCard card = new IndicatorSpecificationCard();
      card.setId("card");
      card.setRequirements(PARAMS);
      card.setDataset(DATASET);
      card.setVisRef(MAPPING);
      card.setLockedStep("{\"dataset\":{\"locked\":false}}");
      Document cardDocument = write(converter, card);
      assertThat(cardDocument.get("dataset")).isEqualTo(DATASET).isInstanceOf(String.class);
      IndicatorSpecificationCard restored = converter.read(IndicatorSpecificationCard.class, cardDocument);
      assertThat(restored.getDataset()).isEqualTo(DATASET);
      assertThat(restored.getVisRef()).isEqualTo(MAPPING);
      assertThat(restored.getRequirements()).isEqualTo(PARAMS);
      assertThat(restored.getLockedStep()).isEqualTo(card.getLockedStep());
    }
  }

  private static Document write(MongoConverter converter, Object source) {
    Document document = new Document();
    converter.write(source, document);
    return document;
  }

  private static MongoTemplate template(MongoClient client) {
    return MongoTemplateFactory.create(client, "indicator_model_compatibility");
  }

  private static MongoClient client() {
    return MongoClients.create("mongodb://127.0.0.1:1/?connectTimeoutMS=20&serverSelectionTimeoutMS=20");
  }
}
