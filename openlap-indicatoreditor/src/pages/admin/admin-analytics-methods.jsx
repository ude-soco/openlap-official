import { Fragment, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  LinearProgress,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import PageHeader from "../../common/components/page-header/page-header";
import SectionCard from "../../common/components/section-card/section-card";
import EmptyState from "../../common/components/empty-state/empty-state";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import {
  requestAnalyticsMethodInputParams,
  requestAnalyticsMethods,
} from "./utils/manage-apis";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const SKELETON_ROWS = 5;

/**
 * Admin Analytics Methods (read-only). Lists available analytics methods from
 * GET /v1/analytics/methods (id, name, description). A method's inputs and
 * parameters come from GET /v1/analytics/methods/input-params/{id}, which
 * resolves the method's class from its JAR server-side — so they are loaded
 * lazily, only when a row is expanded. No upload/delete/enable/reload actions.
 */
const AdminAnalyticsMethods = () => {
  const { api } = useContext(AuthContext);
  const [status, setStatus] = useState("loading");
  const [methods, setMethods] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  // Per-method inputs/params cache: { [id]: { status, inputs, params } }.
  const [detailsById, setDetailsById] = useState({});

  const loadMethods = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await requestAnalyticsMethods(api);
      setMethods(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load analytics methods", error);
      setStatus("error");
    }
  }, [api]);

  useEffect(() => {
    loadMethods();
  }, [loadMethods]);

  const loadDetails = useCallback(
    async (id) => {
      setDetailsById((prev) => ({
        ...prev,
        [id]: { status: "loading", inputs: [], params: [] },
      }));
      try {
        const { data } = await requestAnalyticsMethodInputParams(api, id);
        setDetailsById((prev) => ({
          ...prev,
          [id]: {
            status: "ready",
            inputs: Array.isArray(data?.inputs) ? data.inputs : [],
            params: Array.isArray(data?.params) ? data.params : [],
          },
        }));
      } catch (error) {
        console.error(`Failed to load inputs/params for analytics method ${id}`, error);
        setDetailsById((prev) => ({
          ...prev,
          [id]: { status: "error", inputs: [], params: [] },
        }));
      }
    },
    [api]
  );

  const handleToggle = (id) => {
    if (!id) return;
    const willExpand = !expandedIds.has(id);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (willExpand) next.add(id);
      else next.delete(id);
      return next;
    });
    const existing = detailsById[id];
    if (willExpand && (!existing || existing.status === "error")) {
      loadDetails(id);
    }
  };

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const loading = status === "loading";
  const showSkeleton = loading && methods.length === 0;
  const pagedMethods = useMemo(
    () => methods.slice(page * size, page * size + size),
    [methods, page, size]
  );

  const renderChips = (items) =>
    items.map((item, index) => (
      <Chip
        key={item.id || item.title || index}
        size="small"
        variant={item.required ? "filled" : "outlined"}
        color={item.required ? "primary" : "default"}
        label={item.title || item.id || "—"}
      />
    ));

  const renderGroup = (label, items, emptyText) => (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      {Array.isArray(items) && items.length > 0 ? (
        <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
          {renderChips(items)}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      )}
    </Box>
  );

  const renderDetail = (id) => {
    const detail = detailsById[id];
    if (!detail || detail.status === "loading") {
      return (
        <Stack direction="row" gap={1} alignItems="center" sx={{ py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Loading inputs and parameters…
          </Typography>
        </Stack>
      );
    }
    if (detail.status === "error") {
      return (
        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap" sx={{ py: 1 }}>
          <ErrorOutlineRoundedIcon fontSize="small" color="warning" />
          <Typography variant="body2" color="text.secondary">
            Couldn&rsquo;t load inputs and parameters.
          </Typography>
          <Button size="small" onClick={() => loadDetails(id)}>
            Retry
          </Button>
        </Stack>
      );
    }
    return (
      <Stack gap={1.5} sx={{ py: 1 }}>
        {renderGroup("Inputs", detail.inputs, "No inputs")}
        {renderGroup("Parameters", detail.params, "No parameters")}
      </Stack>
    );
  };

  return (
    <Stack gap={2}>
      <PageHeader
        title="Analytics Methods"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Admin Dashboard", to: "/admin" },
        ]}
        subtitle="Available analytics methods and, on expand, their inputs and parameters."
        actions={
          status === "ready" ? (
            <Chip
              label={`${methods.length} ${
                methods.length === 1 ? "method" : "methods"
              }`}
            />
          ) : null
        }
      />

      <SectionCard title="All analytics methods">
        {loading && <LinearProgress aria-label="Loading analytics methods" />}

        {status === "error" ? (
          <EmptyState
            icon={ErrorOutlineRoundedIcon}
            tone="error"
            title="Couldn’t load analytics methods"
            description="Something went wrong while loading the analytics methods."
            action={
              <Button variant="outlined" onClick={loadMethods}>
                Retry
              </Button>
            }
          />
        ) : status === "ready" && methods.length === 0 ? (
          <EmptyState
            icon={AnalyticsOutlinedIcon}
            title="No analytics methods found"
            description="No analytics methods are currently available."
          />
        ) : (
          <>
            <TableContainer>
              <Table size="small" aria-label="Analytics methods">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Method</TableCell>
                    <TableCell>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {showSkeleton
                    ? Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell padding="checkbox">
                            <Skeleton variant="circular" width={24} height={24} />
                          </TableCell>
                          <TableCell>
                            <Skeleton />
                          </TableCell>
                          <TableCell>
                            <Skeleton />
                          </TableCell>
                        </TableRow>
                      ))
                    : pagedMethods.map((method) => {
                        const id = method.id;
                        const expanded = expandedIds.has(id);
                        return (
                          <Fragment key={id || method.name}>
                            <TableRow hover>
                              <TableCell padding="checkbox">
                                <IconButton
                                  size="small"
                                  aria-label={
                                    expanded ? "Hide details" : "Show details"
                                  }
                                  onClick={() => handleToggle(id)}
                                >
                                  {expanded ? (
                                    <ExpandLessRoundedIcon />
                                  ) : (
                                    <ExpandMoreRoundedIcon />
                                  )}
                                </IconButton>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {method.name || "—"}
                                </Typography>
                                {id && (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {id}
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {method.description || "—"}
                                </Typography>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                sx={{
                                  py: 0,
                                  borderBottom: expanded ? undefined : "none",
                                }}
                              >
                                <Collapse in={expanded} timeout="auto" unmountOnExit>
                                  {renderDetail(id)}
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </Fragment>
                        );
                      })}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={methods.length}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={size}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            />
          </>
        )}
      </SectionCard>
    </Stack>
  );
};

export default AdminAnalyticsMethods;
