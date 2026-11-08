package com.openlap.content;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.openlap.infrastructure.exception.ValidationException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.Test;

public class RichTextValidatorTest {
  private final RichTextValidator validator = new RichTextValidator();

  @Test public void preservesParagraphsListsLineBreaksAndSupportedMarks() {
    Map<String, Object> body = doc(
        paragraph(text("Introduction", Map.of("type", "bold")), node("hardBreak"), text("Next line")),
        node("bulletList", node("listItem", paragraph(text("Bullet")))),
        node("orderedList", node("listItem", paragraph(text("Numbered")))));
    Map<String, Object> canonical = validator.validate(body, true);
    assertThat(canonical.toString()).contains("Introduction", "hardBreak", "bulletList", "orderedList", "start=1", "bold");
    assertThat(validator.validate(canonical, true)).isEqualTo(canonical);
  }

  @Test public void canonicalizesMarkOrderAndDropsOnlyKnownTiptapMetadata() {
    Map<String, Object> linkAttrs = new LinkedHashMap<>();
    linkAttrs.put("href", "https://example.org/paper"); linkAttrs.put("target", "_blank");
    linkAttrs.put("rel", "noopener noreferrer"); linkAttrs.put("class", null);
    Map<String, Object> listAttrs = new LinkedHashMap<>(); listAttrs.put("start", 3); listAttrs.put("type", null);
    Map<String, Object> ordered = node("orderedList", node("listItem", paragraph(text("Read",
        Map.of("type", "link", "attrs", linkAttrs), Map.of("type", "italic"), Map.of("type", "bold")))));
    ordered.put("attrs", listAttrs);
    Map<String, Object> result = validator.validate(doc(ordered), true);
    String normalized = result.toString();
    assertThat(normalized).contains("attrs={start=3}", "marks=[{type=bold}, {type=italic}, {type=link, attrs={href=https://example.org/paper}}]");
    assertThat(normalized).doesNotContain("target", "rel=", "class=", "type=null");
  }

  @Test public void emptyDocumentsCanBeSavedButCannotBePublished() {
    Map<String, Object> empty = Map.of("type", "doc", "content", Collections.emptyList());
    assertThat(validator.validate(empty, false)).isEqualTo(doc(node("paragraph")));
    assertThatThrownBy(() -> validator.validate(empty, true)).isInstanceOf(IllegalArgumentException.class).hasMessage("Enter news content.");
    assertThatThrownBy(() -> validator.validate(doc(paragraph(text("   "), node("hardBreak"))), true))
        .isInstanceOf(IllegalArgumentException.class).hasMessage("Enter news content.");
  }

  @Test public void rejectsUnsupportedNodesFieldsAttributesAndMarks() {
    for (String type : Arrays.asList("image", "heading", "codeBlock", "html", "script")) {
      rejected(doc(node(type)));
    }
    Map<String, Object> html = paragraph(text("Content")); html.put("html", "<script>alert(1)</script>"); rejected(doc(html));
    Map<String, Object> style = paragraph(text("Content")); style.put("attrs", Map.of("style", "color:red")); rejected(doc(style));
    rejected(doc(paragraph(text("Content", Map.of("type", "code")))));
    rejected(doc(paragraph(text("Content", Map.of("type", "bold", "attrs", Map.of("style", "color:red"))))));
    rejected(doc(paragraph(text("Content", Map.of("type", "bold"), Map.of("type", "bold")))));
    rejected(doc(paragraph(Map.of("type", "text", "text", ""))));
  }

  @Test public void enforcesParentChildSchemaAndListItemFirstParagraph() {
    rejected(doc(text("Root text")));
    rejected(doc(node("listItem", paragraph(text("Orphan item")))));
    rejected(doc(paragraph(paragraph(text("Nested paragraph")))));
    rejected(doc(node("bulletList", paragraph(text("Missing list item")))));
    rejected(doc(node("orderedList")));
    rejected(doc(node("bulletList", node("listItem", node("bulletList", node("listItem", paragraph(text("Wrong first child"))))))));
  }

