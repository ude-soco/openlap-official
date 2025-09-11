import { useContext, useState } from "react";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate } from "react-router-dom";
import OpenLAPLogo from "../../assets/brand/openlap-logo.svg";
import OpenLAPIcon from "../../assets/brand/openlap-icon.svg";
import {
  Box,
  Button,
  Link,
  Grid,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Container,
} from "@mui/material";
import { useSnackbar } from "notistack";
import ToggleColorMode from "../landing-page/components/toggle-color-mode.jsx";

const logoStyle = {
  width: "120px",
  height: "auto",
  cursor: "pointer",
};

const iconStyle = {
  width: "60px",
  height: "auto",
};

const Login = () => {
  const { login } = useContext(AuthContext);
  const [formFields, setFormFields] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
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
    <Box sx={{ p: 4 }}>
      <Grid container justifyContent="center">
        <Grid size={{ xs: 12, md: 8, xl: 6 }}>
          <Grid container justifyContent="space-between">
            <Tooltip title="To homepage">
              <Box
                component="img"
                style={logoStyle}
                src={OpenLAPLogo}
                alt="Soco logo"
                onClick={() => navigate("/")}
              />
            </Tooltip>

            <Grid container spacing={2}>
              <ToggleColorMode />
              <Button
                disableElevation
                variant="contained"
                size="small"
                onClick={() => navigate("/register")}
              >
                Sign up
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        spacing={2}
        sx={{ height: "75vh" }}
      >
        <Box
          component="img"
          style={iconStyle}
          src={OpenLAPIcon}
          alt="Soco logo"
        />
        <Typography variant="h5" align="center" color="textSecondary">
          Sign in
        </Typography>
        <Container maxWidth="sm">
          <Stack gap={2}>
            <Stack gap={2} component="form" onSubmit={handleSubmit}>
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
                type="password"
                autoComplete="current-password"
                onChange={handleFormFields}
              />
              <Button
                type="submit"
                fullWidth
                loading={loading}
                variant="contained"
                loadingPosition="start"
                loadingIndicator="Logging in..."
                disabled={formFields.email === "" || formFields.password === ""}
              >
                {!loading && "Login with email"}
              </Button>
            </Stack>
            <Grid container justifyContent="flex-end">
              {/* 
              <Link href="#" variant="body2">
                Forgot password?
              </Link>
             */}
              <Link
                component="button"
                onClick={() => navigate("/register")}
                variant="body2"
                underline="hover"
              >
                <span>Don't have an account? Create an account</span>
              </Link>
            </Grid>
          </Stack>
        </Container>
      </Grid>
    </Box>
  );
};

export default Login;
