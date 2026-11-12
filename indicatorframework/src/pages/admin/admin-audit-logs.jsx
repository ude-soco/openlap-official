import { Fragment, useCallback, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Chip,
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
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import HistoryToggleOffRoundedIcon from "@mui/icons-material/HistoryToggleOffRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import PageHeader from "../../common/components/page-header/page-header";
import SectionCard from "../../common/components/section-card/section-card";
import EmptyState from "../../common/components/empty-state/empty-state";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { requestAdminAuditLogs } from "./utils/manage-apis";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const SKELETON_ROWS = 5;

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "—";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const hasMetadata = (metadata) =>
  metadata && typeof metadata === "object" && Object.keys(metadata).length > 0;

const formatMetadataValue = (value) => {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const OutcomeChip = ({ outcome }) => {
  const normalized = outcome === "FAILURE" ? "FAILURE" : "SUCCESS";
  return (
    <Chip
      size="small"
      label={normalized}
      color={normalized === "SUCCESS" ? "success" : "warning"}
      variant={normalized === "SUCCESS" ? "filled" : "outlined"}
    />
  );
};

OutcomeChip.propTypes = {
  outcome: PropTypes.string,
};

const MetadataDetails = ({ metadata }) => (
  <Stack gap={1} sx={{ py: 1.5 }}>
    {Object.entries(metadata).map(([key, value]) => (
      <Box
        key={key}
        sx={(theme) => ({
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "180px minmax(0, 1fr)" },
          gap: 1,
          p: 1.25,
          borderRadius: `${theme.custom.radii.card}px`,
          backgroundColor: "action.hover",
        })}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {key}
        </Typography>
        <Box
          component="pre"
          sx={{
            m: 0,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontFamily: "monospace",
            fontSize: "0.8125rem",
            lineHeight: 1.5,
          }}
        >
          {formatMetadataValue(value)}
        </Box>
      </Box>
    ))}
  </Stack>
);

MetadataDetails.propTypes = {
  metadata: PropTypes.objectOf(PropTypes.any).isRequired,
};

const AdminAuditLogs = () => {
  const { api } = useContext(AuthContext);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [status, setStatus] = useState("loading");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const loadAuditLogs = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await requestAdminAuditLogs(api, page, size);
      setRows(Array.isArray(data?.content) ? data.content : []);
      setTotal(typeof data?.totalElements === "number" ? data.totalElements : 0);
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load audit logs", error);
      setStatus("error");
    }
  }, [api, page, size]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  const handleToggle = (rowKey) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const loading = status === "loading";
  const showSkeleton = loading && rows.length === 0;

  return (
    <Stack gap={2}>
      <PageHeader
        title="Audit Logs"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Admin Dashboard", to: "/admin" },
        ]}
        subtitle="Security-sensitive admin actions recorded by OpenLAP."
        actions={
          status === "ready" ? (
            <Chip label={`${total} ${total === 1 ? "entry" : "entries"}`} />
          ) : null
        }
      />

      <SectionCard title="Admin audit log">
        {loading && <LinearProgress aria-label="Loading audit logs" />}

        {status === "error" ? (
          <EmptyState
            icon={ErrorOutlineRoundedIcon}
            tone="error"
            title="Couldn’t load audit logs"
            description="Something went wrong while loading the admin audit logs."
            action={
              <Button variant="outlined" onClick={loadAuditLogs}>
                Retry
              </Button>
            }
          />
        ) : status === "ready" && rows.length === 0 ? (
          <EmptyState
            icon={HistoryToggleOffRoundedIcon}
            title="No audit logs found"
            description="No admin audit entries have been recorded yet."
          />
        ) : (
          <>
            <TableContainer>
              <Table size="small" aria-label="Admin audit logs">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Actor</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Resource type</TableCell>
                    <TableCell>Resource</TableCell>
                    <TableCell>Outcome</TableCell>
                    <TableCell>Message</TableCell>
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
                            <Skeleton width={140} />
                          </TableCell>
                          <TableCell>
                            <Skeleton width={160} />
                          </TableCell>
                          <TableCell>
                            <Skeleton width={180} />
                          </TableCell>
                          <TableCell>
                            <Skeleton width={120} />
                          </TableCell>
                          <TableCell>
                            <Skeleton width={160} />
                          </TableCell>
                          <TableCell>
                            <Skeleton width={90} />
                          </TableCell>
                          <TableCell>
                            <Skeleton />
                          </TableCell>
                        </TableRow>
                      ))
                    : rows.map((entry, index) => {
                        const rowKey =
                          entry.id ||
                          `${entry.timestamp || "timestamp"}-${entry.action || "action"}-${index}`;
                        const metadataAvailable = hasMetadata(entry.metadata);
                        const expanded = expandedIds.has(rowKey);
                        return (
                          <Fragment key={rowKey}>
                            <TableRow hover>
                              <TableCell padding="checkbox">
                                <IconButton
                                  size="small"
                                  aria-label={
                                    expanded ? "Hide metadata" : "Show metadata"
                                  }
                                  disabled={!metadataAvailable}
                                  onClick={() => handleToggle(rowKey)}
                                >
                                  {expanded ? (
                                    <ExpandLessRoundedIcon />
                                  ) : (
                                    <ExpandMoreRoundedIcon />
                                  )}
                                </IconButton>
                              </TableCell>
                              <TableCell>{formatTimestamp(entry.timestamp)}</TableCell>
                              <TableCell>{entry.actorEmail || "—"}</TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                                  {entry.action || "—"}
                                </Typography>
                              </TableCell>
                              <TableCell>{entry.resourceType || "—"}</TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {entry.resourceLabel || "—"}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <OutcomeChip outcome={entry.outcome} />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {entry.message || "—"}
                                </Typography>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell
                                colSpan={8}
                                sx={{
                                  py: 0,
                                  borderBottom: expanded ? undefined : "none",
                                }}
                              >
                                <Collapse in={expanded} timeout="auto" unmountOnExit>
                                  {metadataAvailable && (
                                    <MetadataDetails metadata={entry.metadata} />
                                  )}
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
              count={total}
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

export default AdminAuditLogs;