  @Test public void rejectsUnsafeCredentialedOversizedAndUnknownLinkAttributes() {
    for (String href : Arrays.asList("javascript:alert(1)", "data:text/html,hello", "//example.org", "https://user:pass@example.org", "https://example.org/" + "x".repeat(2048))) {
      rejected(doc(paragraph(text("Link", Map.of("type", "link", "attrs", Map.of("href", href))))));
    }
    rejected(doc(paragraph(text("Link", Map.of("type", "link", "attrs", Map.of("href", "https://example.org", "onclick", "alert(1)"))))));
    rejected(doc(paragraph(text("Link", Map.of("type", "link", "attrs", Map.of("href", "https://example.org", "target", Map.of("bad", "value")))))));
  }

  @Test public void validatesOrderedListStartAsBoundedInteger() {
    for (Object start : Arrays.asList(0, 100001, 1.5, "1", Long.MIN_VALUE, Long.MAX_VALUE, 4294967297L)) {
      Map<String, Object> list = node("orderedList", node("listItem", paragraph(text("Item"))));
      list.put("attrs", Map.of("start", start)); rejected(doc(list));
    }
    Map<String, Object> list = node("orderedList", node("listItem", paragraph(text("Item"))));
    for (Object start : Arrays.asList(1, 100000, 1L, 100000L)) {
      list.put("attrs", Map.of("start", start));
      assertThat(validator.validate(doc(list), true).toString()).contains("start=" + start);
    }
    list.put("attrs", Map.of("start", 1, "type", "A")); rejected(doc(list));
  }

  @Test public void enforcesDepthNodeAndTextBudgetsIncludingHardBreaks() {
    validator.validate(doc(nestedLists(5)), false); // deepest paragraph is depth 12
    rejected(doc(nestedLists(6)));
    List<Map<String, Object>> children = new ArrayList<>();
    for (int i = 0; i < 1998; i++) children.add(node("hardBreak"));
    Map<String, Object> paragraph = node("paragraph"); paragraph.put("content", children);
    validator.validate(doc(paragraph), false); // doc + paragraph + 1998 breaks = 2000
    children.add(node("hardBreak")); rejected(doc(paragraph));
    validator.validate(doc(paragraph(text("x".repeat(30000)))), true);
    rejected(doc(paragraph(text("x".repeat(30000)), node("hardBreak"))));
  }

  @Test public void contentValidationReportsRichTextErrorsAsBodyFieldErrors() {
    Map<String, Object> draft = ContentValidatorTest.news(); draft.put("body", doc(node("image")));
    assertThatThrownBy(() -> new ContentValidator().validate(ContentKind.NEWS, draft, false))
        .isInstanceOf(ValidationException.class).satisfies(error -> {
          ValidationException validation = (ValidationException) error;
          assertThat(validation.getDetails().get("fieldErrors").toString()).contains("body=");
        });
  }

  private Map<String, Object> nestedLists(int levels) {
    Map<String, Object> item = node("listItem", node("paragraph"));
    if (levels > 1) item.put("content", Arrays.asList(node("paragraph"), nestedLists(levels - 1)));
    return node("bulletList", item);
  }

  private void rejected(Map<String, Object> input) {
    assertThatThrownBy(() -> validator.validate(input, false)).isInstanceOf(IllegalArgumentException.class);
  }

  @SafeVarargs private static Map<String, Object> doc(Map<String, Object>... children) { return node("doc", children); }
  @SafeVarargs private static Map<String, Object> paragraph(Map<String, Object>... children) { return node("paragraph", children); }
  @SafeVarargs private static Map<String, Object> node(String type, Map<String, Object>... children) {
    Map<String, Object> value = new LinkedHashMap<>(); value.put("type", type);
    if (children.length > 0) value.put("content", Arrays.asList(children));
    return value;
  }
  @SafeVarargs private static Map<String, Object> text(String text, Map<String, Object>... marks) {
    Map<String, Object> value = new LinkedHashMap<>(); value.put("type", "text"); value.put("text", text);
    if (marks.length > 0) value.put("marks", Arrays.asList(marks));
    return value;
  }
}
