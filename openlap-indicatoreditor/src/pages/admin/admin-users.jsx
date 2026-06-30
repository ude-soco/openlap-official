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
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import PageHeader from "../../common/components/page-header/page-header";
import SectionCard from "../../common/components/section-card/section-card";
import EmptyState from "../../common/components/empty-state/empty-state";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { requestUsers } from "./utils/manage-apis";

// Friendly labels for the backend RoleType values (read-only display only).
const ROLE_LABELS = {
  ROLE_SUPER_ADMIN: "Super admin",
  ROLE_USER: "User",
  ROLE_USER_WITHOUT_LRS: "User (no LRS)",
  ROLE_DATA_PROVIDER: "Data provider",
};

const roleLabel = (role) => ROLE_LABELS[role] || role;

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50];
const SKELETON_ROWS = 5;

/**
 * Admin Users (read-only). Lists OpenLAP users and their roles from the
 * admin-only GET /v1/users endpoint, with server-side pagination. Displays only
 * safe fields (name, email, roles) — no password, LRS secrets, or status/created
 * date (the backend does not expose those). No write actions.
 */
const AdminUsers = () => {
  const { api } = useContext(AuthContext);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [status, setStatus] = useState("loading");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const loadUsers = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await requestUsers(api, page, size);
      setRows(Array.isArray(data?.content) ? data.content : []);
      setTotal(typeof data?.totalElements === "number" ? data.totalElements : 0);
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load users", error);
      setStatus("error");
    }
  }, [api, page, size]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const loading = status === "loading";
  // Keep previously-loaded rows visible during a page change; only show the
  // skeleton on the very first load.
  const showSkeleton = loading && rows.length === 0;

  return (
    <Stack gap={2}>
      <PageHeader
        title="Users"
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Admin Dashboard", to: "/admin" },
        ]}
        subtitle="All OpenLAP users and the roles assigned to them."
        actions={
          status === "ready" ? (
            <Chip label={`${total} ${total === 1 ? "user" : "users"}`} />
          ) : null
        }
      />

      <SectionCard title="All users">
        {loading && <LinearProgress aria-label="Loading users" />}

        {status === "error" ? (
          <EmptyState
            icon={ErrorOutlineRoundedIcon}
            tone="error"
            title="Couldn’t load users"
            description="Something went wrong while loading the user list."
            action={
              <Button variant="outlined" onClick={loadUsers}>
                Retry
              </Button>
            }
          />
        ) : status === "ready" && rows.length === 0 ? (
          <EmptyState
            icon={PeopleAltOutlinedIcon}
            title="No users found"
            description="There are no OpenLAP users to display."
          />
        ) : (
          <>
            <TableContainer>
              <Table size="small" aria-label="Users">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Roles</TableCell>
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
                            <Skeleton width={120} />
                          </TableCell>
                        </TableRow>
                      ))
                    : rows.map((user) => (
                        <TableRow key={user.id || user.email} hover>
                          <TableCell>{user.name || "—"}</TableCell>
                          <TableCell>{user.email || "—"}</TableCell>
                          <TableCell>
                            {(user.roles || []).length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                —
                              </Typography>
                            ) : (
                              <Stack direction="row" gap={0.5} flexWrap="wrap">
                                {user.roles.map((role) => (
                                  <Chip
                                    key={role}
                                    size="small"
                                    variant="outlined"
                                    color={
                                      role === "ROLE_SUPER_ADMIN"
                                        ? "primary"
                                        : "default"
                                    }
                                    label={roleLabel(role)}
                                  />
                                ))}
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
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

export default AdminUsers;
