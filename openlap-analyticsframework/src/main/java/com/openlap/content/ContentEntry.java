package com.openlap.content;

import java.time.Instant;
import java.util.Map;
import lombok.Data;
import org.springframework.data.annotation.Id;

/** Draft and public snapshots live in one document so publishing is atomic. */
@Data
public class ContentEntry {
  @Id private String id;
  private String status;
  private Map<String, Object> draft;
  private Map<String, Object> published;
  private long version;
  private Instant createdAt;
  private Instant updatedAt;
  private Instant deletedAt;
  private String createdBy;
  private String updatedBy;
  @com.fasterxml.jackson.annotation.JsonIgnore private long sortOrder;

  public boolean isHasUnpublishedChanges() {
    return published != null && !published.equals(draft);
  }
}
