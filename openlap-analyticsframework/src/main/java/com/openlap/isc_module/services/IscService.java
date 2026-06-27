package com.openlap.isc_module.services;

import com.openlap.isc_module.dto.request.IscDraftRequest;
import com.openlap.isc_module.dto.request.IscRequest;
import com.openlap.isc_module.dto.response.ISCResponse;
import com.openlap.isc_module.dto.response.IndicatorSpecificationCardResponse;
import com.openlap.isc_module.dto.response.IscMutationResponse;
import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import org.springframework.data.domain.Page;

public interface IscService {

  // ---- Legacy (kept for backward compatibility) ----

  /** Creates a finalized SAVED ISC. Now returns the new id + status. */
  IscMutationResponse createIsc(HttpServletRequest request, @Valid IscRequest isc);

  /** Updates a SAVED ISC in place (owner-checked; preserves createdOn, bumps updatedOn). */
  void updateIsc(HttpServletRequest request, String iscId, @Valid IscRequest isc);

  ISCResponse getISCById(HttpServletRequest request, String iscId);

  void deleteISCbyId(HttpServletRequest request, String iscId);

  /** Lists the caller's ISCs (saved + drafts). `status`/`search` are optional (blank = ignore). */
  Page<IndicatorSpecificationCardResponse> getAllMyISCs(
      HttpServletRequest request,
      int page,
      int size,
      String sortBy,
      String sortDirection,
      String status,
      String search);

  // ---- Draft lifecycle (Phase 0) ----

  /** Creates a new DRAFT (sourceId = null). Validation is relaxed (incomplete state allowed). */
  IscMutationResponse createDraft(HttpServletRequest request, IscDraftRequest draft);

  /** Autosaves an existing DRAFT (owner-checked). */
  void updateDraft(HttpServletRequest request, String draftId, IscDraftRequest draft);

  /** Finds the caller's existing edit draft for {@code sourceId}, or creates one (owner-checked). */
  IscMutationResponse createOrFindEditDraft(HttpServletRequest request, String sourceId);

  /**
   * Publishes a DRAFT. If it is a new draft (sourceId null) it becomes SAVED; if it is an edit
   * draft its content is merged into the source SAVED ISC and the draft is removed.
   */
  IscMutationResponse publishDraft(HttpServletRequest request, String draftId);

  /** Discards (deletes) a DRAFT, owner-checked. The source SAVED ISC (if any) is untouched. */
  void deleteDraft(HttpServletRequest request, String draftId);
}
