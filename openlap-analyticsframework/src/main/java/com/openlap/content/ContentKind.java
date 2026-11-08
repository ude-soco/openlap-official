package com.openlap.content;

import com.openlap.infrastructure.exception.NotFoundException;

public enum ContentKind {
  NEWS("news", "homepage_news"), PUBLICATIONS("publications", "homepage_publications");

  private final String path;
  private final String collection;

  ContentKind(String path, String collection) {
    this.path = path;
    this.collection = collection;
  }

  public String getPath() { return path; }
  public String getCollection() { return collection; }

  public static ContentKind from(String path) {
    for (ContentKind kind : values()) if (kind.path.equals(path)) return kind;
    throw new NotFoundException("Content type not found.");
  }
}
