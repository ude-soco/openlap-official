import { useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddLinkRoundedIcon from "@mui/icons-material/AddLinkRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import {
  bodyLinks,
  bodyToText,
  editBodyText,
  setBodyLink,
  validHttpUrl,
} from "../utils/content-model.js";

// A normal textarea is keyboard/screen-reader friendly and supports familiar
// text editing. Links decorate text ranges, without exposing markup to admins.
export default function ContentBodyEditor({
  body,
  onChange,
  error,
  disabled = false,
}) {
  const input = useRef(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [editing, setEditing] = useState(null);
  const [href, setHref] = useState("");
  const [urlError, setUrlError] = useState("");
  const text = bodyToText(body);
  const links = bodyLinks(body);

  const rememberSelection = (event) =>
    setSelection({
      start: event.target.selectionStart,
      end: event.target.selectionEnd,
    });
  const openLink = (range = selection) => {
    if (range.end <= range.start) return;
    const existing = links.find(
      (link) => link.start <= range.start && link.end >= range.end,
    );
    setEditing(range);
    setHref(range.href || existing?.href || "");
    setUrlError("");
  };
  const closeLink = () => {
    setEditing(null);
    window.requestAnimationFrame(() => input.current?.focus());
  };
  const saveLink = (event) => {
    event.preventDefault();
    // Dialogs render in a portal, but React submit events still bubble to the
    // surrounding editor form. Applying a link must never save the entry.
    event.stopPropagation();
    if (!validHttpUrl(href.trim())) {
      setUrlError("Enter a valid URL starting with http:// or https://.");
      return;
    }
    onChange(setBodyLink(body, editing.start, editing.end, href));
    closeLink();
  };

  return (
    <Stack gap={1.25}>
      <TextField
        id="content-body"
        label="News content"
        required
        multiline
        minRows={8}
        maxRows={20}
        fullWidth
        inputRef={input}
        value={text}
        disabled={disabled}
        error={Boolean(error)}
        helperText={
          error ||
          "Write your update, then select words and choose Add link. Paragraph breaks are preserved."
        }
        onChange={(event) => onChange(editBodyText(body, event.target.value))}
        onSelect={rememberSelection}
        onKeyDown={(event) => {
          if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "k"
          ) {
            event.preventDefault();
            openLink({
              start: event.target.selectionStart,
              end: event.target.selectionEnd,
            });
          }
        }}
        slotProps={{ htmlInput: { maxLength: 30000 } }}
      />
      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddLinkRoundedIcon />}
          disabled={disabled || selection.end <= selection.start}
          onClick={() => openLink()}
        >
          Add link
        </Button>
        <Typography variant="caption" color="text.secondary">
          Select text first · Ctrl / ⌘ + K
        </Typography>
      </Stack>
      {links.length > 0 && (
        <Box
          component="section"
          aria-label="Links in news content"
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
            p: 1.5,
          }}
        >
          <Typography variant="caption" fontWeight={600}>
            Links in this update
          </Typography>
          <Stack
            component="ul"
            gap={0.5}
            sx={{ listStyle: "none", m: 0, p: 0, mt: 0.5 }}
          >
            {links.map((link, index) => (
              <Stack
                component="li"
                direction="row"
                gap={1}
                alignItems="center"
                key={`${link.start}-${link.end}`}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>
                    {link.text}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", overflowWrap: "anywhere" }}
                  >
                    {link.href}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  disabled={disabled}
                  onClick={() => openLink(link)}
                  aria-label={`Edit link ${index + 1}: ${link.text}`}
                >
                  Edit
                </Button>
                <Tooltip title="Remove link, keep text">
                  <span>
                    <IconButton
                      size="small"
                      disabled={disabled}
                      aria-label={`Remove link ${index + 1}: ${link.text}`}
                      onClick={() =>
                        onChange(setBodyLink(body, link.start, link.end, ""))
                      }
                    >
                      <LinkOffRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
      <Dialog
        open={Boolean(editing)}
        onClose={closeLink}
        fullWidth
        maxWidth="sm"
        aria-labelledby="content-link-title"
      >
        <Box component="form" onSubmit={saveLink}>
          <DialogTitle id="content-link-title">Link selected text</DialogTitle>
          <DialogContent>
            <Typography
              variant="body2"
              sx={{ mb: 2, overflowWrap: "anywhere" }}
            >
              Selected text:{" "}
              <strong>
                {editing && text.slice(editing.start, editing.end)}
              </strong>
            </Typography>
            <TextField
              autoFocus
              fullWidth
              required
              label="Link URL"
              type="url"
              value={href}
              onChange={(event) => {
                setHref(event.target.value);
                setUrlError("");
              }}
              error={Boolean(urlError)}
              helperText={urlError || "For example, https://example.org/paper"}
              slotProps={{ htmlInput: { maxLength: 2048 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeLink}>Cancel</Button>
            <Button type="submit" variant="contained">
              Apply link
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}

ContentBodyEditor.propTypes = {
  body: PropTypes.array.isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  disabled: PropTypes.bool,
};
