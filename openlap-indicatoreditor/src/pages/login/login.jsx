import { useContext, useState } from "react";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { useSnackbar } from "notistack";
import AuthLayout from "../../common/components/auth-layout/auth-layout";
import OpenLAPIcon from "../../assets/brand/openlap-icon.svg";

// Returns slotProps that add an accessible show/hide toggle to a password field.
const visibilityAdornment = (visible, toggle) => ({
  input: {
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={toggle}
          onMouseDown={(e) => e.preventDefault()}
          edge="end"
        >
          {visible ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    ),
  },
});

const Login = () => {
  const { login } = useContext(AuthContext);
  const [formFields, setFormFields] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formFields.email, formFields.password);
      enqueueSnackbar("Login successful!", { variant: "success" });
      navigate("/dashboard");
    } catch (error) {
      if (error.status === 401) {
        enqueueSnackbar(error.data.message, { variant: "error" });
      } else {
        enqueueSnackbar("An unexpected error occurred. Please try again.", {
          variant: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFormFields = (event) => {
    const { name, value } = event.target;
    setFormFields(() => ({
      ...formFields,
      [name]: value,
    }));
  };

  return (
    <AuthLayout
      animate
      icon={
        <Box
          component="img"
          src={OpenLAPIcon}
          alt=""
          sx={{ height: 48, width: "auto" }}
        />
      }
      title="Welcome back"
      subtitle="Sign in to your OpenLAP account"
      crossLink={{ label: "Sign up", to: "/register" }}
    >
      <Stack gap={2.5} component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Email Address"
          name="email"
          autoComplete="email"
          placeholder="example@mail.com"
          autoFocus
          onChange={handleFormFields}
        />
        <TextField
          fullWidth
          name="password"
          label="Password"
          placeholder="Password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          onChange={handleFormFields}
          slotProps={visibilityAdornment(showPassword, () =>
            setShowPassword((s) => !s)
          )}
        />
        <Button
          type="submit"
          fullWidth
          size="large"
          loading={loading}
          variant="contained"
          loadingPosition="start"
          loadingIndicator="Logging in..."
          disabled={formFields.email === "" || formFields.password === ""}
        >
          {!loading && "Sign in"}
        </Button>
      </Stack>

      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ mt: 3 }}
      >
        Don&apos;t have an account?{" "}
        <Link
          component="button"
          type="button"
          onClick={() => navigate("/register")}
          underline="hover"
          sx={{ fontWeight: 600 }}
        >
          Create an account
        </Link>
      </Typography>

      <Typography
        variant="caption"
        color="text.secondary"
        align="center"
        sx={{ display: "block", mt: 3 }}
      >
        Part of the OpenLAP learning analytics ecosystem
      </Typography>
    </AuthLayout>
  );
};

export default Login;
