import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import PublishRoundedIcon from "@mui/icons-material/PublishRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { useSnackbar } from "notistack";
import PageHeader from "../../common/components/page-header/page-header";
import SectionCard from "../../common/components/section-card/section-card";
import EmptyState from "../../common/components/empty-state/empty-state";
import { createScopedTheme } from "../../common/theme/scoped-theme";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { useNavigationGuard } from "../../setup/routes-manager/navigation-guard-context.js";
import {
  NewsCard,
  PublicationCard,
} from "../landing-page/components/shared/content-cards.jsx";
import ContentBodyEditor from "./components/content-body-editor.jsx";
import {
  createContent,
  getContent,
  transitionContent,
  updateContent,
} from "./utils/content-api.js";
import {
  contentError,
  contentFieldErrors,
  contentLabel,
  contentPayload,
  contentStatus,
  emptyContent,
  isContentKind,
  PUBLICATION_TYPES,
  validateContent,
} from "./utils/content-model.js";

const readRecovery = (key) => {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
};
const removeRecovery = (key) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* Editing remains available when storage is blocked. */
  }
};
const dateTime = (value) =>
  value ? new Date(value).toLocaleString() : "Not saved yet";
const FIELD_LABELS = {
  title: "Title",
  date: "News date",
  body: "News content",
  venue: "Venue",
  authors: "Authors",
  year: "Year",
  type: "Publication type",
  pdfLink: "PDF link",
  details: "Details link",
};

