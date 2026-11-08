import { useCallback, useContext, useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  MenuItem,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RestoreRoundedIcon from "@mui/icons-material/RestoreRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import UnfoldMoreRoundedIcon from "@mui/icons-material/UnfoldMoreRounded";
import { useSnackbar } from "notistack";
import PageHeader from "../../common/components/page-header/page-header";
import SectionCard from "../../common/components/section-card/section-card";
import EmptyState from "../../common/components/empty-state/empty-state";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { listContent, transitionContent } from "./utils/content-api.js";
import {
  contentError,
  contentLabel,
  contentStatus,
} from "./utils/content-model.js";

const FILTERS = [
  ["ALL", "All active entries"],
  ["DRAFT", "Drafts"],
  ["PUBLISHED", "Published"],
  ["TRASH", "Trash"],
];
const SORT_FIELDS = ["title", "date", "status", "updatedAt"];
const displayUpdated = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export default function AdminContent() {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [params, setParams] = useSearchParams();
  const kind = params.get("kind") === "publications" ? "publications" : "news";
  const statusFilter = FILTERS.some(([value]) => value === params.get("status"))
    ? params.get("status")
    : "ALL";
  const page = Math.max(0, parseInt(params.get("page"), 10) || 0);
  const search = params.get("search") || "";
  const sortBy = SORT_FIELDS.includes(params.get("sortBy"))
    ? params.get("sortBy")
    : "updatedAt";
  const direction = params.get("direction") === "asc" ? "asc" : "desc";
  const columns = [
    { field: "title", label: "Title" },
    { field: "date", label: kind === "news" ? "News date" : "Year" },
    { field: "status", label: "Status" },
    { field: "updatedAt", label: "Updated" },
  ];
  const [searchInput, setSearchInput] = useState(search);
  const [size, setSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading");
  const [refresh, setRefresh] = useState(0);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => setSearchInput(search), [search]);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    listContent(
      api,
      kind,
      { page, size, search, status: statusFilter, sortBy, direction },
      controller.signal,
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        setRows(Array.isArray(data?.content) ? data.content : []);
        setTotal(data?.totalElements || 0);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("error");
      });
    return () => controller.abort();
  }, [api, kind, page, size, search, statusFilter, sortBy, direction, refresh]);

  const changeFilters = (changes) => {
    setRows([]);
    setParams({
      kind,
      status: statusFilter,
      search,
      page: String(page),
      sortBy,
      direction,
      ...changes,
    });
  };
  const changeSort = (field) =>
    changeFilters({
      sortBy: field,
      direction: sortBy === field && direction === "asc" ? "desc" : "asc",
      page: "0",
    });
  const askAction = useCallback((entry, action) => {
    setActionError("");
    setPending({ entry, action });
  }, []);
  const confirmAction = async () => {
    setBusy(true);
    setActionError("");
    try {
      await transitionContent(api, kind, pending.entry, pending.action);
      enqueueSnackbar(
        pending.action === "restore"
          ? "Restored as a draft. Publish when it is ready."
          : "Moved to trash. You can restore it from the Trash filter.",
        { variant: "success" },
      );
      setPending(null);
      if (rows.length === 1 && page > 0)
        changeFilters({ page: String(page - 1) });
      else setRefresh((value) => value + 1);
    } catch (error) {
      setActionError(
        error?.response?.status === 409
          ? "This entry changed since you opened the list. Cancel, refresh the list, and review it before trying again."
          : contentError(error, "The entry could not be updated. Try again."),
      );
    } finally {
      setBusy(false);
    }
  };

  const renderStatus = (entry) => (
    <Chip
      size="small"
      label={contentStatus(entry)}
      color={
        entry.status === "PUBLISHED" && !entry.deletedAt ? "success" : "default"
      }
      variant={entry.status === "PUBLISHED" ? "filled" : "outlined"}
      sx={{
        height: "auto",
        minHeight: 24,
        "& .MuiChip-label": { whiteSpace: "normal", py: 0.25 },
      }}
    />
  );
  const renderActions = (entry) => (
    <Stack
      direction="row"
      gap={0.5}
      alignItems="center"
      justifyContent="flex-end"
    >
      <Button
        size="small"
        component={RouterLink}
        to={`/admin/content/${kind}/${entry.id}`}
      >
        {statusFilter === "TRASH" ? "View" : "Edit"}
      </Button>
      {statusFilter === "TRASH" ? (
        <Button
          size="small"
          startIcon={<RestoreRoundedIcon />}
          onClick={() => askAction(entry, "restore")}
        >
          Restore
        </Button>
      ) : (
        <Tooltip title="Move to trash">
          <IconButton
            aria-label={`Move “${entry.draft?.title || "Untitled"}” to trash`}
            onClick={() => askAction(entry, "trash")}
            size="small"
          >
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
  const noun = contentLabel(kind);
  const loading = status === "loading";
  const newLink = `/admin/content/${kind}/new`;

  return (
    <Stack gap={2}>
      <PageHeader
        title="Content Management"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Admin Dashboard", to: "/admin" },
        ]}
        subtitle="Create and maintain the news and publications on the OpenLAP homepage."
        actions={
          <Stack direction="row" gap={1} flexWrap="wrap">
            <Button
              component="a"
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<OpenInNewRoundedIcon />}
            >
              View homepage
            </Button>
            <Button
              component={RouterLink}
              to={newLink}
              variant="contained"
              startIcon={<AddRoundedIcon />}
            >
              Add {noun}
            </Button>
          </Stack>
        }
      />
      <SectionCard
        headingComponent="h2"
        title="Homepage content"
        helper="Save drafts privately, preview the result, then publish when ready."
      >
        <Tabs
          value={kind}
          onChange={(_event, value) =>
            changeFilters({ kind: value, page: "0", search: "" })
          }
          aria-label="Content type"
        >
          <Tab value="news" label="News" />
          <Tab value="publications" label="Publications" />
        </Tabs>
        <Stack
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            changeFilters({ search: searchInput.trim(), page: "0" });
          }}
          direction={{ xs: "column", sm: "row" }}
          gap={1.5}
          alignItems={{ sm: "flex-start" }}
        >
          <TextField
            label={kind === "news" ? "Search news" : "Search publications"}
            placeholder="Search by title"
            size="small"
            fullWidth
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
              htmlInput: { maxLength: 200 },
            }}
            sx={{ flex: 1 }}
          />
          <TextField
            select
            label="Status"
            size="small"
            value={statusFilter}
            onChange={(event) =>
              changeFilters({ status: event.target.value, page: "0" })
            }
            sx={{ minWidth: { sm: 190 } }}
          >
            {FILTERS.map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <Button type="submit" variant="outlined" sx={{ minHeight: 40 }}>
            Search
          </Button>
          {search && (
            <Button
              onClick={() => changeFilters({ search: "", page: "0" })}
              sx={{ minHeight: 40 }}
            >
              Clear
            </Button>
          )}
        </Stack>
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{ display: { xs: "flex", sm: "none" } }}
        >
          <TextField
            select
            label="Sort by"
            size="small"
            value={sortBy}
            onChange={(event) => changeSort(event.target.value)}
            fullWidth
          >
            {columns.map(({ field, label }) => (
              <MenuItem key={field} value={field}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip
            title={`Sort ${direction === "asc" ? "descending" : "ascending"}`}
          >
            <IconButton
              aria-label={`Currently ${direction === "asc" ? "ascending" : "descending"}; sort ${direction === "asc" ? "descending" : "ascending"}`}
              onClick={() => changeSort(sortBy)}
            >
              {direction === "asc" ? (
                <ArrowUpwardRoundedIcon />
              ) : (
                <ArrowDownwardRoundedIcon />
              )}
            </IconButton>
          </Tooltip>
        </Stack>
        {statusFilter === "TRASH" && (
          <Alert severity="info">
            Trashed entries are hidden from the homepage. Restoring an entry
            returns it to Draft; it will stay hidden until you publish it.
          </Alert>
        )}
        {loading && <LinearProgress aria-label={`Loading ${kind}`} />}
        {status === "error" ? (
          <EmptyState
            icon={ErrorOutlineRoundedIcon}
            tone="error"
            title={`Couldn’t load ${kind}`}
            description="Your saved content has not changed. Check your connection and try again."
            action={
              <Button
                variant="outlined"
                onClick={() => setRefresh((value) => value + 1)}
              >
                Retry
              </Button>
            }
          />
        ) : !loading && rows.length === 0 ? (
          <EmptyState
            icon={ArticleOutlinedIcon}
            title={
              search
                ? "No matching entries"
                : statusFilter === "TRASH"
                  ? "Trash is empty"
                  : `No ${kind} here yet`
            }
            description={
              search
                ? "Try another title or change the status filter."
                : statusFilter === "TRASH"
                  ? "Entries you move to trash will appear here."
                  : `Add your first ${noun}, or change the status filter to see other entries.`
            }
            action={
              search || statusFilter !== "ALL" ? (
                <Button
                  onClick={() =>
                    changeFilters({ status: "ALL", search: "", page: "0" })
                  }
                >
                  Show all active entries
                </Button>
              ) : (
                <Button component={RouterLink} to={newLink} variant="outlined">
                  Add {noun}
                </Button>
              )
            }
          />
        ) : (
          <>
            <TableContainer sx={{ display: { xs: "none", sm: "block" } }}>
              <Table
                aria-busy={loading}
                aria-label={
                  kind === "news" ? "News entries" : "Publication entries"
                }
              >
                <TableHead>
                  <TableRow>
                    {columns.map(({ field, label }) => {
                      const active = sortBy === field;
                      const next =
                        active && direction === "asc"
                          ? "descending"
                          : "ascending";
                      return (
                        <TableCell
                          key={field}
                          sortDirection={active ? direction : false}
                        >
                          <Tooltip
                            title={`Sort ${label.toLowerCase()} ${next}`}
                          >
                            <TableSortLabel
                              component="button"
                              type="button"
                              active={active}
                              direction={active ? direction : "asc"}
                              hideSortIcon={false}
                              IconComponent={
                                active
                                  ? ArrowDownwardRoundedIcon
                                  : UnfoldMoreRoundedIcon
                              }
                              onClick={() => changeSort(field)}
                              aria-label={`${label}: sort ${next}`}
                              sx={{
                                whiteSpace: "nowrap",
                                color: active ? "primary.main" : "inherit",
                                "& .MuiTableSortLabel-icon": {
                                  opacity: 1,
                                  color: active
                                    ? "primary.main"
                                    : "text.secondary",
                                },
                              }}
                            >
                              {label}
                            </TableSortLabel>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading && rows.length === 0
                    ? Array.from({ length: 4 }, (_, index) => (
                        <TableRow key={index}>
                          {Array.from({ length: 5 }, (_, column) => (
                            <TableCell key={column}>
                              <Skeleton />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : rows.map((entry) => (
                        <TableRow key={entry.id} hover>
                          <TableCell
                            sx={{ width: "42%", overflowWrap: "anywhere" }}
                          >
                            <Typography variant="body2" fontWeight={600}>
                              {entry.draft?.title || "Untitled"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {kind === "news"
                              ? entry.draft?.date || "—"
                              : entry.draft?.year || "—"}
                          </TableCell>
                          <TableCell>{renderStatus(entry)}</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {displayUpdated(entry.updatedAt)}
                          </TableCell>
                          <TableCell align="right">
                            {renderActions(entry)}
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack gap={1.5} sx={{ display: { xs: "flex", sm: "none" } }}>
              {loading && rows.length === 0
                ? Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} variant="rounded" height={130} />
                  ))
                : rows.map((entry) => (
                    <Box
                      key={entry.id}
                      component="article"
                      sx={{
                        p: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ mb: 1, overflowWrap: "anywhere" }}
                      >
                        {entry.draft?.title || "Untitled"}
                      </Typography>
                      <Stack
                        direction="row"
                        gap={1}
                        alignItems="center"
                        flexWrap="wrap"
                      >
                        {renderStatus(entry)}
                        <Typography variant="caption" color="text.secondary">
                          {kind === "news"
                            ? entry.draft?.date
                            : entry.draft?.year}
                        </Typography>
                      </Stack>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        gap={1}
                        sx={{ mt: 1 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Updated {displayUpdated(entry.updatedAt)}
                        </Typography>
                        {renderActions(entry)}
                      </Stack>
                    </Box>
                  ))}
            </Stack>
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={size}
              onPageChange={(_event, next) =>
                changeFilters({ page: String(next) })
              }
              onRowsPerPageChange={(event) => {
                setSize(Number(event.target.value));
                changeFilters({ page: "0" });
              }}
              rowsPerPageOptions={[10, 25, 50]}
              sx={{
                "& .MuiTablePagination-toolbar": { flexWrap: "wrap", px: 0 },
              }}
            />
          </>
        )}
      </SectionCard>
      <Dialog
        open={Boolean(pending)}
        onClose={() => !busy && setPending(null)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="content-action-title"
      >
        <DialogTitle id="content-action-title">
          {pending?.action === "restore"
            ? "Restore as draft?"
            : "Move to trash?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ overflowWrap: "anywhere" }}>
            <strong>{pending?.entry.draft?.title}</strong>
            {pending?.action === "restore"
              ? " will return to Draft. It will stay hidden from the homepage until you publish it."
              : " will be hidden from the homepage and moved to Trash. You can restore it later."}
          </DialogContentText>
          {actionError && (
            <Alert severity="error" sx={{ mt: 2 }} role="alert">
              {actionError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={pending?.action === "restore" ? "primary" : "error"}
            disabled={busy}
            onClick={confirmAction}
          >
            {busy
              ? "Updating…"
              : pending?.action === "restore"
                ? "Restore as draft"
                : "Move to trash"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
