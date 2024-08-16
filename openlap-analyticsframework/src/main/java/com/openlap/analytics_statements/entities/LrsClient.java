package com.openlap.analytics_statements.entities;

import com.openlap.analytics_statements.entities.utility_entities.ClientApi;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import lombok.*;
import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document("client")
public class LrsClient {
  @Id private String id;
  private ClientApi api;

  @Builder.Default
  private String authority =
      "{\"objectType\":\"Agent\",\"name\":\"New Client\",\"mbox\":\"mailto:hello@learninglocker.net\"}";

  @Builder.Default private boolean isTrusted = Boolean.TRUE;
  @Builder.Default private List<String> scopes = new ArrayList<>(Arrays.asList("xapi/all", "all"));
  private ObjectId organisation;
  private ObjectId lrs_id;
  private String title;
  private LocalDate updatedAt;
  private LocalDate createdAt;
}
