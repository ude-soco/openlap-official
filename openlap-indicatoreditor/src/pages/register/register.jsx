import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  Grid,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import RoleTypes from "../account-manager/utils/enums/role-types";
import UniqueIdentifierTypes from "../account-manager/utils/enums/unique-identifier-types";
import { requestAvailableLrsList, register } from "./register-api";
import {
  CancelRounded,
  CheckCircleRounded,
  Help,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useSnackbar } from "notistack";
import AuthLayout from "../../common/components/auth-layout/auth-layout";
import PasswordChecklist from "../../common/components/password-checklist/password-checklist";
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

const Register = () => {
  const { api } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [formFields, setFormFields] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: RoleTypes.userWithoutLRS,
  });
  const [lrsProviderRequest, setLrsProviderRequest] = useState({
    title: "",
    uniqueIdentifierType: UniqueIdentifierTypes["Account name"],
  });
  const [lrsConsumerRequest, setLrsConsumerRequest] = useState({
    lrsId: "",
    uniqueIdentifier: "",
  });
  const [lrsList, setLrsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lrsConnect, setLrsConnect] = useState(false);
  const [errors, setErrors] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    loadLRSData();
  }, []);

  const loadLRSData = async () => {
    try {
      const response = await requestAvailableLrsList(api);
      setLrsList(response);
    } catch (error) {
      console.error("Failed to load LRS list", error);
    }
  };

  const handleFormFields = (event) => {
    const { name, value } = event.target;
    setFormFields(() => ({ ...formFields, [name]: value }));
    if (errors !== null) {
      if (errors[name] !== "") {
        setErrors(() => ({ ...errors, [name]: "" }));
      }
    }
  };

  const handleSkipRole = (event) => {
    setFormFields((prevState) => ({
      ...prevState,
      role: event.target.checked ? RoleTypes.user : RoleTypes.userWithoutLRS,
    }));
    setLrsConnect(event.target.checked);
  };

  const handleLrsConsumerRequest = (event) => {
    const { name, value } = event.target;
    setLrsConsumerRequest(() => ({ ...lrsConsumerRequest, [name]: value }));
    if (errors?.["lrsConsumerRequest." + name] !== "") {
      setErrors(() => ({
        ...errors,
        ["lrsConsumerRequest." + name]: "",
      }));
    }
  };

  const handleLrsProviderRequest = (event) => {
    const { name, value } = event.target;
    setLrsProviderRequest(() => ({ ...lrsProviderRequest, [name]: value }));

    if (errors?.["lrsProviderRequest." + name] !== "") {
      setErrors(() => ({
        ...errors,
        ["lrsProviderRequest." + name]: "",
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await register(
        api,
        formFields.name,
        formFields.email,
        formFields.password,
        formFields.confirmPassword,
        formFields.role,
        formFields.role === RoleTypes.user ? lrsConsumerRequest : null,
        formFields.role === RoleTypes["data provider"]
          ? lrsProviderRequest
          : null
      );
      if (response.status === 201) {
        enqueueSnackbar("Account created successfully!", {
          variant: "success",
        });
        navigate("/login");
      }
    } catch (error) {
      if (error.status === 400) {
        setErrors(error.data.errors);
      } else if (error.status === 409 || error.status === 404) {
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
      title="Create your account"
      subtitle="Join OpenLAP to design and implement your learning analytics indicators"
      crossLink={{ label: "Sign in", to: "/login" }}
      maxWidth={560}
    >
      <Stack gap={3} component="form" onSubmit={handleSubmit}>
        {/* Account details */}
        <Stack gap={2}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: "0.08em" }}
          >
            Account details
          </Typography>
          <TextField
            fullWidth
            label="Name"
            name="name"
            autoComplete="name"
            placeholder="Max Mustermann"
            error={Boolean(errors?.name)}
            helperText={errors?.name}
            autoFocus
            onChange={handleFormFields}
          />
          <TextField
            fullWidth
            label="Email Address"
            name="email"
            autoComplete="email"
            placeholder="example@mail.com"
            error={Boolean(errors?.email)}
            helperText={errors?.email}
            onChange={handleFormFields}
          />
          <Stack gap={1}>
            <TextField
              fullWidth
              name="password"
              label="Password"
              placeholder="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              error={Boolean(errors?.password)}
              helperText={errors?.password}
              onChange={handleFormFields}
              slotProps={visibilityAdornment(showPassword, () =>
                setShowPassword((s) => !s)
              )}
            />
            <PasswordChecklist password={formFields.password} />
          </Stack>
          <Stack gap={0.75}>
            <TextField
              fullWidth
              name="confirmPassword"
              label="Confirm Password"
              placeholder="Confirm password"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              error={Boolean(errors?.confirmPassword)}
              helperText={errors?.confirmPassword}
              onChange={handleFormFields}
              slotProps={visibilityAdornment(showConfirmPassword, () =>
                setShowConfirmPassword((s) => !s)
              )}
            />
            {formFields.confirmPassword.length > 0 &&
              !errors?.confirmPassword && (
                <Stack direction="row" spacing={1} alignItems="center">
                  {formFields.password === formFields.confirmPassword ? (
                    <>
                      <CheckCircleRounded
                        sx={{ fontSize: 18, color: "success.main" }}
                      />
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
        </Stack>

        <Divider />

        {/* Learning Record Store connection */}
        <Stack gap={2}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: "0.08em" }}
          >
            Learning Record Store connection
          </Typography>
          <Box
            sx={(t) => ({
              border: `1px solid ${t.palette.divider}`,
              borderRadius: `${t.custom.radii.input}px`,
              px: 2,
              py: 0.5,
            })}
          >
            <FormControlLabel
              control={
                <Switch checked={lrsConnect} onChange={handleSkipRole} />
              }
              label="Connect to a Learning Record Store (LRS)?"
              labelPlacement="start"
              sx={{ ml: 0, mr: 0, width: "100%", justifyContent: "space-between" }}
            />
          </Box>
          {lrsConnect && (
            <>
              <FormControl>
                <FormLabel id="role-label">Choose role</FormLabel>
                <RadioGroup
                  row
                  name="role"
                  value={formFields.role}
                  onChange={handleFormFields}
                  sx={{ flexWrap: "wrap" }}
                >
                  <FormControlLabel
                    value={RoleTypes.user}
                    control={<Radio />}
                    label={
                      <Grid
                        container
                        spacing={1}
                        alignItems="center"
                        sx={{ pr: 3 }}
                      >
                        <Typography>User</Typography>
                        <Tooltip
                          title={
                            <Typography>
                              As a User, you will be able to:
                              <br />
                              • Connect to multiple Learning Record Stores (LRS)
                              using your unique identifier from your LMSs or MOOC
                              platforms
                              <br />
                              • Create Indicator Specification Cards
                              <br />• Create Indicators
                            </Typography>
                          }
                        >
                          <IconButton size="small" aria-label="What a User can do">
                            <Help fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    }
                  />
                  <FormControlLabel
                    value={RoleTypes["data provider"]}
                    control={<Radio />}
                    label={
                      <Grid container spacing={1} alignItems="center">
                        <Typography>Data Provider</Typography>
                        <Tooltip
                          title={
                            <Typography>
                              As a Data Provider, you will be able to:
                              <br />• Create multiple Learning Record Store (LRS)
                              instances
                              <br />• Use Basic Auth token to add data to the LRS
                            </Typography>
                          }
                        >
                          <IconButton
                            size="small"
                            aria-label="What a Data Provider can do"
                          >
                            <Help fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Grid>
                    }
                  />
                </RadioGroup>
              </FormControl>
              {formFields.role === RoleTypes.user && (
                <>
                  <FormControl
                    fullWidth
                    error={Boolean(errors?.["lrsConsumerRequest.lrsId"])}
                  >
                    <InputLabel id="lrs-select-label">Available LRS</InputLabel>
                    <Select
                      variant="outlined"
                      name="lrsId"
                      value={lrsConsumerRequest.lrsId}
                      label="Available LRS"
                      onChange={handleLrsConsumerRequest}
                    >
                      {lrsList.length > 0
                        ? lrsList.map((lrs) => {
                            return (
                              <MenuItem key={lrs.lrsId} value={lrs.lrsId}>
                                {lrs.title}
                              </MenuItem>
                            );
                          })
                        : null}
                    </Select>
                    {Boolean(errors?.["lrsConsumerRequest.lrsId"]) && (
                      <FormHelperText color="error">
                        {errors?.["lrsConsumerRequest.lrsId"]}
                      </FormHelperText>
                    )}
                  </FormControl>
                  <TextField
                    fullWidth
                    name="uniqueIdentifier"
                    label="Unique Identifier"
                    error={Boolean(
                      errors?.["lrsConsumerRequest.uniqueIdentifier"]
                    )}
                    helperText={errors?.["lrsConsumerRequest.uniqueIdentifier"]}
                    onChange={handleLrsConsumerRequest}
                  />
                </>
              )}

              {formFields.role === RoleTypes["data provider"] && (
                <>
                  <TextField
                    fullWidth
                    name="title"
                    label="Create an LRS"
                    placeholder="Name your LRS"
                    error={Boolean(errors?.["lrsProviderRequest.title"])}
                    helperText={errors?.["lrsProviderRequest.title"]}
                    onChange={handleLrsProviderRequest}
                  />
                  <FormControl fullWidth>
                    <InputLabel id="unique-type-select-label">
                      Unique Identifier Type
                    </InputLabel>
                    <Select
                      variant="outlined"
                      labelId="unique-type-select-label"
                      name="uniqueIdentifierType"
                      value={lrsProviderRequest.uniqueIdentifierType}
                      label="Unique Identifier Type"
                      onChange={handleLrsProviderRequest}
                    >
                      {Object.entries(UniqueIdentifierTypes).map(
                        ([key, value]) => {
                          return (
                            <MenuItem key={key} value={value}>
                              {key}
                            </MenuItem>
                          );
                        }
                      )}
                    </Select>
                  </FormControl>
                </>
              )}
            </>
          )}
        </Stack>

        <Button
          type="submit"
          fullWidth
          size="large"
          loading={loading}
          variant="contained"
          loadingPosition="start"
          loadingIndicator="Preparing your account..."
        >
          {!loading && "Create an account"}
        </Button>
      </Stack>

      <Typography
        variant="body2"
        color="text.secondary"
        align="center"
        sx={{ mt: 3 }}
      >
        Already have an account?{" "}
        <Link
          component="button"
          type="button"
          onClick={() => navigate("/login")}
          underline="hover"
          sx={{ fontWeight: 600 }}
        >
          Log in to your account
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

export default Register;
