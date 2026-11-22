package com.openlap.plugins;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openlap.dataset.OpenLAPColumnConfigData;
import com.openlap.dataset.OpenLAPColumnDataType;
import com.openlap.infrastructure.exception.ValidationException;
import com.openlap.plugins.analytics.AnalyticsManifest;
import com.openlap.template.AnalyticsMethod;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.jar.JarOutputStream;
import org.bson.Document;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

public class AnalyticsManifestTest {
  private static final String CLASS = "fixture.Analytics";
  @Rule public TemporaryFolder temporary = new TemporaryFolder();

  @Test public void inputAndOutputHintsReferenceRealPortsAndDeriveBasicRequirement() throws IOException {
    AnalyticsManifest parsed = read("""
        {"schemaVersion":1,"methods":[{
          "className":"fixture.Analytics","recommendedFor":["BASIC","MULTI_LEVEL"],
          "inputRoles":{"score":"SCORE","category":"CATEGORY","when":"TIMESTAMP"},
          "outputHints":{
            "result":{"primary":true,"format":"PERCENTAGE","role":"X","labelFromInput":"score"},
            "skipped":{"diagnostic":{"kind":"EXCLUDED","aggregation":"SUM","input":"score","summaryOnly":true}}
          }
        }]}
        """);
    Document metadata = parsed.metadata(CLASS, method());
    assertThat(metadata).containsEntry("basicInputRequirement", "SCORE_AND_CATEGORY");
    assertThat(metadata.getList("requiredInputRoles", String.class)).containsExactly("CATEGORY", "SCORE");
    assertThat(metadata.getList("recommendedFor", String.class)).containsExactly("BASIC", "MULTI_LEVEL");
    var result = metadata.get("outputHints", Document.class).get("result", Document.class);
    assertThat(result).containsEntry("labelFromInput", "score").containsEntry("format", "PERCENTAGE");
    assertThat(metadata).doesNotContainKey("className");
  }

  @Test public void rejectsUnknownClassesMalformedJsonAndUnboundedDescriptors() {
    for (String invalid : List.of(
        "{\"schemaVersion\":2,\"methods\":[]}",
        "{\"schemaVersion\":1,\"methods\":[{\"className\":\"fixture.Unknown\"}]}",
        "{\"schemaVersion\":1,\"methods\":[{\"className\":\"fixture.Analytics\"},{\"className\":\"fixture.Analytics\"}]}",
        "{\"schemaVersion\":1,\"schemaVersion\":1,\"methods\":[]}",
        "{\"schemaVersion\":1,\"methods\":[]} []",
        manifest("\"inputRoles\":{\"__proto__\":\"CATEGORY\"}"),
        manifest("\"outputHints\":{\"result\":{\"diagnostic\":{\"kind\":\"EXCLUDED\",\"aggregation\":\"OTHER\"}}}"),
        " ".repeat(129 * 1024))) {
      assertThatThrownBy(() -> read(invalid)).isInstanceOf(ValidationException.class);
    }
  }

  @Test public void rejectsMissingPortsIncompatibleTypesAndInvalidReferences() {
    for (String hint : List.of(
        "\"inputRoles\":{\"missing\":\"CATEGORY\"}",
        "\"inputRoles\":{\"score\":\"OUTCOME\"}",
        "\"outputHints\":{\"missing\":{\"primary\":true}}",
        "\"outputHints\":{\"label\":{\"format\":\"PERCENTAGE\"}}",
        "\"outputHints\":{\"result\":{\"labelFromInput\":\"missing\"}}")) {
      assertThatThrownBy(() -> read(manifest(hint)).metadata(CLASS, method())).isInstanceOf(ValidationException.class);
    }
  }

  private static String manifest(String fields) {
    return "{\"schemaVersion\":1,\"methods\":[{\"className\":\"" + CLASS + "\"," + fields + "}]}";
  }

  private AnalyticsManifest read(String declaration) throws IOException {
    Path jar = temporary.newFile().toPath();
    try (var output = new JarOutputStream(Files.newOutputStream(jar))) {
      output.putNextEntry(new JarEntry(AnalyticsManifest.RESOURCE));
      output.write(declaration.getBytes(StandardCharsets.UTF_8));
      output.closeEntry();
    }
    try (var archive = new JarFile(jar.toFile())) {
      return AnalyticsManifest.read(archive, List.of(CLASS));
    }
  }

  private AnalyticsMethod method() {
    AnalyticsMethod method = mock(AnalyticsMethod.class);
    when(method.getInputPorts()).thenReturn(List.of(
        port("score", OpenLAPColumnDataType.Numeric, true), port("category", OpenLAPColumnDataType.Text, true),
        port("when", OpenLAPColumnDataType.Text, false)));
    when(method.getOutputPorts()).thenReturn(List.of(port("result", OpenLAPColumnDataType.Numeric, true),
        port("skipped", OpenLAPColumnDataType.Numeric, true), port("label", OpenLAPColumnDataType.Text, true)));
    return method;
  }

  private OpenLAPColumnConfigData port(String id, OpenLAPColumnDataType type, boolean required) {
    return new OpenLAPColumnConfigData(id, type, required, id, "Fixture port");
  }
}
