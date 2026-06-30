import { useCallback, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import SectionCard from "../../../common/components/section-card/section-card";
import EmptyState from "../../../common/components/empty-state/empty-state";
import MetadataChip from "../../../common/components/metadata-chip/metadata-chip";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { requestUserDetail } from "../utils/manage-apis";
import { roleLabel } from "../utils/role-labels";

// LRS connection tables. Plain render helpers (not components) so they don't need
// PropTypes; all fields shown are secret-free (the backend never returns credentials).
const renderConsumerConnections = (connections) => {
  if (!Array.isArray(connections) || connections.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No LRS connections as a learner/consumer.
      </Typography>
    );
  }
  return (
    <Table size="small" aria-label="Consumer LRS connections">
      <TableHead>
        <TableRow>
          <TableCell>LRS</TableCell>
          <TableCell>Identifier</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {connections.map((connection, index) => (
          <TableRow key={connection.id || `${connection.lrsId}-${index}`}>
            <TableCell>{connection.lrsTitle || "—"}</TableCell>
            <TableCell>{connection.uniqueIdentifier || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const renderProviderConnections = (connections) => {
  if (!Array.isArray(connections) || connections.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No LRS connections as a data provider.
      </Typography>
    );
  }
  return (
    <Table size="small" aria-label="Provider LRS connections">
      <TableHead>
        <TableRow>
          <TableCell>LRS</TableCell>
          <TableCell>Identifier type</TableCell>
          <TableCell align="right">Statements</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {connections.map((connection, index) => (
          <TableRow key={`${connection.lrsId}-${index}`}>
            <TableCell>{connection.lrsTitle || "—"}</TableCell>
            <TableCell>{connection.uniqueIdentifierType || "—"}</TableCell>
            <TableCell align="right">{connection.statementCount ?? "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * Read-only user detail drawer. Fetches GET /v1/admin/users/{id} when opened and
 * shows the user's safe fields, role chips, and LRS connections (consumer and
 * provider) — no secrets. Self-manages loading/error/retry.
 */
const UserDetailDrawer = ({ open, userId, onClose }) => {
  const { api } = useContext(AuthContext);
  const [status, setStatus] = useState("loading");
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setStatus("loading");
    try {
      const { data } = await requestUserDetail(api, userId);
      setDetail(data);
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load user detail", error);
      setStatus("error");
    }
  }, [api, userId]);

  useEffect(() => {
    if (open && userId) {
      load();
    }
  }, [open, userId, load]);

  const roles = detail?.roles || [];

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        role="presentation"
        sx={{ width: { xs: "100vw", sm: 460 }, maxWidth: "100%", p: { xs: 2, sm: 3 } }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Typography variant="h6" component="h2">
            User details
          </Typography>
          <IconButton onClick={onClose} aria-label="Close user details">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        {status === "loading" ? (
          <Stack alignItems="center" sx={{ py: 6 }}>
            <CircularProgress />
          </Stack>
        ) : status === "error" ? (
          <EmptyState
            icon={ErrorOutlineRoundedIcon}
            tone="error"
            title="Couldn’t load user"
            description="Something went wrong while loading this user."
            action={
              <Button variant="outlined" onClick={load}>
                Retry
              </Button>
            }
          />
        ) : detail ? (
          <Stack gap={2.5}>
            <Box>
              <Typography variant="h6">{detail.name || "—"}</Typography>
            </Box>

            <Stack gap={0.75}>
              <MetadataChip label="Email" value={detail.email || "—"} />
              {detail.id && <MetadataChip label="User ID" value={detail.id} />}
            </Stack>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                Roles
              </Typography>
              {roles.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  No roles assigned.
                </Typography>
              ) : (
                <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {roles.map((role) => (
                    <Chip
                      key={role}
                      size="small"
                      variant="outlined"
                      color={role === "ROLE_SUPER_ADMIN" ? "primary" : "default"}
                      label={roleLabel(role)}
                    />
                  ))}
                </Stack>
              )}
            </Box>

            <SectionCard title="LRS connections as learner/consumer">
              {renderConsumerConnections(detail.lrsConsumerConnections)}
            </SectionCard>

            <SectionCard title="LRS connections as data provider">
              {renderProviderConnections(detail.lrsProviderConnections)}
            </SectionCard>
          </Stack>
        ) : null}
      </Box>
    </Drawer>
  );
};

UserDetailDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  userId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default UserDetailDrawer;
