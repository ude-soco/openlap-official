package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.Gson;
import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.dataset.OpenLAPDataColumn;
import com.openlap.dataset.OpenLAPDataColumnFactory;
import com.openlap.dataset.OpenLAPDataSet;
import com.openlap.dataset.OpenLAPPortConfig;
import com.openlap.dataset.OpenLAPPortMapping;
import com.openlap.template.AnalyticsMethod;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.junit.Test;
import weka.clusterers.SimpleKMeans;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instances;
import weka.core.SerializationHelper;

/** Cross-library contracts used by saved indicators and installed analytics plugins. */
public class OpenLapDependencyCompatibilityTest {
  @Test
  public void legacyTypeAliasesReadWithoutChangingTheBrowserWireTypes() throws Exception {
    ObjectMapper mapper = new ObjectMapper();
    String legacy = "{\"columns\":{\"items\":{\"configurationData\":{\"id\":\"items\",\"type\":\"STRING\"},\"data\":[\"a\"]},"
        + "\"counts\":{\"configurationData\":{\"id\":\"counts\",\"type\":\"INTEGER\"},\"data\":[2]}}}";
    OpenLAPDataSet data = mapper.readValue(legacy, OpenLAPDataSet.class);
    assertThat(data.getColumns().get("items").getConfigurationData().getType())
        .isEqualTo(OpenLAPColumnDataType.Text);
    assertThat(data.getColumns().get("counts").getConfigurationData().getType())
        .isEqualTo(OpenLAPColumnDataType.Numeric);
    // The plugin's legacy toString labels must not become the public JSON enum values.
    assertThat(OpenLAPColumnDataType.Text.toString()).isEqualTo("STRING");
    assertThat(OpenLAPColumnDataType.Numeric.toString()).isEqualTo("INTEGER");
    var jackson = mapper.readTree(mapper.writeValueAsString(data)).path("columns");
    var gson = new Gson().toJsonTree(data).getAsJsonObject().getAsJsonObject("columns");
    assertThat(jackson.path("items").path("configurationData").path("type").asText()).isEqualTo("Text");
    assertThat(jackson.path("counts").path("configurationData").path("type").asText()).isEqualTo("Numeric");
    assertThat(gson.getAsJsonObject("items").getAsJsonObject("configurationData").get("type").getAsString()).isEqualTo("Text");
    assertThat(gson.getAsJsonObject("counts").getAsJsonObject("configurationData").get("type").getAsString()).isEqualTo("Numeric");
  }

  @Test
  public void equivalentPortsRemainFindableWhenDescriptiveMetadataChanges() {
    OpenLAPColumnConfigData installed = new OpenLAPColumnConfigData(
        "items", OpenLAPColumnDataType.Text, true, "Items", "Installed description");
    OpenLAPColumnConfigData saved = new OpenLAPColumnConfigData(
        "items", OpenLAPColumnDataType.Text, false, "Legacy title", null);
    assertThat(new HashSet<>(List.of(installed))).contains(saved);
    assertThat(installed.validateConfigurationDataCorrespondence(null)).isFalse();
    assertThat(installed.validateConfigurationDataTypeFromOutputPort(null)).isFalse();
  }

  @Test
  public void parameterlessAnalyticsMethodsCanInitializeAndExecute() throws Throwable {
    OpenLAPDataSet input = new OpenLAPDataSet();
    OpenLAPDataColumn<String> column = OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(
        "source", OpenLAPColumnDataType.Text, true, "Source", "");
    column.setData(new ArrayList<>(List.of("first", "second")));
    input.addOpenLAPDataColumn(column);
    AnalyticsMethod method = new ParameterlessMethod();
    OpenLAPPortConfig mapping = new OpenLAPPortConfig();
    mapping.getMapping().add(new OpenLAPPortMapping(
        column.getConfigurationData(), method.getInputPorts().get(0)));
    method.initialize(input, mapping);
    assertThat(method.execute().getColumns().get("items").getData()).containsExactly("first", "second");
  }

  @Test
  public void seededKMeansAndItsSerializedModelRetainTheirTwoSeparatedGroups() throws Exception {
    var attributes = new ArrayList<Attribute>();
    attributes.add(new Attribute("accesses"));
    attributes.add(new Attribute("annotations"));
    Instances data = new Instances("synthetic-plugin-compatibility", attributes, 6);
    for (double value : new double[] {0.0, 0.1, 0.2, 10.0, 10.1, 10.2})
      data.add(new DenseInstance(1.0, new double[] {value, value + 1.0}));
    SimpleKMeans model = new SimpleKMeans();
    model.setNumClusters(2);
    model.setSeed(10);
    model.setMaxIterations(10);
    model.buildClusterer(data);
    assertThat(model.clusterInstance(data.instance(0))).isEqualTo(model.clusterInstance(data.instance(2)));
    assertThat(model.clusterInstance(data.instance(3))).isEqualTo(model.clusterInstance(data.instance(5)));
    assertThat(model.clusterInstance(data.instance(0))).isNotEqualTo(model.clusterInstance(data.instance(3)));
    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
    SerializationHelper.write(bytes, model);
    SimpleKMeans restored = (SimpleKMeans) SerializationHelper.read(new ByteArrayInputStream(bytes.toByteArray()));
    for (int index = 0; index < data.numInstances(); index++)
      assertThat(restored.clusterInstance(data.instance(index))).isEqualTo(model.clusterInstance(data.instance(index)));
  }

  private static final class ParameterlessMethod extends AnalyticsMethod {
    private ParameterlessMethod() throws Exception {
      OpenLAPDataSet input = new OpenLAPDataSet();
      input.addOpenLAPDataColumn(OpenLAPDataColumnFactory.createOpenLAPDataColumnOfType(
          "items", OpenLAPColumnDataType.Text, true, "Items", ""));
      setInput(input);
      setOutput(new OpenLAPDataSet());
    }

    @Override protected void implementationExecution() { setOutput(getInput()); }
    @Override public Boolean hasPMML() { return false; }
    @Override public InputStream getPMMLInputStream() { return null; }
    @Override public String getAnalyticsMethodName() { return "Parameterless compatibility fixture"; }
    @Override public String getAnalyticsMethodDescription() { return "Passes mapped synthetic data through"; }
    @Override public String getAnalyticsMethodCreator() { return "Test fixture"; }
  }
}
