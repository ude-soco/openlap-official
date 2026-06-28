import { useContext, useState } from "react";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import CancelRounded from "@mui/icons-material/CancelRounded";
import { useSnackbar } from "notistack";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";
import { changePassword } from "../utils/account-manager-api";
import { mapFieldErrors, getErrorMessage } from "../../../common/utils/api-errors";
import PasswordChecklist from "../../../common/components/password-checklist/password-checklist";

const panelSx = (theme) => ({
  p: { xs: 2.5, md: 3 },
  width: "100%",
  borderRadius: `${theme.custom.radii.card}px`,
});

// slotProps adding an accessible show/hide toggle to a password field.
const visibilityAdornment = (visible, toggle) => ({
  input: {
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={toggle}
          onMouseDown={(event) => event.preventDefault()}
          edge="end"
        >
          {visible ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    ),
  },
});

const EMPTY_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

const ChangePasswordPanel = () => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await changePassword(api, form);
      enqueueSnackbar("Password changed successfully.", { variant: "success" });
      setForm(EMPTY_FORM);
    } catch (errorData) {
      const fields = mapFieldErrors(errorData);
      // Domain errors carry only a message + code; surface them on the right field.
      if (errorData?.code === "INCORRECT_PASSWORD") {
        fields.currentPassword = errorData.message;
      }
      if (errorData?.code === "PASSWORDS_DO_NOT_MATCH") {
        fields.confirmNewPassword = errorData.message;
      }
      if (Object.keys(fields).length) {
        setErrors(fields);
      } else {
        enqueueSnackbar(getErrorMessage(errorData, "Couldn't change your password."), {
          variant: "error",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const isEmpty =
    !form.currentPassword || !form.newPassword || !form.confirmNewPassword;
  const showMatchFeedback =
    form.confirmNewPassword.length > 0 && !errors.confirmNewPassword;
  const passwordsMatch = form.newPassword === form.confirmNewPassword;

  return (
    <Paper variant="outlined" sx={panelSx}>
      <Typography variant="h6" component="h2" gutterBottom>
        Change password
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            name="currentPassword"
            label="Current password"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={handleChange}
            error={Boolean(errors.currentPassword)}
            helperText={errors.currentPassword || " "}
            disabled={saving}
            slotProps={visibilityAdornment(showCurrent, () =>
              setShowCurrent((s) => !s)
            )}
          />

          <Stack gap={1}>
            <TextField
              fullWidth
              name="newPassword"
              label="New password"
              type={showNew ? "text" : "password"}
              autoComplete="new-password"
              value={form.newPassword}
              onChange={handleChange}
              error={Boolean(errors.newPassword)}
              helperText={errors.newPassword || " "}
              disabled={saving}
              slotProps={visibilityAdornment(showNew, () => setShowNew((s) => !s))}
            />
            <PasswordChecklist password={form.newPassword} />
          </Stack>

          <Stack gap={0.75}>
            <TextField
              fullWidth
              name="confirmNewPassword"
              label="Confirm new password"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              value={form.confirmNewPassword}
              onChange={handleChange}
              error={Boolean(errors.confirmNewPassword)}
              helperText={errors.confirmNewPassword || " "}
              disabled={saving}
              slotProps={visibilityAdornment(showConfirm, () =>
                setShowConfirm((s) => !s)
              )}
            />
            {showMatchFeedback && (
              <Stack direction="row" spacing={1} alignItems="center">
                {passwordsMatch ? (
                  <>
                    <CheckCircleRounded sx={{ fontSize: 18, color: "success.main" }} />
                    <Typography variant="caption" color="success.main">
                      Passwords match
                    </Typography>
                  </>
                ) : (
                  <>
                    <CancelRounded sx={{ fontSize: 18, color: "error.main" }} />
                    <Typography variant="caption" color="error.main">
                      Passwords do not match
                    </Typography>
                  </>
                )}
              </Stack>
            )}
          </Stack>

          <Box>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              loading={saving}
              disabled={isEmpty}
            >
              Update password
            </Button>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};

export default ChangePasswordPanel;
