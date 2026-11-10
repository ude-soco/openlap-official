package com.openlap.plugins.management;

import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.bson.Document;

/** Only bounded, plain metadata is persisted; no plugin instances cross the inspection boundary. */
@Getter
@Setter
public class PluginInspection {
  private List<String> classes = new ArrayList<>();
  private String libraryClass;
  private Document library;
  private List<Document> entries = new ArrayList<>();
}
