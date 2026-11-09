package com.openlap.plugins.artifacts;

public enum PluginKind {
  ANALYTICS("analytics"), VISUALIZATION("visualizations");

  private final String prefix;

  PluginKind(String prefix) { this.prefix = prefix; }

  public String prefix() { return prefix; }
}
