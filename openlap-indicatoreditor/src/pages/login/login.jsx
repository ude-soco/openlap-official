import { useContext, useState } from "react";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate } from "react-router-dom";
import { Box, Button, Link, Stack, TextField } from "@mui/material";
import { useSnackbar } from "notistack";
import AuthLayout from "../../common/components/auth-layout/auth-layout";

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
    <AuthLayout
      title="Sign in"
      subtitle="Welcome back to OpenLAP"
      crossLink={{ label: "Sign up", to: "/register" }}
    >
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
      <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
        <Link
          component="button"
          onClick={() => navigate("/register")}
          variant="body2"
          underline="hover"
        >
          Don&apos;t have an account? Create an account
        </Link>
      </Box>
    </AuthLayout>
  );
};

export default Login;
