import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSnackbar } from "notistack";
import {
  Button,
  Chip,
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
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import PageHeader from "../../common/components/page-header/page-header";
import SectionCard from "../../common/components/section-card/section-card";
import EmptyState from "../../common/components/empty-state/empty-state";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import {
  requestAdminVisualizationTypes,
  requestSetVisualizationTypeStatus,
} from "./utils/manage-apis";
import { useAdminUsage } from "./utils/use-admin-usage";
import UsageChips from "./components/usage-chips";
import CatalogStatusControl from "./components/catalog-status-control";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const SKELETON_ROWS = 5;

const errorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

/**
 * Admin Visualization Types. Lists all chart types from GET /v1/admin/visualizations/types,
 * including disabled items, with client-side pagination. No upload/delete actions.
 */
const AdminVisualizationTypes = () => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState("loading");
  const [types, setTypes] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [updatingId, setUpdatingId] = useState(null);
  const usage = useAdminUsage("visualizationTypes");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await requestAdminVisualizationTypes(api);
      setTypes(Array.isArray(result?.data) ? result.data : []);
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load visualization types", error);
      setStatus("error");
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleStatusChange = async (type, enabled) => {
    setUpdatingId(type.id);
    try {
      const { data } = await requestSetVisualizationTypeStatus(api, type.id, enabled);
      setTypes((prev) =>
        prev.map((item) => (item.id === data.id ? { ...item, ...data } : item))
      );
      enqueueSnackbar(`Visualization type ${enabled ? "enabled" : "disabled"}.`, {
        variant: "success",
      });
    } catch (error) {
      enqueueSnackbar(errorMessage(error, "Could not update visualization type."), {
        variant: "error",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const loading = status === "loading";
  const showSkeleton = loading && types.length === 0;
  const pagedTypes = useMemo(
    () => types.slice(page * size, page * size + size),
    [types, page, size]
  );

  return (
    <Stack gap={2}>
      <PageHeader
        title="Visualization Types"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Admin Dashboard", to: "/admin" },
        ]}
        subtitle="Available chart types, their parent libraries, and selection status."
        actions={
          status === "ready" ? (
            <Chip
              label={`${types.length} ${
                types.length === 1 ? "type" : "types"
              }`}
            />
          ) : null
        }
      />

      <SectionCard title="All chart types">
        {loading && <LinearProgress aria-label="Loading visualization types" />}

        {status === "error" ? (
          <EmptyState
            icon={ErrorOutlineRoundedIcon}
            tone="error"
            title="Couldn’t load chart types"
            description="Something went wrong while loading visualization types."
            action={
              <Button variant="outlined" onClick={load}>
                Retry
              </Button>
            }
          />
        ) : status === "ready" && types.length === 0 ? (
          <EmptyState
            icon={BarChartOutlinedIcon}
            title="No chart types found"
            description="No visualization types are currently available."
          />
        ) : (
          <>
            <TableContainer>
              <Table size="small" aria-label="Visualization types">
                <TableHead>
                  <TableRow>
                    <TableCell>Chart type</TableCell>
                    <TableCell>Library</TableCell>
                    <TableCell>Usage</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {showSkeleton
                    ? Array.from({ length: SKELETON_ROWS }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          <TableCell>
                            <Skeleton />
                          </TableCell>
                          <TableCell>
                            <Skeleton />
                          </TableCell>
                          <TableCell>
                            <Skeleton width={140} />
                          </TableCell>
                          <TableCell>
                            <Skeleton width={160} />
                          </TableCell>
                        </TableRow>
                      ))
                    : pagedTypes.map((type) => (
                        <TableRow key={type.id || `${type.library}-${type.name}`} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {type.name || "—"}
                            </Typography>
                            {type.imageCode && (
                              <Typography variant="caption" color="text.secondary">
                                {type.imageCode}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{type.library || "—"}</TableCell>
                          <TableCell>
                            <UsageChips
                              status={usage.status}
                              usage={usage.byId[type.id]}
                            />
                          </TableCell>
                          <TableCell>
                            <CatalogStatusControl
                              enabled={type.enabled !== false}
                              name={type.name}
                              usage={usage.byId[type.id]}
                              disabled={updatingId === type.id || !type.id}
                              onChange={(enabled) =>
                                handleStatusChange(type, enabled)
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={types.length}
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

export default AdminVisualizationTypes;
