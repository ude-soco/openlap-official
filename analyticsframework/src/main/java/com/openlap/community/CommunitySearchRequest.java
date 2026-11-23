package com.openlap.community;

import com.openlap.infrastructure.exception.ValidationException;
import java.util.ArrayList;
import java.util.List;

/** Private POST body. Search text is never placed in a URL or persisted. */
public record CommunitySearchRequest(String mode, String text, String goalVerb, String goalDescription,
    String question, String indicatorDescription, String type, String method, String chart,
    Integer page, Integer size, String sortBy, String sortDirection) {

  public CommunitySearchRequest {
    mode = mode == null ? "basic" : mode;
    text = clean(text, 200);
    goalVerb = clean(goalVerb, 100);
    goalDescription = clean(goalDescription, 400);
    question = clean(question, 400);
    indicatorDescription = clean(indicatorDescription, 400);
    type = clean(type, 200);
    method = clean(method, 200);
    chart = clean(chart, 200);
    page = Math.max(0, Math.min(page == null ? 0 : page, 100_000));
    size = Math.max(1, Math.min(size == null ? 10 : size, 100));
    sortBy = sortBy == null ? "relevance" : sortBy;
    sortDirection = "asc".equalsIgnoreCase(sortDirection) ? "asc" : "desc";
  }

  void validate() {
    if (!List.of("basic", "advanced").contains(mode)) throw new ValidationException("Choose a search mode.");
    if (!List.of("relevance", "name", "updatedAt").contains(sortBy)) throw new ValidationException("Choose an available sort order.");
    if (mode.equals("basic") && text.isEmpty()) throw new ValidationException("Enter some text to search for an indicator.");
    if (mode.equals("advanced") && goalDescription.isEmpty() && question.isEmpty() && indicatorDescription.isEmpty()) {
      throw new ValidationException("Describe your goal, enter a question, or describe the indicator you need.");
    }
  }

  String embeddingText() {
    if (mode.equals("basic")) return text;
    var parts = new ArrayList<String>();
    String goal = (goalVerb + " " + goalDescription).strip();
    if (!goal.isEmpty()) parts.add("Goal: " + goal);
    if (!question.isEmpty()) parts.add("Question: " + question);
    if (!indicatorDescription.isEmpty()) parts.add("Indicator: " + indicatorDescription);
    return String.join("\n", parts);
  }

  String fallbackText() {
    if (mode.equals("basic")) return text;
    if (!indicatorDescription.isEmpty()) return indicatorDescription;
    return question.isEmpty() ? goalDescription : question;
  }

  // Spring MVC uses toString() when logging decoded request bodies at DEBUG.
  @Override public String toString() {
    return "CommunitySearchRequest";
  }

  private static String clean(String value, int limit) {
    if (value == null) return "";
    if (value.length() > limit) throw new ValidationException("The search text is too long. Shorten it and try again.");
    return value.strip();
  }
}
