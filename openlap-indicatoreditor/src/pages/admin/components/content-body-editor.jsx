import { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import FormatBoldRoundedIcon from "@mui/icons-material/FormatBoldRounded";
import FormatItalicRoundedIcon from "@mui/icons-material/FormatItalicRounded";
import FormatUnderlinedRoundedIcon from "@mui/icons-material/FormatUnderlinedRounded";
import FormatListBulletedRoundedIcon from "@mui/icons-material/FormatListBulletedRounded";
import FormatListNumberedRoundedIcon from "@mui/icons-material/FormatListNumberedRounded";
import InsertLinkRoundedIcon from "@mui/icons-material/InsertLinkRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import {
  bodyToDocument,
  canonicalRichText,
  richTextLength,
} from "../../../common/utils/rich-text.js";
import { validHttpUrl } from "../utils/content-model.js";
import {
  contentEditorExtensions,
  editorLinkUrl,
} from "./content-editor-config.js";

const canonicalKey = (body) =>
  JSON.stringify(canonicalRichText(bodyToDocument(body)));

export default function ContentBodyEditor({
  body,
  onChange,
  error,
  disabled = false,
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const openLinkRef = useRef(() => {});
  const lastEmitted = useRef(null);
  const initialContent = useRef(bodyToDocument(body));
  const toolbar = useRef(null);
  const [toolbarFocus, setToolbarFocus] = useState("bold");
  const [editing, setEditing] = useState(null);
  const [href, setHref] = useState("");
  const [linkText, setLinkText] = useState("");
  const [urlError, setUrlError] = useState("");
  const [textError, setTextError] = useState("");
  const length = richTextLength(body);
  const extensions = useMemo(contentEditorExtensions, []);
  const editor = useEditor({
    extensions,
    content: initialContent.current,
    editable: !disabled,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        id: "content-body",
        role: "textbox",
        "aria-multiline": "true",
        "aria-required": "true",
        "aria-labelledby": "content-body-label",
        "aria-describedby": "content-body-help",
        spellcheck: "true",
      },
      handleKeyDown: (_view, event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "k"
        ) {
          event.preventDefault();
          openLinkRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: instance, transaction }) => {
      if (!transaction.docChanged) return;
      const next = canonicalRichText(instance.getJSON());
      lastEmitted.current = JSON.stringify(next);
      onChangeRef.current(next);
    },
  });
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      instance
        ? {
            bold: instance.isActive("bold"),
            italic: instance.isActive("italic"),
            underline: instance.isActive("underline"),
            bulletList: instance.isActive("bulletList"),
            orderedList: instance.isActive("orderedList"),
            link: instance.isActive("link"),
            href: instance.getAttributes("link").href || "",
            canUndo: instance.can().undo(),
            canRedo: instance.can().redo(),
          }
        : null,
  });

  useEffect(() => {
    if (!editor) return;
    const key = canonicalKey(body);
    // A parent echo of our own transaction must not reset the cursor, selection
    // or undo history. Only an externally changed document replaces content.
    if (key === lastEmitted.current) return;
    if (key !== canonicalKey(editor.getJSON())) {
      editor.commands.setContent(bodyToDocument(body), { emitUpdate: false });
    }
    lastEmitted.current = key;
  }, [body, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled, false);
    editor.view.dom.setAttribute("aria-invalid", String(Boolean(error)));
    editor.view.dom.setAttribute("aria-readonly", String(disabled));
    editor.view.dom.setAttribute("aria-disabled", String(disabled));
  }, [disabled, error, editor]);

  useEffect(() => {
    // Undo and unlink can disable the focused control after it runs. Keep one
    // enabled tab stop so the formatting toolbar remains reachable by Tab.
    if (!toolbar.current?.querySelector('button[tabindex="0"]:not(:disabled)'))
      setToolbarFocus("bold");
  }, [state?.canUndo, state?.canRedo, state?.link, disabled]);

  const openLink = () => {
    if (!editor || disabled) return;
    const currentHref = editor.getAttributes("link").href || "";
    if (currentHref) editor.commands.extendMarkRange("link");
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    const marks =
      from === to
        ? editor.state.storedMarks || editor.state.selection.$from.marks()
        : editor.state.doc.nodeAt(from)?.marks ||
          editor.state.selection.$from.marks();
    const formattingMarks = marks
      .filter((mark) =>
        ["bold", "italic", "underline"].includes(mark.type.name),
      )
      .map((mark) => mark.toJSON());
    setEditing({
      from,
      to,
      selectedText,
      formattingMarks,
      existing: Boolean(currentHref),
    });
    setHref(currentHref);
    setLinkText(selectedText);
    setUrlError("");
    setTextError("");
  };
  openLinkRef.current = openLink;

  const cancelLink = () => {
    const selection = editing;
    setEditing(null);
    window.requestAnimationFrame(() => {
      if (editor && !editor.isDestroyed && selection)
        editor
          .chain()
          .focus()
          .setTextSelection({ from: selection.from, to: selection.to })
          .run();
    });
  };
  const saveLink = (event) => {
    event.preventDefault();
    // Portaled React forms still bubble through the surrounding entry form.
    // Applying a link must never submit/save the content entry.
    event.stopPropagation();
    const url = editorLinkUrl(href);
    setUrlError(
      url
        ? ""
        : "Enter a valid web URL, for example https://example.org/paper.",
    );
    setTextError(
      linkText.trim() ? "" : "Enter the text readers will see for this link.",
    );
    if (!url || !linkText.trim() || !editor || !editing || disabled) return;
    const range = { from: editing.from, to: editing.to };
    if (linkText === editing.selectedText && range.from !== range.to) {
      editor
        .chain()
        .focus()
        .setTextSelection(range)
        .setLink({ href: url })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .insertContentAt(range, {
          type: "text",
          text: linkText,
          marks: [
            ...editing.formattingMarks,
            { type: "link", attrs: { href: url } },
          ],
        })
        .setTextSelection(range.from + linkText.length)
        .unsetMark("link")
        .run();
    }
    setEditing(null);
    window.requestAnimationFrame(() => {
      if (!editor.isDestroyed) editor.commands.focus();
    });
  };
  const removeLink = () => {
    if (!editor || disabled) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  };
  const run = (command) => {
    if (editor && !disabled) command(editor.chain().focus()).run();
  };
  const moveToolbarFocus = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = [
      ...toolbar.current.querySelectorAll("button:not(:disabled)"),
    ];
    const current = buttons.indexOf(document.activeElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
            buttons.length;
    buttons[next]?.focus();
  };
  const tool = (
    name,
    label,
    icon,
    action,
    active = false,
    unavailable = false,
    shortcut = null,
  ) => (
    <Tooltip
      title={
        shortcut
          ? `${label} (${shortcut.replaceAll("Control+", "Ctrl+").replaceAll("Meta+", "⌘+")})`
          : label
      }
    >
      <span>
        <IconButton
          type="button"
          size="small"
          aria-label={label}
          aria-pressed={active}
          aria-keyshortcuts={shortcut || undefined}
          disabled={!editor || disabled || unavailable}
          tabIndex={toolbarFocus === name ? 0 : -1}
          onFocus={() => setToolbarFocus(name)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={action}
          sx={(theme) => ({
            minWidth: 36,
            minHeight: 36,
            borderRadius: 1,
            color: active ? "primary.main" : "text.primary",
            bgcolor: active
              ? alpha(theme.palette.primary.main, 0.12)
              : "transparent",
            "&:focus-visible": {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 1,
            },
          })}
        >
          {icon}
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <Stack gap={0.75}>
      <Typography id="content-body-label" variant="body2" fontWeight={600}>
        News content{" "}
        <Box component="span" aria-hidden="true">
          *
        </Box>
      </Typography>
      <Box
        sx={(theme) => ({
          border: "1px solid",
          borderColor: error ? "error.main" : "divider",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
          opacity: disabled ? 0.72 : 1,
          "&:focus-within": {
            borderColor: error ? "error.main" : "primary.main",
            boxShadow: `0 0 0 1px ${error ? theme.palette.error.main : theme.palette.primary.main}`,
          },
        })}
      >
        <Stack
          ref={toolbar}
          role="toolbar"
          aria-label="News content formatting"
          aria-controls="content-body"
          direction="row"
          gap={0.25}
          alignItems="center"
          flexWrap="wrap"
          onKeyDown={moveToolbarFocus}
          sx={{
            p: 0.75,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "action.hover",
          }}
        >
          {tool(
            "bold",
            "Bold",
            <FormatBoldRoundedIcon fontSize="small" />,
            () => run((chain) => chain.toggleBold()),
            state?.bold,
            false,
            "Control+b Meta+b",
          )}
          {tool(
            "italic",
            "Italic",
            <FormatItalicRoundedIcon fontSize="small" />,
            () => run((chain) => chain.toggleItalic()),
            state?.italic,
            false,
            "Control+i Meta+i",
          )}
          {tool(
            "underline",
            "Underline",
            <FormatUnderlinedRoundedIcon fontSize="small" />,
            () => run((chain) => chain.toggleUnderline()),
            state?.underline,
            false,
            "Control+u Meta+u",
          )}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {tool(
            "bullets",
            "Bullet list",
            <FormatListBulletedRoundedIcon fontSize="small" />,
            () => run((chain) => chain.toggleBulletList()),
            state?.bulletList,
          )}
          {tool(
            "numbering",
            "Numbered list",
            <FormatListNumberedRoundedIcon fontSize="small" />,
            () => run((chain) => chain.toggleOrderedList()),
            state?.orderedList,
          )}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {tool(
            "link",
            "Insert or edit link",
            <InsertLinkRoundedIcon fontSize="small" />,
            openLink,
            state?.link,
            false,
            "Control+k Meta+k",
          )}
          {tool(
            "unlink",
            "Remove link",
            <LinkOffRoundedIcon fontSize="small" />,
            removeLink,
            false,
            !state?.link,
          )}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          {tool(
            "undo",
            "Undo",
            <UndoRoundedIcon fontSize="small" />,
            () => run((chain) => chain.undo()),
            false,
            !state?.canUndo,
            "Control+z Meta+z",
          )}
          {tool(
            "redo",
            "Redo",
            <RedoRoundedIcon fontSize="small" />,
            () => run((chain) => chain.redo()),
            false,
            !state?.canRedo,
            "Control+Shift+z Meta+Shift+z",
          )}
        </Stack>
        <Box
          sx={(theme) => ({
            position: "relative",
            "& .tiptap": {
              p: 2,
              minHeight: 224,
              maxHeight: 480,
              overflowY: "auto",
              outline: "none",
              fontFamily: "inherit",
              fontSize: "1rem",
              lineHeight: 1.7,
              overflowWrap: "anywhere",
              whiteSpace: "pre-wrap",
            },
            "& .tiptap p": { m: 0, mb: 1.5 },
            "& .tiptap p:last-child": { mb: 0 },
            "& .tiptap ul, & .tiptap ol": { pl: 3, my: 1.5 },
            "& .tiptap li": { my: 0.5 },
            "& .tiptap li > p": { mb: 0 },
            "& .tiptap a": {
              color: theme.palette.primary.main,
              textDecoration: "underline",
              textUnderlineOffset: "2px",
              cursor: "pointer",
            },
            "& .tiptap strong": { fontWeight: 700 },
            "& .tiptap ::selection": {
              bgcolor: alpha(theme.palette.primary.main, 0.22),
            },
          })}
        >
          <EditorContent editor={editor} />
          {!length && !disabled && (
            <Typography
              aria-hidden="true"
              color="text.disabled"
              sx={{
                position: "absolute",
                top: 14,
                left: 16,
                right: 16,
                pointerEvents: "none",
              }}
            >
              Write your news update here…
            </Typography>
          )}
        </Box>
        {state?.href && !editing && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            gap={1}
            alignItems={{ sm: "center" }}
            sx={{
              p: 1,
              borderTop: "1px solid",
              borderColor: "divider",
              bgcolor: "action.hover",
            }}
            aria-label="Selected link"
          >
            <Link
              href={validHttpUrl(state.href) ? state.href : undefined}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              sx={{ flex: 1, overflowWrap: "anywhere", px: 0.5 }}
            >
              {state.href}
            </Link>
            <Stack direction="row" gap={0.5}>
              <Button
                type="button"
                size="small"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={openLink}
              >
                Edit link
              </Button>
              <Button
                type="button"
                size="small"
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={removeLink}
              >
                Remove link
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
      <Stack
        direction="row"
        gap={1}
        justifyContent="space-between"
        alignItems="flex-start"
      >
        <Typography
          id="content-body-help"
          variant="caption"
          color={error ? "error" : "text.secondary"}
          sx={{ flex: 1 }}
        >
          {error ||
            "Format text with the toolbar. Select words to link them, or click a link to edit it. Ctrl / ⌘ + K opens link settings."}
        </Typography>
        <Typography
          variant="caption"
          color={length > 30000 ? "error" : "text.secondary"}
          sx={{ whiteSpace: "nowrap" }}
        >
          {length.toLocaleString()} / 30,000
        </Typography>
      </Stack>
      <Dialog
        open={Boolean(editing)}
        onClose={cancelLink}
        disableRestoreFocus
        fullWidth
        maxWidth="sm"
        aria-labelledby="content-link-title"
      >
        <Box component="form" noValidate onSubmit={saveLink}>
          <DialogTitle id="content-link-title">
            {editing?.existing ? "Edit link" : "Insert link"}
          </DialogTitle>
          <DialogContent>
            <Stack gap={2} sx={{ pt: 1 }}>
              <TextField
                autoFocus={!editing?.selectedText}
                fullWidth
                required
                label="Text to display"
                value={linkText}
                onChange={(event) => {
                  setLinkText(event.target.value);
                  setTextError("");
                }}
                error={Boolean(textError)}
                helperText={
                  textError || "Readers will see this text in your update."
                }
                slotProps={{ htmlInput: { maxLength: 30000 } }}
              />
              <TextField
                autoFocus={Boolean(editing?.selectedText)}
                fullWidth
                required
                label="Link URL"
                value={href}
                onChange={(event) => {
                  setHref(event.target.value);
                  setUrlError("");
                }}
                error={Boolean(urlError)}
                helperText={
                  urlError ||
                  "For example, https://example.org/paper. Links open in a new tab."
                }
                slotProps={{ htmlInput: { maxLength: 2048, inputMode: "url" } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button type="button" onClick={cancelLink}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={disabled}>
              {editing?.existing ? "Update link" : "Insert link"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}

ContentBodyEditor.propTypes = {
  body: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  disabled: PropTypes.bool,
};
