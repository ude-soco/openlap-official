package com.openlap.community;

import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/** Only fields approved for the community pool may reach the passage encoder. */
record CommunitySearchDocument(String id, String type, String method, String chart, Map<Field, String> passages) {
  enum Field {
    NAME(4), ACTIVITY_TYPES(4), ACTIONS(4), METHOD_NAME(3), METHOD_DESCRIPTION(3), CHART(2),
    PLATFORM(1), SPECIFIC_ACTIVITIES(1);

    final int weight;
    Field(int weight) { this.weight = weight; }
  }

  CommunitySearchDocument {
    var present = new EnumMap<Field, String>(Field.class);
    passages.forEach((field, value) -> {
      if (value != null && !value.isBlank()) present.put(field, value.strip());
    });
    passages = Collections.unmodifiableMap(present);
  }

  String title() { return passages.getOrDefault(Field.NAME, ""); }

  String fingerprint() {
    // Enum order and structured JSON make the key independent of Mongo field order.
    return CommunityIscTemplate.hash(CommunitySanitizer.json(
        List.of("weighted-pool-v1", CommunitySearchEncoder.VERSION, type, method, chart, passages)));
  }

  float[] embed(CommunitySearchEncoder encoder) {
    float[] sum = null;
    for (var passage : passages.entrySet()) {
      float[] vector = encoder.document(passage.getValue());
      if (sum == null) sum = new float[vector.length];
      if (vector.length != sum.length) throw new IllegalStateException("Inconsistent passage dimensions");
      for (int i = 0; i < sum.length; i++) sum[i] += passage.getKey().weight * vector[i];
    }
    if (sum == null) throw new IllegalStateException("Indicator has no public search fields");
    double norm = 0;
    for (float value : sum) norm += (double) value * value;
    if (!Double.isFinite(norm) || norm == 0) throw new IllegalStateException("Invalid indicator embedding");
    // L2-normalizing the weighted mean cancels its common denominator.
    double length = Math.sqrt(norm);
    for (int i = 0; i < sum.length; i++) sum[i] = (float) (sum[i] / length);
    return sum;
  }
}
