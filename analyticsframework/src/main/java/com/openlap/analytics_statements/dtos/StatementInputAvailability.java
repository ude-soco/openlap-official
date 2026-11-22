package com.openlap.analytics_statements.dtos;

import java.util.List;

/** Schema availability only, with no xAPI statement values or identifiers. */
public record StatementInputAvailability(
    int checkedStatements,
    boolean complete,
    List<String> availableFields,
    List<String> invalidFields,
    List<ScoreCategoryPair> scoreCategoryPairs) {
  public record ScoreCategoryPair(String score, String category) {}
}
