package com.openlap.user.entities;

import com.openlap.user.entities.utility_entities.LrsConsumer;
import com.openlap.user.entities.utility_entities.LrsProvider;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Document("openlap-users")
public class User {
  @Id private String id;
  private String name;
  private String email;
  private String password;
  @DBRef private Collection<Role> roles = new ArrayList<>();
  private List<LrsProvider> lrsProviderList = new ArrayList<>();
  private List<LrsConsumer> lrsConsumerList = new ArrayList<>();
}
