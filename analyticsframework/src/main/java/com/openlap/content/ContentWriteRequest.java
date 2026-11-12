package com.openlap.content;

import java.util.Map;
import lombok.Data;

@Data
public class ContentWriteRequest {
  private Map<String, Object> draft;
  private Long version;
}
