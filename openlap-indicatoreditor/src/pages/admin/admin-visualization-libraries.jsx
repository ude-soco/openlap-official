import { useCallback, useContext, useEffect, useState } from "react";
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
  TableRow,
  Typography,
} from "@mui/material";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import PageHeader from "../../common/components/page-header/page-header";
import SectionCard from "../../common/components/section-card/section-card";
import EmptyState from "../../common/components/empty-state/empty-state";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import {
  requestVisualizationLibraries,
  requestVisualizationTypes,
} from "./utils/manage-apis";

const SKELETON_ROWS = 4;

/**
 * Admin Visualization Libraries (read-only). Lists installed visualization
 * libraries from GET /v1/visualizations/libraries. The "Chart types" count is a
 * best-effort enhancement derived from GET /v1/visualizations/types (grouped by
 * library name); if that call fails the page still renders with "—" counts. No
 * upload/delete/enable/disable actions.
 */
const AdminVisualizationLibraries = () => {
  const { api } = useContext(AuthContext);
  const [status, setStatus] = useState("loading");
  const [libraries, setLibraries] = useState([]);
  const [typeCountByLibrary, setTypeCountByLibrary] = useState({});

  const load = useCallback(async () => {
    setStatus("loading");
    const [librariesResult, typesResult] = await Promise.allSettled([
      requestVisualizationLibraries(api),
      requestVisualizationTypes(api),
    ]);

    if (librariesResult.status === "rejected") {
      console.error(
        "Failed to load visualization libraries",
        librariesResult.reason
      );
      setStatus("error");
      return;
    }

    setLibraries(
      Array.isArray(librariesResult.value?.data) ? librariesResult.value.data : []
    );

    // Type counts are an enhancement only — a types failure must not fail the page.
    const counts = {};
    if (typesResult.status === "fulfilled") {
      const types = Array.isArray(typesResult.value?.data)
        ? typesResult.value.data
        : [];
      types.forEach((type) => {
        if (type?.library) {
          counts[type.library] = (counts[type.library] || 0) + 1;
        }
      });
    } else {
      console.error(
        "Failed to load visualization types for counts",
        typesResult.reason
      );
    }
    setTypeCountByLibrary(counts);
    setStatus("ready");
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const loading = status === "loading";
  const showSkeleton = loading && libraries.length === 0;

  return (
    <Stack gap={2}>
      <PageHeader
        title="Visualization Libraries"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Admin Dashboard", to: "/admin" },
        ]}
        subtitle="Installed visualization libraries and their source plugins."
        actions={
          status === "ready" ? (
            <Chip
              label={`${libraries.length} ${
                libraries.length === 1 ? "library" : "libraries"
              }`}
            />
          ) : null
        }
      />

      <SectionCard title="All libraries">
        {loading && <LinearProgress aria-label="Loading visualization libraries" />}

        {status === "error" ? (
          <EmptyState
            icon={ErrorOutlineRoundedIcon}
            tone="error"
            title="Couldn’t load libraries"
            description="Something went wrong while loading visualization libraries."
            action={
              <Button variant="outlined" onClick={load}>
                Retry
              </Button>
            }
          />
        ) : status === "ready" && libraries.length === 0 ? (
          <EmptyState
            icon={CategoryOutlinedIcon}
            title="No libraries found"
            description="No visualization libraries are currently installed."
          />
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Visualization libraries">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Creator</TableCell>
                  <TableCell align="right">Chart types</TableCell>
                  <TableCell>Description</TableCell>
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
                        <TableCell align="right">
                          <Skeleton width={24} />
                        </TableCell>
                        <TableCell>
                          <Skeleton />
                        </TableCell>
                      </TableRow>
                    ))
                  : libraries.map((library) => (
                      <TableRow key={library.id || library.name} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {library.name || "—"}
                          </Typography>
                          {library.id && (
                            <Typography variant="caption" color="text.secondary">
                              {library.id}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{library.creator || "—"}</TableCell>
                        <TableCell align="right">
                          {library.name
                            ? typeCountByLibrary[library.name] ?? "—"
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {library.description || "—"}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>
    </Stack>
  );
};

export default AdminVisualizationLibraries;
