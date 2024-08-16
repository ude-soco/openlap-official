import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";
import { useNavigate } from "react-router-dom";
import OpenLAPLogo from "../../assets/brand/openlap-logo.svg";
import {
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Grid,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import RoleTypes from "../../common/enums/role-types";
import UniqueIdentifierTypes from "../../common/enums/unique-identifier-types";
import { fetchLRSData, register } from "./register-api";
import { Help } from "@mui/icons-material";

const Register = () => {
  const { api } = useContext(AuthContext);
  const [formFields, setFormFields] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: RoleTypes.user,
  });
  const [lrsProviderRequest, setLrsProviderRequest] = useState({
    title: "",
    uniqueIdentifierType: UniqueIdentifierTypes["Account name"],
  });
  const [lrsConsumerRequest, setLrsConsumerRequest] = useState({
    lrsId: "",
    uniqueIdentifier: "",
  });
  const [lrsList, setLrsList] = useState([
    {
      title: "AAA",
      lrsId: "",
      uniqueIdentifierType: "",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        return await fetchLRSData(api);
      } catch (error) {
        console.error("Failed to load LRS list", error);
      }
    };
    loadData().then((response) => {
      setLrsList(response);
    });
  }, [api]);

  const handleFormFields = (event) => {
    const { name, value } = event.target;
    setFormFields(() => ({
      ...formFields,
      [name]: value,
    }));
    if (errors[name] !== "") {
      setErrors(() => ({
        ...errors,
        [name]: "",
      }));
    }
  };

  const handleLrsConsumerRequest = (event) => {
    const { name, value } = event.target;
    setLrsConsumerRequest(() => ({
      ...lrsConsumerRequest,
      [name]: value,
    }));
    if (errors?.["lrsConsumerRequest." + name] !== "") {
      setErrors(() => ({
        ...errors,
        ["lrsConsumerRequest." + name]: "",
      }));
    }
  };

  const handleLrsProviderRequest = (event) => {
    const { name, value } = event.target;
    setLrsProviderRequest(() => ({
      ...lrsProviderRequest,
      [name]: value,
    }));

    if (errors?.["lrsProviderRequest." + name] !== "") {
      setErrors(() => ({
        ...errors,
        ["lrsProviderRequest." + name]: "",
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    if (formFields.role === RoleTypes.user) {
      handleRegister(lrsConsumerRequest, null);
    } else handleRegister(null, lrsProviderRequest);
  };

  const handleRegister = async (lrsConsumerRequest, lrsProviderRequest) => {
    try {
      const response = await register(
        api,
        formFields.name,
        formFields.email,
        formFields.password,
        formFields.confirmPassword,
        formFields.role,
        lrsConsumerRequest,
        lrsProviderRequest,
      );

      if (response.status === 201) {
        navigate("/login");
      }
    } catch (error) {
      if (error.status === 400) {
        setErrors(() => error.data.errors);
        setLoading(false);
      }
      console.error("Failed to register", error);
    }
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
              Create an account
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
                  margin="normal"
                  fullWidth
                  label="*Name"
                  name="name"
                  autoComplete="firstname"
                  error={Boolean(errors?.name)}
                  helperText={errors?.name}
                  autoFocus
                  onChange={handleFormFields}
                />
              </Grid>
              <Grid item xs={12}>
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
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="password"
                  label="Password"
                  placeholder="Password"
                  type="password"
                  autoComplete="current-password"
                  error={Boolean(errors?.password)}
                  helperText={errors?.password}
                  onChange={handleFormFields}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  placeholder="Confirm password"
                  type="password"
                  error={Boolean(errors?.confirmPassword)}
                  helperText={errors?.confirmPassword}
                  onChange={handleFormFields}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl>
                  <FormLabel id="role-label">Choose role</FormLabel>
                  <RadioGroup
                    row
                    aria-labelledby="radio-buttons-group-role-label"
                    name="role"
                    value={formFields.role}
                    onChange={handleFormFields}
                  >
                    <FormControlLabel
                      value={RoleTypes.user}
                      control={<Radio />}
                      label={
                        <>
                          <Grid
                            container
                            spacing={1}
                            alignItems="center"
                            sx={{ pr: 3 }}
                          >
                            <Grid item>
                              <Typography>User</Typography>
                            </Grid>
                            <Grid item>
                              <Tooltip
                                title={
                                  <>
                                    <Typography>
                                      As a User, you will be able to:
                                    </Typography>
                                    <Typography>
                                      • Connect to multiple Leaning Record
                                      Stores (LRS) using your unique identifier
                                      from your LMSs or MOOC platforms
                                    </Typography>
                                    <Typography>
                                      • Create Indicator Specification Cards
                                    </Typography>
                                    <Typography>• Create Indicators</Typography>
                                    <Typography>
                                      • Create Goal, Question, and Indicators
                                    </Typography>
                                  </>
                                }
                              >
                                <IconButton>
                                  <Help />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          </Grid>
                        </>
                      }
                    />
                    <FormControlLabel
                      value={RoleTypes["data provider"]}
                      control={<Radio />}
                      label={
                        <>
                          <Grid container spacing={1} alignItems="center">
                            <Grid item>
                              <Typography>Data Provider</Typography>
                            </Grid>
                            <Grid item>
                              <Tooltip
                                title={
                                  <>
                                    <Typography>
                                      As a Data Provider, you will be able to:
                                    </Typography>
                                    <Typography>
                                      • Create multiple Leaning Record Store
                                      (LRS) instances
                                    </Typography>
                                    <Typography>
                                      • Use Basic Auth token to add data to the
                                      LRS
                                    </Typography>
                                  </>
                                }
                              >
                                <IconButton>
                                  <Help />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          </Grid>
                        </>
                      }
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
              {formFields.role === RoleTypes.user && (
                <>
                  <Grid item xs={12}>
                    <FormControl
                      fullWidth
                      error={Boolean(errors?.["lrsConsumerRequest.lrsId"])}
                    >
                      <InputLabel id="lrs-select-label">
                        Available LRS
                      </InputLabel>
                      <Select
                        name="lrsId"
                        value={lrsConsumerRequest.lrsId}
                        label="LRS ID"
                        onChange={handleLrsConsumerRequest}
                      >
                        {lrsList.map((lrs) => {
                          return (
                            <MenuItem key={lrs.lrsId} value={lrs.lrsId}>
                              {lrs.title}
                            </MenuItem>
                          );
                        })}
                      </Select>
                      {Boolean(errors?.["lrsConsumerRequest.lrsId"]) && (
                        <FormHelperText color="error">
                          {errors?.["lrsConsumerRequest.lrsId"]}
                        </FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="uniqueIdentifier"
                      label="Unique Identifier"
                      placeholder="Unique Identifier"
                      error={Boolean(
                        errors?.["lrsConsumerRequest.uniqueIdentifier"],
                      )}
                      helperText={
                        errors?.["lrsConsumerRequest.uniqueIdentifier"]
                      }
                      onChange={handleLrsConsumerRequest}
                    />
                  </Grid>
                </>
              )}

              {formFields.role === RoleTypes["data provider"] && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      name="title"
                      label="LRS name"
                      placeholder="Name your LRS"
                      error={Boolean(errors?.["lrsProviderRequest.title"])}
                      helperText={errors?.["lrsProviderRequest.title"]}
                      onChange={handleLrsProviderRequest}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="unique-type-select-label">
                        Unique Identifier Type
                      </InputLabel>
                      <Select
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
                          },
                        )}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <LoadingButton
                  type="submit"
                  fullWidth
                  loading={loading}
                  variant="contained"
                >
                  <span>Create an account</span>
                </LoadingButton>
              </Grid>
              <Grid item xs={12}>
                <Grid container justifyContent="flex-end">
                  <Grid item>
                    <Link
                      onClick={() => navigate("/login")}
                      sx={{ cursor: "pointer" }}
                      variant="body2"
                    >
                      {"Already have an account? Log in to your account"}
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

export default Register;
