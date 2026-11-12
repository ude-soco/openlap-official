package com.openlap.isc_module.dto.response;

import com.openlap.isc_module.entities.IscStatus;
import lombok.*;

/**
 * Returned as the {@code data} of create / draft-create / publish / edit-draft responses so the
 * client learns the resulting row's id and status. The human-readable {@code message} stays on the
 * surrounding {@code ApiSuccess}, so existing clients that only read {@code message} keep working.
 */
@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IscMutationResponse {
  private String id;
  private IscStatus status;
}
