package com.openlap.plugins.migration;

import com.openlap.plugins.artifacts.PluginKind;
import java.util.ArrayList;
import java.util.List;

/** Operator-reviewable file identities only; contains no credentials or plugin bytes. */
public class PluginArtifactManifest {
  public int version = 1;
  public List<Item> entries = new ArrayList<>();
  public List<Source> files = new ArrayList<>();

  public static class Item {
    public PluginKind kind;
    public String catalogId;
    public String recordedPath;
    public String sourcePath;
    public String sha256;
    public long sizeBytes;
    public String problem;
  }

  public static class Source {
    public String sourcePath;
    public String sha256;
    public long sizeBytes;
    public String problem;
  }
}
