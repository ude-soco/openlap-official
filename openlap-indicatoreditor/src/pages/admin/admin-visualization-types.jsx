import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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
import { requestVisualizationTypes } from "./utils/manage-apis";

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const SKELETON_ROWS = 5;

/**
 * Admin Visualization Types (read-only). Lists available chart types from GET
 * /v1/visualizations/types with their parent library and required/optional
 * inputs. The endpoint returns the full list (not paged), so pagination here is
 * client-side over the loaded array. No upload/delete/enable/disable actions.
 */
const AdminVisualizationTypes = () => {
  const { api } = useContext(AuthContext);
  const [status, setStatus] = useState("loading");
  const [types, setTypes] = useState([]);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const result = await requestVisualizationTypes(api);
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

  const loading = status === "loading";
  const showSkeleton = loading && types.length === 0;
  const pagedTypes = useMemo(
    () => types.slice(page * size, page * size + size),
    [types, page, size]
  );

  const renderInputs = (inputs) => {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      );
    }
    return (
      <Stack direction="row" gap={0.5} flexWrap="wrap">
        {inputs.map((input, index) => (
          <Chip
            key={input.id || input.title || index}
            size="small"
            variant={input.required ? "filled" : "outlined"}
            color={input.required ? "primary" : "default"}
            label={input.title || input.id || "input"}
          />
        ))}
      </Stack>
    );
  };

  return (
    <Stack gap={2}>
      <PageHeader
        title="Visualization Types"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Admin Dashboard", to: "/admin" },
        ]}
        subtitle="Available chart types, their parent library, and input requirements."
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
                    <TableCell>Inputs</TableCell>
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
                          <TableCell>{renderInputs(type.chartInputs)}</TableCell>
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
