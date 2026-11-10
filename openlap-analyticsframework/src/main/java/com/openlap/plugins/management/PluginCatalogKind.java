package com.openlap.plugins.management;

import java.util.Arrays;
import java.util.List;

public enum PluginCatalogKind {
  ANALYTICS_METHOD("analytics-technique", "name", "description", "creator"),
  VISUALIZATION_LIBRARY("visualization-library", "name", "description", "creator"),
  VISUALIZATION_TYPE("visualization-type", "name", "description");

  public final String collection;
  public final List<String> editableFields;

  PluginCatalogKind(String collection, String... fields) {
    this.collection = collection;
    this.editableFields = Arrays.asList(fields);
  }
}
