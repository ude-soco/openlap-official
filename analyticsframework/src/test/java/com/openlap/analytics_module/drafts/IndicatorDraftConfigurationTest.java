package com.openlap.analytics_module.drafts;

import static org.assertj.core.api.Assertions.*;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.openlap.analytics_module.entities.utility_entities.IndicatorType;
import com.openlap.infrastructure.exception.ValidationException;
import org.junit.Test;

public class IndicatorDraftConfigurationTest {
  private final ObjectMapper mapper=new ObjectMapper();
  private final IndicatorDraftConfiguration configurations=new IndicatorDraftConfiguration(mapper);
  private ObjectNode basic() { return mapper.createObjectNode().put("schemaVersion",1).put("type","BASIC"); }
  @Test public void partialSelectionsAndTypedCustomizationsCanBeSavedWithoutRunningPlugins() {
    ObjectNode config=basic(); config.putObject("visualization").putObject("params").put("showLegend",false).put("threshold",0).put("data","Custom label");
    assertThat(configurations.validate(config,IndicatorType.BASIC,1)).isEqualTo(config);
    assertThat(configurations.validate(config,IndicatorType.BASIC,1)).isNotSameAs(config);
  }
  @Test public void resultRowsCatalogsAndCodeAreRejectedAtEveryAuthoringBoundary() {
    for(String section:new String[]{"dataset","filters","analysis","visualization"}) {
      ObjectNode config=basic(); config.putObject(section).putArray("catalog").addObject().put("id","secret");
      assertThatThrownBy(()->configurations.validate(config,IndicatorType.BASIC,1)).isInstanceOf(ValidationException.class);
    }
    for(String computed:new String[]{"analyzedData","previewData","scriptData","displayCode","inputs"}) {
      ObjectNode config=basic(); config.putObject("analysis").putObject(computed).put("code","arbitrary");
      assertThatThrownBy(()->configurations.validate(config,IndicatorType.BASIC,1)).isInstanceOf(ValidationException.class);
    }
  }
  @Test public void supportedComplexSourceMetadataIsPreservedWithoutCalculatedRows() throws Exception {
    JsonNode config=mapper.readTree("{\"schemaVersion\":1,\"type\":\"MULTI_LEVEL\",\"name\":\"Draft\",\"sources\":[{\"id\":\"source\",\"name\":\"Basic\",\"analyticsMethod\":{\"id\":\"method\",\"name\":\"Count\"},\"outputs\":[{\"id\":\"items\",\"type\":\"Numeric\",\"title\":\"Items\",\"required\":true}],\"filterSummary\":{\"timeframe\":\"Recent\"},\"measureColumnIds\":[\"items\"]}],\"analysis\":{\"methodId\":\"\",\"mapping\":{\"mapping\":[]},\"params\":[]},\"visualization\":{\"dataMode\":\"individual\",\"params\":{}}}");
    assertThat(configurations.validate(config,IndicatorType.MULTI_LEVEL,1)).isEqualTo(config);
    ((ObjectNode)config.path("sources").get(0)).putArray("data").add(1);
    assertThatThrownBy(()->configurations.validate(config,IndicatorType.MULTI_LEVEL,1)).isInstanceOf(ValidationException.class);
  }
  @Test public void schemaTypeDepthSizeAndUnsafeBsonKeysAreBounded() {
    assertThatThrownBy(()->configurations.validate(basic(),IndicatorType.COMPOSITE,1)).isInstanceOf(ValidationException.class);
    assertThatThrownBy(()->configurations.validate(basic(),IndicatorType.BASIC,2)).isInstanceOf(ValidationException.class);
    ObjectNode oversized=basic(); oversized.putObject("visualization").putObject("params").put("text","x".repeat(65537));
    assertThatThrownBy(()->configurations.validate(oversized,IndicatorType.BASIC,1)).isInstanceOf(ValidationException.class);
    ObjectNode nested=basic(); ObjectNode cursor=nested.putObject("visualization").putObject("params");
    for(int i=0;i<30;i++) cursor=cursor.putObject("nested");
    assertThatThrownBy(()->configurations.validate(nested,IndicatorType.BASIC,1)).isInstanceOf(ValidationException.class);
    ObjectNode unsafe=basic(); unsafe.putObject("visualization").putObject("params").put("$where","bad");
    assertThatThrownBy(()->configurations.validate(unsafe,IndicatorType.BASIC,1)).isInstanceOf(ValidationException.class);
  }
  @Test public void idempotencyHashIgnoresObjectPropertyOrdering() throws Exception {
    assertThat(configurations.hash(mapper.readTree("{\"b\":1,\"a\":{\"d\":2,\"c\":3}}")))
        .isEqualTo(configurations.hash(mapper.readTree("{\"a\":{\"c\":3,\"d\":2},\"b\":1}")));
  }
}
