import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { updateProfile, updateEmail } from "../utils/account-manager-api";
import { mapFieldErrors, getErrorMessage } from "../../../common/utils/api-errors";
import RoleTypes from "../utils/enums/role-types.js";
import EmptyState from "../../../common/components/empty-state/empty-state";

const ROLE_LABELS = {
  [RoleTypes.user]: "User",
  [RoleTypes.userWithoutLRS]: "User (no LRS connected)",
  [RoleTypes["data provider"]]: "Data Provider",
  [RoleTypes.admin]: "Administrator",
};

const panelSx = (theme) => ({
  p: { xs: 2.5, md: 3 },
  width: "100%",
  borderRadius: `${theme.custom.radii.card}px`,
});

const SectionHeading = ({ children }) => (
  <Typography variant="subtitle1" component="h2" fontWeight={600} gutterBottom>
    {children}
  </Typography>
);
SectionHeading.propTypes = { children: PropTypes.node };

const AccountProfilePanel = ({ loading, error, user, roles, reload }) => {
  const { api, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailErrors, setEmailErrors] = useState({});
  const [emailSaving, setEmailSaving] = useState(false);

  // Prefill from the loaded user (and re-sync after a successful name reload).
  useEffect(() => {
    if (user.name) setName(user.name);
  }, [user.name]);
  useEffect(() => {
    if (user.email) setNewEmail(user.email);
  }, [user.email]);

  if (error) {
    return (
      <Paper variant="outlined" sx={panelSx}>
        <EmptyState
          tone="error"
          title="Couldn't load your account details"
          description="Something went wrong while loading your profile. Please refresh the page to try again."
        />
      </Paper>
    );
  }

  const initial = user.name
    ? user.name.trim().charAt(0).toUpperCase()
    : user.email
      ? user.email.trim().charAt(0).toUpperCase()
      : "";

  const handleSaveName = async (event) => {
    event.preventDefault();
    setNameSaving(true);
    setNameError("");
    try {
      await updateProfile(api, { name });
      enqueueSnackbar("Profile updated.", { variant: "success" });
      reload();
    } catch (errorData) {
      const fields = mapFieldErrors(errorData);
      if (fields.name) {
        setNameError(fields.name);
      } else {
        enqueueSnackbar(getErrorMessage(errorData, "Couldn't update your profile."), {
          variant: "error",
        });
      }
    } finally {
      setNameSaving(false);
    }
  };

  const handleSaveEmail = async (event) => {
    event.preventDefault();
    setEmailSaving(true);
    setEmailErrors({});
    try {
      await updateEmail(api, { newEmail, currentPassword });
      enqueueSnackbar("Email updated. Please sign in again.", { variant: "success" });
      // Email is the JWT subject; the current session is no longer valid.
      logout(); // AuthContext.logout clears tokens and redirects to /login.
    } catch (errorData) {
      const fields = mapFieldErrors(errorData);
      // Domain errors carry only a message + code; surface them on the right field.
      if (errorData?.code === "EMAIL_ALREADY_TAKEN") {
        fields.newEmail = errorData.message;
      }
      if (errorData?.code === "INCORRECT_PASSWORD") {
        fields.currentPassword = errorData.message;
      }
      if (Object.keys(fields).length) {
        setEmailErrors(fields);
      } else {
        enqueueSnackbar(getErrorMessage(errorData, "Couldn't update your email."), {
          variant: "error",
        });
      }
    } finally {
      setEmailSaving(false);
    }
  };

  const nameUnchanged = name.trim() === (user.name || "");
  const emailUnchanged = newEmail.trim() === (user.email || "");

  return (
    <Paper variant="outlined" sx={panelSx}>
      <Stack spacing={3} divider={<Divider flexItem />}>
        {/* Profile / name */}
        <Box component="form" onSubmit={handleSaveName} noValidate>
          <SectionHeading>Profile</SectionHeading>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="flex-start" spacing={2}>
              {loading ? (
                <Skeleton variant="circular" width={56} height={56} />
              ) : (
                <Avatar
                  sx={{
                    width: 56,
                    height: 56,
                    fontSize: 22,
                    fontWeight: 600,
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  }}
                >
                  {initial}
                </Avatar>
              )}
              <TextField
                fullWidth
                label="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                error={Boolean(nameError)}
                helperText={nameError || " "}
                disabled={loading || nameSaving}
              />
            </Stack>
            <Box>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                loading={nameSaving}
                disabled={loading || nameUnchanged || !name.trim()}
              >
                Save changes
              </Button>
            </Box>
          </Stack>
        </Box>

        {/* Email */}
        <Box component="form" onSubmit={handleSaveEmail} noValidate>
          <SectionHeading>Email address</SectionHeading>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              type="email"
              label="Email address"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              error={Boolean(emailErrors.newEmail)}
              helperText={emailErrors.newEmail || " "}
              disabled={loading || emailSaving}
            />
            <TextField
              fullWidth
              type={showPassword ? "text" : "password"}
              label="Current password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              error={Boolean(emailErrors.currentPassword)}
              helperText={
                emailErrors.currentPassword || "Required to change your email address."
              }
              disabled={loading || emailSaving}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowPassword((show) => !show)}
                        onMouseDown={(event) => event.preventDefault()}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Alert severity="warning">
              After changing your email address, you will need to sign in again.
            </Alert>
            <Box>
              <Button
                type="submit"
                variant="contained"
                disableElevation
                loading={emailSaving}
                disabled={loading || emailUnchanged || !newEmail.trim() || !currentPassword}
              >
                Update email
              </Button>
            </Box>
          </Stack>
        </Box>

        {/* Account type (read-only) */}
        <Box>
          <SectionHeading>Account type</SectionHeading>
          {loading ? (
            <Skeleton width={120} height={32} />
          ) : (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {roles?.length ? (
                roles.map((role) => (
                  <Chip key={role} size="small" label={ROLE_LABELS[role] || role} />
                ))
              ) : (
                <Typography variant="body2">—</Typography>
              )}
            </Stack>
          )}
        </Box>
      </Stack>
    </Paper>
  );
};

AccountProfilePanel.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.bool.isRequired,
  user: PropTypes.object.isRequired,
  roles: PropTypes.array,
  reload: PropTypes.func.isRequired,
};

export default AccountProfilePanel;
