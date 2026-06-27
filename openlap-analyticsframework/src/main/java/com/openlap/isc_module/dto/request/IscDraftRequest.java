package com.openlap.isc_module.dto.request;

import lombok.*;

/**
 * Draft-friendly request body for autosaving an in-progress ISC.
 *
 * <p>Unlike {@link IscRequest}, the four JSON slices are intentionally NOT {@code @NotBlank}: a
 * draft may be incomplete (e.g. dataset/visRef not chosen yet). The stricter {@link IscRequest}
 * is still used for legacy create/update and for publishing a finalized ISC, so finalized cards
 * keep their required-field guarantees. (Validation is relaxed only on the draft path.)
 */
@Data
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class IscDraftRequest {
  private String requirements;
  private String dataset;
  private String visRef;
  private String lockedStep;
}
