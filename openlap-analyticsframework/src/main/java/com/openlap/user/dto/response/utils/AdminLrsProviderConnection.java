package com.openlap.user.dto.response.utils;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A user's LRS connection as a data provider, for the admin user-detail view.
 *
 * <p>Secret-stripped on purpose: built from the {@code LrsStore} only. It does NOT carry — and the
 * mapping never resolves — the {@code LrsClient}/{@code ClientApi} credentials
 * ({@code basic_auth}/{@code basic_secret}/{@code basic_key}). This is the deliberate replacement
 * for {@code LrsProviderResponse}, which exposes {@code basicAuth}.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AdminLrsProviderConnection {
  private String lrsId;
  private String lrsTitle;
  private String uniqueIdentifierType;
  private Integer statementCount;
  private LocalDate createdAt;
  private LocalDate updatedAt;
}
