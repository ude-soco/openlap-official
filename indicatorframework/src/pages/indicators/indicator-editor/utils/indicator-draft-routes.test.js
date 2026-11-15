import test from "node:test";
import assert from "node:assert/strict";
import { editorRoute } from "./indicator-draft-routes.js";
test("draft and edit entry points retain explicit identities and reject unknown editor paths", () => {
  assert.deepEqual(editorRoute("drafts/draft-1"), { mode: "draft", id: "draft-1", identity: "draft:draft-1" });
  assert.deepEqual(editorRoute("basic/edit/saved-1"), { mode: "edit", indicatorType: "BASIC", id: "saved-1", identity: "edit:BASIC:saved-1" });
  assert.equal(editorRoute("multi-level-analysis").indicatorType, "MULTI_LEVEL");
  assert.equal(editorRoute("composite/edit/saved-2").mode, "edit");
  assert.equal(editorRoute("").mode, "choose");
  assert.equal(editorRoute("drafts/id/extra").mode, "unknown");
});
