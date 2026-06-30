package com.openlap.admin.services.impl;

import static org.assertj.core.api.Assertions.assertThat;

import com.mongodb.DBRef;
import com.openlap.admin.dto.AdminUsageResponse;
import com.openlap.admin.dto.UsageCount;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.Test;

/** Unit tests for the in-memory usage tally (no MongoDB). */
public class AdminUsageServiceImplTest {

  private static final String USER_A = "aaaaaaaaaaaaaaaaaaaaaaaa";
  private static final String USER_B = "bbbbbbbbbbbbbbbbbbbbbbbb";
  private static final String LIB = "cccccccccccccccccccccccc";
  private static final String TYPE_1 = "dddddddddddddddddddddddd";
  private static final String TYPE_2 = "eeeeeeeeeeeeeeeeeeeeeeee";
  private static final String METHOD = "ffffffffffffffffffffffff";

  private static Document indicator(
      String userHex, String libHex, String typeHex, String methodHex) {
    Document doc = new Document();
    if (userHex != null) {
      doc.put("createdBy", new DBRef("openlap-users", new ObjectId(userHex)));
    }
    if (libHex != null || typeHex != null) {
      Document vis = new Document();
      if (libHex != null) {
        vis.put("visLibrary", new DBRef("visualization-library", new ObjectId(libHex)));
      }
      if (typeHex != null) {
        vis.put("visType", new DBRef("visualization-type", new ObjectId(typeHex)));
      }
      doc.put("visualizationTechniqueReference", vis);
    }
    if (methodHex != null) {
      Document analysis = new Document();
      analysis.put("analyticsTechnique", new DBRef("analytics-technique", new ObjectId(methodHex)));
      doc.put("analyticsTechniqueReference", analysis);
    }
    return doc;
  }

  private static Map<String, UsageCount> byId(List<UsageCount> list) {
    return list.stream().collect(Collectors.toMap(UsageCount::getId, count -> count));
  }

  @Test
  public void countsIndicatorsAndUniqueUsersPerReference() {
    List<Document> indicators =
        Arrays.asList(
            indicator(USER_A, LIB, TYPE_1, METHOD),
            indicator(USER_A, LIB, TYPE_1, METHOD),
            indicator(USER_B, LIB, TYPE_2, METHOD));

    AdminUsageResponse usage = AdminUsageServiceImpl.computeUsage(indicators);

    Map<String, UsageCount> libraries = byId(usage.getVisualizationLibraries());
    assertThat(libraries.get(LIB).getIndicatorCount()).isEqualTo(3);
    assertThat(libraries.get(LIB).getUniqueUserCount()).isEqualTo(2);

    Map<String, UsageCount> types = byId(usage.getVisualizationTypes());
    assertThat(types.get(TYPE_1).getIndicatorCount()).isEqualTo(2);
    assertThat(types.get(TYPE_1).getUniqueUserCount()).isEqualTo(1);
    assertThat(types.get(TYPE_2).getIndicatorCount()).isEqualTo(1);

    Map<String, UsageCount> methods = byId(usage.getAnalyticsMethods());
    assertThat(methods.get(METHOD).getIndicatorCount()).isEqualTo(3);
    assertThat(methods.get(METHOD).getUniqueUserCount()).isEqualTo(2);
  }

  @Test
  public void handlesNullAndMissingReferencesSafely() {
    List<Document> indicators =
        Arrays.asList(
            indicator(USER_A, LIB, null, null), // composite-like: no type, no method
            indicator(null, LIB, TYPE_1, METHOD), // no createdBy
            new Document(), // empty doc
            null); // null doc

    AdminUsageResponse usage = AdminUsageServiceImpl.computeUsage(indicators);

    Map<String, UsageCount> libraries = byId(usage.getVisualizationLibraries());
    assertThat(libraries.get(LIB).getIndicatorCount()).isEqualTo(2);
    // Only USER_A is a known creator; the second indicator had no createdBy.
    assertThat(libraries.get(LIB).getUniqueUserCount()).isEqualTo(1);

    Map<String, UsageCount> types = byId(usage.getVisualizationTypes());
    assertThat(types.get(TYPE_1).getIndicatorCount()).isEqualTo(1);

    Map<String, UsageCount> methods = byId(usage.getAnalyticsMethods());
    assertThat(methods.get(METHOD).getIndicatorCount()).isEqualTo(1);
    assertThat(methods.get(METHOD).getUniqueUserCount()).isEqualTo(0);
  }
}
