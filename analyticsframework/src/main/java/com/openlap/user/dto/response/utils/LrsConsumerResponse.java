package com.openlap.user.dto.response.utils;

import lombok.*;

@Data
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LrsConsumerResponse {
  private String id;
  private String lrsId;
  private String lrsTitle;
  private String uniqueIdentifier;
}
