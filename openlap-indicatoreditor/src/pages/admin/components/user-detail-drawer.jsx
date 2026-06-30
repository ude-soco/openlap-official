import { useCallback, useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSnackbar } from "notistack";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Drawer,
  FormControlLabel,
  FormGroup,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import SectionCard from "../../../common/components/section-card/section-card";
import EmptyState from "../../../common/components/empty-state/empty-state";
import MetadataChip from "../../../common/components/metadata-chip/metadata-chip";
import CustomDialog from "../../../common/components/custom-dialog/custom-dialog";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import {
  requestUpdateUser,
  requestUpdateUserRoles,
  requestUserDetail,
} from "../utils/manage-apis";
import { roleLabel } from "../utils/role-labels";

const SUPER_ADMIN = "ROLE_SUPER_ADMIN";

// The assignable roles, with a short explanation each (shown next to the checkbox).
const ROLE_OPTIONS = [
  {
    value: "ROLE_USER",
    description: "Standard user — can build indicators using a connected LRS.",
  },
  {
    value: "ROLE_USER_WITHOUT_LRS",
    description: "User without a learner LRS connection.",
  },
  {
    value: "ROLE_DATA_PROVIDER",
    description: "Owns/provides a Learning Record Store.",
  },
  {
    value: SUPER_ADMIN,
    description: "Full administrative access to the admin dashboard.",
  },
];

const sameRoleSet = (a, b) => {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((role) => setB.has(role));
};

const errorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || fallback;

// LRS connection tables. Plain render helpers (not components) — all fields are
// secret-free (the backend never returns LRS credentials).
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
 * User detail drawer. Reads GET /v1/admin/users/{id} and supports admin edits:
 * update name/email and replace roles (with confirmation and a clear extra
 * warning when Super admin is removed). No password/delete/deactivate/LRS edits.
 * After a successful save it refreshes its data and notifies the parent via
 * onUpdated so the list row can update.
 */
const UserDetailDrawer = ({ open, userId, onClose, onUpdated }) => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [status, setStatus] = useState("loading");
  const [detail, setDetail] = useState(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [roleDraft, setRoleDraft] = useState([]);
  const [rolesConfirmOpen, setRolesConfirmOpen] = useState(false);

  const applyDetail = useCallback((data) => {
    setDetail(data);
    setNameDraft(data.name || "");
    setEmailDraft(data.email || "");
    setRoleDraft(data.roles || []);
  }, []);

  const load = useCallback(async () => {
    if (!userId) return;
    setStatus("loading");
    setEditingProfile(false);
    try {
      const { data } = await requestUserDetail(api, userId);
      applyDetail(data);
      setStatus("ready");
    } catch (error) {
      console.error("Failed to load user detail", error);
      setStatus("error");
    }
  }, [api, userId, applyDetail]);

  useEffect(() => {
    if (open && userId) {
      load();
    }
  }, [open, userId, load]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data } = await requestUpdateUser(api, userId, {
        name: nameDraft.trim(),
        email: emailDraft.trim(),
      });
      applyDetail(data);
      setEditingProfile(false);
      onUpdated?.(data);
      enqueueSnackbar("User updated.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(errorMessage(error, "Could not update user."), {
        variant: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelProfile = () => {
    setNameDraft(detail?.name || "");
    setEmailDraft(detail?.email || "");
    setEditingProfile(false);
  };

  const toggleRole = (value) => {
    setRoleDraft((prev) =>
      prev.includes(value) ? prev.filter((role) => role !== value) : [...prev, value]
    );
  };

  const handleConfirmRoles = async () => {
    try {
      const { data } = await requestUpdateUserRoles(api, userId, roleDraft);
      applyDetail(data);
      onUpdated?.(data);
      enqueueSnackbar("Roles updated.", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(errorMessage(error, "Could not update roles."), {
        variant: "error",
      });
    }
  };

  const currentRoles = detail?.roles || [];
  const rolesChanged = detail ? !sameRoleSet(roleDraft, currentRoles) : false;
  const rolesValid = roleDraft.length > 0;
  const superAdminRemoved =
    currentRoles.includes(SUPER_ADMIN) && !roleDraft.includes(SUPER_ADMIN);
  const rolesConfirmContent = superAdminRemoved
    ? "<b>This will remove Super admin access from this user.</b><br/>They will lose all administrative privileges. Are you sure you want to continue?"
    : "Update this user&rsquo;s roles to the selected set?";

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box
        role="presentation"
        sx={{ width: { xs: "100vw", sm: 480 }, maxWidth: "100%", p: { xs: 2, sm: 3 } }}
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
            <SectionCard
              title="Profile"
              action={
                !editingProfile && (
                  <Button
                    size="small"
                    startIcon={<EditOutlinedIcon />}
                    onClick={() => setEditingProfile(true)}
                  >
                    Edit
                  </Button>
                )
              }
            >
              {editingProfile ? (
                <Stack gap={2}>
                  <TextField
                    label="Name"
                    size="small"
                    fullWidth
                    required
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                  />
                  <TextField
                    label="Email"
                    type="email"
                    size="small"
                    fullWidth
                    required
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                  />
                  <Stack direction="row" gap={1} justifyContent="flex-end">
                    <Button onClick={handleCancelProfile} disabled={savingProfile}>
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSaveProfile}
                      disabled={
                        savingProfile || !nameDraft.trim() || !emailDraft.trim()
                      }
                    >
                      {savingProfile ? "Saving…" : "Save"}
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack gap={0.75}>
                  <Typography variant="h6">{detail.name || "—"}</Typography>
                  <MetadataChip label="Email" value={detail.email || "—"} />
                  {detail.id && <MetadataChip label="User ID" value={detail.id} />}
                </Stack>
              )}
            </SectionCard>

            <SectionCard
              title="Roles"
              helper="Select the roles for this user. Changes require confirmation."
            >
              <FormGroup>
                {ROLE_OPTIONS.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={roleDraft.includes(option.value)}
                        onChange={() => toggleRole(option.value)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {roleLabel(option.value)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", mb: 0.5 }}
                  />
                ))}
              </FormGroup>
              {!rolesValid && (
                <Typography variant="caption" color="error">
                  Select at least one role.
                </Typography>
              )}
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1 }}>
                <Button
                  variant="contained"
                  disabled={!rolesChanged || !rolesValid}
                  onClick={() => setRolesConfirmOpen(true)}
                >
                  Save roles
                </Button>
              </Stack>
            </SectionCard>

            <SectionCard title="LRS connections as learner/consumer">
              {renderConsumerConnections(detail.lrsConsumerConnections)}
            </SectionCard>

            <SectionCard title="LRS connections as data provider">
              {renderProviderConnections(detail.lrsProviderConnections)}
            </SectionCard>
          </Stack>
        ) : null}
      </Box>

      <CustomDialog
        type="confirm"
        content={rolesConfirmContent}
        open={rolesConfirmOpen}
        toggleOpen={() => setRolesConfirmOpen((prev) => !prev)}
        handler={handleConfirmRoles}
      />
    </Drawer>
  );
};

UserDetailDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  userId: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onUpdated: PropTypes.func,
};

export default UserDetailDrawer;
