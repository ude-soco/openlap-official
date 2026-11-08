package com.openlap.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.openlap.infrastructure.exception.ValidationException;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.Test;

public class ContentValidatorTest {
  private final ContentValidator validator = new ContentValidator();

  @Test public void incompleteDraftCanBeSavedButCannotBePublished() {
    Map<String, Object> draft = news();
    draft.remove("date");
    draft.remove("body");
    assertThat(validator.validate(ContentKind.NEWS, draft, false)).containsEntry("title", "News");
    assertThatThrownBy(() -> validator.validate(ContentKind.NEWS, draft, true)).isInstanceOf(ValidationException.class);
  }

  @Test public void invalidDatesAndJavascriptLinksAreRejectedEvenInDrafts() {
    Map<String, Object> draft = news();
    draft.put("date", "2026-02-30");
    assertThatThrownBy(() -> validator.validate(ContentKind.NEWS, draft, false)).isInstanceOf(ValidationException.class);
    draft.put("date", "2026-02-28");
    draft.put("body", Arrays.asList(Map.of("text", "Click", "href", "javascript:alert(1)")));
    assertThatThrownBy(() -> validator.validate(ContentKind.NEWS, draft, false)).isInstanceOf(ValidationException.class);
  }

  @Test public void linksAndWhitespaceInNewsBodyArePreserved() {
    Map<String, Object> draft = news();
    draft.put("body", Arrays.asList("Visit ", Map.of("text", "the paper", "href", "https://example.org/paper"), "."));
    assertThat(validator.validate(ContentKind.NEWS, draft, true).get("body")).isEqualTo(draft.get("body"));
  }

  @Test public void unknownFieldsCannotBecomeMongoOperators() {
    Map<String, Object> draft = news();
    draft.put("$set", Map.of("status", "PUBLISHED"));
    assertThatThrownBy(() -> validator.validate(ContentKind.NEWS, draft, false)).isInstanceOf(ValidationException.class);
  }

  @Test public void publicationTypesAreControlledAndLinksAreOptional() {
    Map<String, Object> draft = new LinkedHashMap<>();
    draft.put("title", "Research"); draft.put("authors", "A. Researcher"); draft.put("year", 2026);
    draft.put("type", "Journal"); draft.put("venue", "Journal of Learning Analytics");
    assertThat(validator.validate(ContentKind.PUBLICATIONS, draft, true)).containsEntry("year", "2026");
    draft.put("type", "Made up");
    assertThatThrownBy(() -> validator.validate(ContentKind.PUBLICATIONS, draft, true)).isInstanceOf(ValidationException.class);
  }

  static Map<String, Object> news() {
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("title", "News"); result.put("date", "2026-11-08"); result.put("body", Arrays.asList("News content."));
    return result;
  }
}
