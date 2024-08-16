import React, { useContext, useState } from "react";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate } from "react-router-dom";
import OpenLAPLogo from "../../assets/brand/openlap-logo.svg";
import { Grid, Link, TextField, Typography } from "@mui/material";
import { LoadingButton } from "@mui/lab";

const Login = () => {
  const { login } = useContext(AuthContext);
  const [formFields, setFormFields] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(formFields.email, formFields.password);
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to login", error);
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
    <>
      <Grid
        container
        sx={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: 500,
          p: 4,
        }}
        justifyContent="center"
        alignItems="center"
      >
        <Grid
          item
          xs={12}
          component="img"
          sx={{ height: 50, mb: 3 }}
          src={OpenLAPLogo}
          alt="Soco logo"
        />
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="h5" align="center" color="grey.700">
              Log in to your account
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Grid
              container
              component="form"
              spacing={2}
              onSubmit={handleSubmit}
            >
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  placeholder="example@mail.com"
                  autoFocus
                  onChange={handleFormFields}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="password"
                  label="Password"
                  placeholder="Password"
                  type="password"
                  autoComplete="current-password"
                  onChange={handleFormFields}
                />
              </Grid>
              <Grid item xs={12}>
                <LoadingButton
                  type="submit"
                  fullWidth
                  loading={loading}
                  variant="contained"
                  disabled={
                    formFields.email === "" || formFields.password === ""
                  }
                >
                  <span>Login with email</span>
                </LoadingButton>
              </Grid>
              <Grid item xs={12}>
                <Grid container justifyContent="flex-end">
                  {/* <Grid item xs>
                    <Link href="#" variant="body2">
                      Forgot password?
                    </Link>
                  </Grid> */}
                  <Grid item>
                    <Link
                      onClick={() => navigate("/register")}
                      sx={{ cursor: "pointer" }}
                      variant="body2"
                    >
                      {"Don't have an account? Create an account"}
                    </Link>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default Login;