export default function AdminContentEditor() {
  const { kind, id } = useParams();
  const { api, user } = useContext(AuthContext);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const theme = useTheme();
  const previewTheme = useMemo(() => createScopedTheme(theme), [theme]);
  const navGuard = useNavigationGuard();
  const registerGuard = navGuard?.registerGuard;
  const unregisterGuard = navGuard?.unregisterGuard;
  const [entry, setEntry] = useState(null);
  const [draft, setDraft] = useState(() => emptyContent(kind));
  const [baseline, setBaseline] = useState("");
  const [status, setStatus] = useState("loading");
  const [busy, setBusy] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState(null);
  const [leaveTo, setLeaveTo] = useState(null);
  const [preview, setPreview] = useState("draft");
  const [recovery, setRecovery] = useState(null);
  const requestId = useRef(0);
  const loadedStorageKey = useRef(null);
  const cancelLoad = useCallback(() => {
    requestId.current++;
  }, []);
  const storageKey = `openlap-content-working:${user?.sub || user?.email || "session"}:${kind}:${id || "new"}`;
  const payload = contentPayload(kind, draft);
  const dirty = status === "ready" && JSON.stringify(payload) !== baseline;
  const trashed = entry?.status === "TRASH" || Boolean(entry?.deletedAt);
  const noun = contentLabel(kind);
  const listPath = `/admin/content?kind=${kind}`;

  const applyEntry = useCallback(
    (data) => {
      const next = { ...emptyContent(kind), ...data.draft };
      setEntry(data);
      setDraft(next);
      setBaseline(JSON.stringify(contentPayload(kind, next)));
      setErrors({});
      setConflict(false);
    },
    [kind],
  );

  const load = useCallback(async () => {
    if (!isContentKind(kind)) return;
    const token = ++requestId.current;
    loadedStorageKey.current = null;
    setStatus("loading");
    setError("");
    setNotice("");
    setRecovery(null);
    setPreview("draft");
    try {
      const data = id ? await getContent(api, kind, id) : null;
      if (token !== requestId.current) return;
      const next = data
        ? { ...emptyContent(kind), ...data.draft }
        : emptyContent(kind);
      if (data) applyEntry(data);
      else {
        setEntry(null);
        setDraft(next);
        setBaseline(JSON.stringify(contentPayload(kind, next)));
        setErrors({});
        setConflict(false);
      }
      const backup = readRecovery(storageKey);
      if (
        backup?.draft &&
        JSON.stringify(contentPayload(kind, backup.draft)) !==
          JSON.stringify(contentPayload(kind, next))
      )
        setRecovery(backup);
      else removeRecovery(storageKey);
      loadedStorageKey.current = storageKey;
      setStatus("ready");
    } catch (failure) {
      if (token !== requestId.current) return;
      setError(
        contentError(
          failure,
          "This entry could not be loaded. It may have been removed, or your connection may be unavailable.",
        ),
      );
      setStatus("error");
    }
  }, [api, kind, id, applyEntry, storageKey]);

  useEffect(() => {
    load();
    return cancelLoad;
  }, [load, cancelLoad]);

  // This backup also covers browser history navigation, which cannot be
  // blocked by the app's BrowserRouter navigation guard. It is never published.
  useEffect(() => {
    if (
      status !== "ready" ||
      recovery ||
      trashed ||
      loadedStorageKey.current !== storageKey
    )
      return;
    if (!dirty) {
      removeRecovery(storageKey);
      return;
    }
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          draft,
          version: entry?.version ?? null,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      /* The explicit server Save draft action still works. */
    }
  }, [draft, dirty, status, storageKey, entry?.version, recovery, trashed]);

  useEffect(() => {
    if (!dirty && !busy) return undefined;
    const handler = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, busy]);

  useEffect(() => {
    if ((!dirty && !busy) || !registerGuard) return undefined;
    const guard = (to) => {
      if (busy)
        enqueueSnackbar("Please wait for the current update to finish.", {
          variant: "info",
        });
      else setLeaveTo(to);
      return true;
    };
    registerGuard(guard);
    return () => unregisterGuard(guard);
  }, [dirty, busy, registerGuard, unregisterGuard, enqueueSnackbar]);

  const goTo = (to) => {
    if (busy)
      enqueueSnackbar("Please wait for the current update to finish.", {
        variant: "info",
      });
    else if (dirty) setLeaveTo(to);
    else navigate(to);
  };
  const guardCrumb = (to) => (event) => {
    event.preventDefault();
    goTo(to);
  };
  const focusField = (field) =>
    document.getElementById(`content-${field}`)?.focus();
  const reportFields = (nextErrors) => {
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      window.requestAnimationFrame(() =>
        focusField(Object.keys(nextErrors)[0]),
      );
      return true;
    }
    return false;
  };
  const changeField = (name, value) => {
    setDraft((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
    setNotice("");
  };
  const handleFailure = (failure, fallback) => {
    const isConflict = failure?.response?.status === 409;
    setConflict(isConflict);
    setError(
      isConflict
        ? "Another admin changed this entry. Your text is still here. Reload the latest version after reviewing your work, or save your work as a separate draft."
        : contentError(failure, fallback),
    );
    reportFields(contentFieldErrors(failure));
  };
  const persist = async (copy = false) => {
    const token = requestId.current;
    const next = contentPayload(kind, draft);
    if (reportFields(validateContent(kind, next))) return null;
    const saved =
      entry && !copy
        ? await updateContent(api, kind, entry, next)
        : await createContent(api, kind, next);
    if (token !== requestId.current) return null;
    applyEntry(saved);
    removeRecovery(storageKey);
    return saved;
  };
  const adoptRoute = (saved) => {
    if (saved?.id && saved.id !== id)
      navigate(`/admin/content/${kind}/${saved.id}`, { replace: true });
  };
  const save = async (copy = false, destination = null) => {
    const token = requestId.current;
    setBusy("save");
    setError("");
    try {
      const saved = await persist(copy);
      if (!saved) {
        if (destination) setLeaveTo(null);
        return;
      }
      const message = copy
        ? "Your work was saved as a separate draft."
        : "Draft saved. The homepage has not changed.";
      setNotice(message);
      enqueueSnackbar(message, { variant: "success" });
      if (destination) {
        setLeaveTo(null);
        navigate(destination);
      } else adoptRoute(saved);
    } catch (failure) {
      if (token !== requestId.current) return;
      if (destination) setLeaveTo(null);
      handleFailure(
        failure,
        "The draft could not be saved. Your changes are still here; try again.",
      );
    } finally {
      if (token === requestId.current) setBusy("");
    }
  };
  const askPublish = () => {
    setError("");
    if (!reportFields(validateContent(kind, payload, true)))
      setPending("publish");
  };
  const confirmTransition = async () => {
    const action = pending;
    const token = requestId.current;
    if (action === "reload") {
      removeRecovery(storageKey);
      setPending(null);
      await load();
      return;
    }
    setBusy(action);
    setError("");
    let saved = entry;
    try {
      if (action === "publish" && (!entry || dirty)) saved = await persist();
      if (!saved) return;
      const result = await transitionContent(api, kind, saved, action);
      if (token !== requestId.current) return;
      if (action === "unpublish" && dirty) {
        setEntry(result);
        setBaseline(JSON.stringify(contentPayload(kind, result.draft)));
      } else applyEntry(result);
      setPending(null);
      const message =
        action === "publish"
          ? "Published. The updated entry is now available on the homepage."
          : action === "unpublish"
            ? "Unpublished. The entry is hidden from the homepage."
            : action === "restore"
              ? "Restored as a draft. Publish when it is ready."
              : "Moved to trash. You can restore it later.";
      setNotice(message);
      enqueueSnackbar(message, { variant: "success" });
      if (action === "trash") {
        removeRecovery(storageKey);
        navigate(`${listPath}&status=TRASH`);
      } else adoptRoute(result);
    } catch (failure) {
      if (token !== requestId.current) return;
      setPending(null);
      const fallback =
        action === "publish" && saved
          ? "The draft is saved, but publishing failed. Your homepage entry has not changed; try publishing again."
          : "The entry could not be updated. Your changes are still here; try again.";
      handleFailure(failure, fallback);
      if (!id && saved?.id)
        enqueueSnackbar(fallback, {
          variant: "error",
          persist: true,
          action: (key) => (
            <Button
              color="inherit"
              size="small"
              onClick={() => closeSnackbar(key)}
            >
              Dismiss
            </Button>
          ),
        });
      adoptRoute(saved);
    } finally {
      if (token === requestId.current) setBusy("");
    }
  };

  const field = (name, label, options = {}) => {
    const { helperText, ...rest } = options;
    return (
      <TextField
        id={`content-${name}`}
        label={label}
        value={draft[name] ?? ""}
        onChange={(event) => changeField(name, event.target.value)}
        disabled={Boolean(busy) || trashed}
        fullWidth
        error={Boolean(errors[name])}
        helperText={errors[name] || helperText}
        {...rest}
      />
    );
  };

  if (!isContentKind(kind))
    return (
      <EmptyState
        title="Unknown content type"
        description="Choose News or Publications from Content Management."
        action={
          <Button onClick={() => navigate("/admin/content")}>
            Go to Content Management
          </Button>
        }
      />
    );
  if (status === "loading")
    return (
      <Stack sx={{ alignItems: "center", gap: 2, py: 8 }}>
        <CircularProgress />
        <Typography color="text.secondary">Loading {noun}…</Typography>
      </Stack>
    );
  if (status === "error")
    return (
      <EmptyState
        icon={ErrorOutlineRoundedIcon}
        tone="error"
        title={`Couldn’t load ${noun}`}
        description={error}
        action={
          <Stack direction="row" sx={{ gap: 1 }}>
            <Button onClick={() => navigate(listPath)}>Back to content</Button>
            <Button onClick={load} variant="outlined">
              Retry
            </Button>
          </Stack>
        }
      />
    );

  const previewItem =
    preview === "published" && entry?.published ? entry.published : payload;
  const confirmText =
    pending === "publish"
      ? `Publish “${draft.title}”? ${dirty || !entry ? "Your current changes will be saved and published. " : ""}This version will be visible to everyone on the homepage.`
      : pending === "unpublish"
        ? `Unpublish “${entry?.draft?.title}”? It will be hidden from the homepage. Its saved draft will remain available${dirty ? ", and your unsaved changes will stay in this editor" : ""}.`
        : pending === "restore"
          ? `Restore “${entry?.draft?.title}” as a draft? It will stay hidden until you publish it.`
          : pending === "trash"
            ? `Move “${entry?.draft?.title}” to trash? It will be hidden from the homepage and can be restored later.${dirty ? " Your unsaved changes in this editor will be discarded." : ""}`
            : "Reload the latest saved entry? Your unsaved changes in this editor will be discarded. Copy anything you want to keep before continuing.";
  const confirmTitle =
    pending === "publish"
      ? "Publish to the homepage?"
      : pending === "unpublish"
        ? "Unpublish this entry?"
        : pending === "restore"
          ? "Restore as draft?"
          : pending === "trash"
            ? "Move to trash?"
            : "Discard changes and reload?";
  const confirmLabel =
    pending === "publish"
      ? "Publish now"
      : pending === "unpublish"
        ? "Unpublish"
        : pending === "restore"
          ? "Restore as draft"
          : pending === "trash"
            ? "Move to trash"
            : "Discard and reload";

  return (
    <Stack sx={{ gap: 2 }}>
      <PageHeader
        title={id ? `Edit ${noun}` : `Add ${noun}`}
        breadcrumbs={[
          {
            label: "Admin Dashboard",
            to: "/admin",
            onClick: guardCrumb("/admin"),
          },
          {
            label: "Content Management",
            to: listPath,
            onClick: guardCrumb(listPath),
          },
        ]}
        subtitle="Save a private draft, check the preview, then publish to the homepage."
        actions={
          <Button
            startIcon={<ArrowBackRoundedIcon />}
            onClick={() => goTo(listPath)}
          >
            Back to content
          </Button>
        }
      />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        sx={{ gap: 1, justifyContent: "space-between", alignItems: { sm: "center" } }}
      >
        <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Chip
            size="small"
            color={
              entry?.status === "PUBLISHED" && !trashed ? "success" : "default"
            }
            label={entry ? contentStatus(entry) : "New draft"}
          />
          <Typography variant="caption" color="text.secondary" role="status">
            {dirty
              ? "Unsaved changes"
              : entry
                ? `Last saved ${dateTime(entry.updatedAt)}`
                : "Not saved yet"}
          </Typography>
        </Stack>
        {entry && (
          <Typography variant="caption" color="text.secondary">
            Created {dateTime(entry.createdAt)}
          </Typography>
        )}
      </Stack>
      {trashed ? (
        <Alert
          severity="info"
          action={
            <Button
              color="inherit"
              disabled={Boolean(busy)}
              onClick={() => setPending("restore")}
            >
              Restore as draft
            </Button>
          }
        >
          This entry is in Trash and is hidden from the homepage. Restore it to
          continue editing.
        </Alert>
      ) : (
        <Alert severity="info">
          {entry?.published
            ? "The published version stays on the homepage while you edit. Save draft keeps your changes private; Publish changes updates the homepage."
            : "This draft is private. It will appear on the homepage only after you publish it."}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" role="status" onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert severity={conflict ? "warning" : "error"} role="alert">
          {error}
          {conflict && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              sx={{ gap: 1, mt: 1 }}
            >
              <Button
                size="small"
                color="inherit"
                variant="outlined"
                disabled={Boolean(busy)}
                onClick={() => setPending("reload")}
              >
                Reload latest version
              </Button>
              <Button
                size="small"
                color="inherit"
                disabled={Boolean(busy)}
                onClick={() => save(true)}
              >
                Save as separate draft
              </Button>
            </Stack>
          )}
        </Alert>
      )}
      {Object.keys(errors).length > 0 && (
        <Alert severity="error" role="alert">
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Review these fields before continuing:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {Object.entries(errors).map(([name, message]) => (
              <li key={name}>
                <Button
                  size="small"
                  color="inherit"
                  onClick={() => focusField(name)}
                  sx={{ textAlign: "left", justifyContent: "flex-start" }}
                >
                  {FIELD_LABELS[name] || name}: {message}
                </Button>
              </li>
            ))}
          </Box>
        </Alert>
      )}
      {busy && (
        <LinearProgress
          aria-label={busy === "save" ? "Saving draft" : "Updating content"}
        />
      )}
      <Grid container spacing={3} sx={{ alignItems: "flex-start" }}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack
            component="form"
            noValidate
            sx={{ gap: 2.5 }}
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <SectionCard
              headingComponent="h2"
              title={kind === "news" ? "News details" : "Publication details"}
              helper="Only the title is required to save a draft. Complete the remaining required fields before publishing."
            >
              {field("title", "Title", {
                required: true,
                multiline: true,
                minRows: 2,
                helperText: `${draft.title.length}/300 characters`,
                slotProps: { htmlInput: { maxLength: 300 } },
              })}
              {kind === "news" ? (
                <>
                  {field("date", "News date", {
                    type: "date",
                    required: true,
                    helperText:
                      "Newest news appears first. The homepage shows the month and year.",
                    slotProps: { inputLabel: { shrink: true } },
                  })}
                  <ContentBodyEditor
                    body={draft.body || []}
                    onChange={(body) => changeField("body", body)}
                    error={errors.body}
                    disabled={Boolean(busy) || trashed}
                  />
                  {field("venue", "Venue (optional)", {
                    helperText:
                      "An optional event or location shown below the update.",
                    slotProps: { htmlInput: { maxLength: 1000 } },
                  })}
                </>
              ) : (
                <>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 5 }}>
                      {field("year", "Publication year", {
                        required: true,
                        helperText: "Four digits, for example 2026.",
                        slotProps: {
                          htmlInput: { inputMode: "numeric", maxLength: 4 },
                        },
                      })}
                    </Grid>
                    <Grid size={{ xs: 12, sm: 7 }}>
                      {field("type", "Publication type", {
                        select: true,
                        required: true,
                        children: PUBLICATION_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        )),
                      })}
                    </Grid>
                  </Grid>
                  {field("authors", "Authors", {
                    required: true,
                    multiline: true,
                    minRows: 2,
                    helperText:
                      "Enter names in publication order, as you want them to appear.",
                    slotProps: { htmlInput: { maxLength: 2000 } },
                  })}
                  {field("venue", "Publication venue", {
                    required: true,
                    multiline: true,
                    minRows: 2,
                    helperText:
                      "Journal, conference proceedings, workshop, or book citation.",
                    slotProps: { htmlInput: { maxLength: 2000 } },
                  })}
                </>
              )}
            </SectionCard>
            {kind === "publications" && (
              <SectionCard
                headingComponent="h2"
                title="Publication links"
                helper="Both links are optional. Add a URL to show the corresponding button on the homepage."
              >
                {field("pdfLink", "PDF or proceedings URL (optional)", {
                  type: "url",
                  helperText:
                    "A public paper PDF or the page where readers can access it.",
                  placeholder: "https://example.org/paper.pdf",
                  slotProps: { htmlInput: { maxLength: 2048 } },
                })}
                {field("details", "Details URL (optional)", {
                  type: "url",
                  helperText:
                    "The publisher, venue, or publication details page.",
                  placeholder: "https://example.org/publication",
                  slotProps: { htmlInput: { maxLength: 2048 } },
                })}
              </SectionCard>
            )}
            {!trashed && (
              <Box
                sx={{
                  position: "sticky",
                  bottom: 12,
                  zIndex: 2,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                  boxShadow: 2,
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  sx={{ gap: 1, justifyContent: "space-between", alignItems: { sm: "center" } }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Saving a draft does not publish it.
                  </Typography>
                  <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                    <Button
                      type="submit"
                      variant="outlined"
                      startIcon={<SaveOutlinedIcon />}
                      disabled={Boolean(busy) || (Boolean(entry) && !dirty)}
                    >
                      {busy === "save" ? "Saving…" : "Save draft"}
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<PublishRoundedIcon />}
                      disabled={
                        Boolean(busy) ||
                        (entry?.status === "PUBLISHED" &&
                          !entry?.hasUnpublishedChanges &&
                          !dirty)
                      }
                      onClick={askPublish}
                    >
                      {entry?.published ? "Publish changes" : "Publish"}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}
            {entry && !trashed && (
              <Stack
                direction="row"
                sx={{ gap: 1, flexWrap: "wrap", justifyContent: "space-between" }}
              >
                {entry.published && (
                  <Button
                    color="warning"
                    disabled={Boolean(busy)}
                    onClick={() => setPending("unpublish")}
                  >
                    Unpublish from homepage
                  </Button>
                )}
                <Button
                  color="error"
                  startIcon={<DeleteOutlineRoundedIcon />}
                  disabled={Boolean(busy)}
                  onClick={() => setPending("trash")}
                >
                  Move to trash
                </Button>
              </Stack>
            )}
          </Stack>
        </Grid>
        <Grid
          size={{ xs: 12, lg: 5 }}
          sx={{ position: { lg: "sticky" }, top: { lg: 24 } }}
        >
          <SectionCard
            headingComponent="h2"
            title="Homepage preview"
            helper="Preview uses the same card design as the public homepage."
          >
            {entry?.published && (
              <ToggleButtonGroup
                value={preview}
                exclusive
                onChange={(_event, value) => value && setPreview(value)}
                size="small"
                aria-label="Preview version"
              >
                <ToggleButton value="draft">Current draft</ToggleButton>
                <ToggleButton value="published">Published version</ToggleButton>
              </ToggleButtonGroup>
            )}
            <ThemeProvider theme={previewTheme}>
              <Box
                sx={{
                  p: { xs: 1, sm: 2 },
                  bgcolor: kind === "news" ? "background.default" : "#06090a",
                  borderRadius: 2,
                  overflowWrap: "anywhere",
                }}
              >
                {kind === "news" ? (
                  <NewsCard
                    item={{
                      ...previewItem,
                      title: previewItem.title || "Your news title",
                      date: previewItem.date || emptyContent("news").date,
                    }}
                    featured
                  />
                ) : (
                  <PublicationCard
                    item={{
                      ...previewItem,
                      title: previewItem.title || "Your publication title",
                    }}
                  />
                )}
              </Box>
            </ThemeProvider>
            <Typography variant="caption" color="text.secondary">
              {preview === "published"
                ? "This is the version currently visible to visitors."
                : dirty
                  ? "This preview includes unsaved changes. Publish when ready to update the homepage."
                  : entry?.status === "PUBLISHED" &&
                      !entry.hasUnpublishedChanges
                    ? "This draft matches the current published version."
                    : "This draft is private until you publish it."}
            </Typography>
          </SectionCard>
        </Grid>
      </Grid>
      <Dialog
        open={Boolean(pending)}
        onClose={() => !busy && setPending(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="content-confirm-title"
      >
        <DialogTitle id="content-confirm-title">{confirmTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ overflowWrap: "anywhere" }}>
            {confirmText}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={Boolean(busy)} onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={
              pending === "trash" || pending === "reload" ? "error" : "primary"
            }
            disabled={Boolean(busy)}
            onClick={confirmTransition}
          >
            {busy ? "Updating…" : confirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={leaveTo !== null}
        onClose={() => !busy && setLeaveTo(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="content-leave-title"
      >
        <DialogTitle id="content-leave-title">
          Save your changes before leaving?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your changes have not been saved to the database. Save them as a
            private draft, or discard them and leave.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
          <Button disabled={Boolean(busy)} onClick={() => setLeaveTo(null)}>
            Keep editing
          </Button>
          <Button
            color="error"
            disabled={Boolean(busy)}
            onClick={() => {
              removeRecovery(storageKey);
              const destination = leaveTo;
              setLeaveTo(null);
              navigate(destination);
            }}
          >
            Discard and leave
          </Button>
          <Button
            variant="contained"
            disabled={Boolean(busy)}
            onClick={() => save(false, leaveTo)}
          >
            {busy ? "Saving…" : "Save draft and leave"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(recovery)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="content-recovery-title"
      >
        <DialogTitle id="content-recovery-title">
          Recover your unsaved work?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            There is an unsaved working copy in this browser from{" "}
            {dateTime(recovery?.savedAt)}. It has not been saved to the database
            or published.
            {entry && recovery?.version !== entry.version
              ? " The database entry has changed since this copy was made. Recover it to review your text, then save a separate draft or reload the latest version."
              : " Recover it to continue where you left off."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              removeRecovery(storageKey);
              setRecovery(null);
            }}
          >
            Discard working copy
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setDraft({ ...emptyContent(kind), ...recovery.draft });
              if (entry && recovery.version !== entry.version) {
                setEntry((previous) => ({
                  ...previous,
                  version: recovery.version,
                }));
                setConflict(true);
                setError(
                  "The database entry changed while you were away. Your recovered text is here. Save it as a separate draft, or reload the latest version after reviewing it.",
                );
              }
              setRecovery(null);
            }}
          >
            Recover work
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
