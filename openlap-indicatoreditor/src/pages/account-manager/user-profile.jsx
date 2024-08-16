import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";
import {
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { requestUserDetails } from "./utils/account-manager-api.js";
import { Edit } from "@mui/icons-material";

const UserProfile = () => {
  const { logout, api, user } = useContext(AuthContext);

  const [state, setState] = useState({
    loading: true,
    page: 1,
    user: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      lrsProviderList: [],
      lrsConsumerList: [],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        return await requestUserDetails(api);
      } catch (error) {
        console.error("Failed to load user data", error);
      }
    };
    loadData().then((response) => {
      setState((prevState) => ({
        ...prevState,
        user: {
          ...prevState.user,
          ...response,
        },
        loading: false,
      }));
    });
  }, []);

  const togglePage = (pageNumber) => {
    setState((prevState) => ({
      ...prevState,
      page: pageNumber,
    }));
  };

  const handleFormFields = (event) => {
    const { name, value } = event.target;
    setState((prevState) => ({
      ...state,
      user: {
        ...prevState.user,
        [name]: value,
      },
    }));
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Account Settings</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2} sx={{ pt: 5 }} justifyContent="center">
            <Grid item xs={12} md={2}>
              <Grid container direction="column">
                <Paper variant="outlined" component="form">
                  <List component="div" disablePadding>
                    <ListItemButton
                      onClick={() => togglePage(1)}
                      selected={state.page === 1}
                    >
                      <ListItemText primary="Account" />
                    </ListItemButton>
                  </List>
                  <Divider />
                  <List component="div" disablePadding>
                    <ListItemButton
                      onClick={() => togglePage(2)}
                      selected={state.page === 2}
                    >
                      <ListItemText primary="Change Password" />
                    </ListItemButton>
                  </List>
                </Paper>
              </Grid>
            </Grid>
            {state.page === 1 && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Grid container justifyContent="center" spacing={2}>
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography variant="h5">
                            {state.user.name ? (
                              `Hello, ${state.user.name}`
                            ) : (
                              <Skeleton />
                            )}
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Grid container spacing={1} alignItems="center">
                            <Grid item>
                              <Typography>Email:</Typography>
                            </Grid>
                            {state.user.email ? (
                              <>
                                <Grid item>
                                  <Chip label={state.user.email} />
                                </Grid>
                                <Grid item>
                                  <IconButton size="small">
                                    <Edit />
                                  </IconButton>
                                </Grid>
                              </>
                            ) : undefined}
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
            {state.page === 2 && (
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 3 }}>
                  <Grid container justifyContent="center" spacing={2}>
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <Typography>Change password</Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            name="password"
                            label="Password"
                            placeholder="Password"
                            type="password"
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
                            onChange={handleFormFields}
                          />
                        </Grid>
                      </Grid>
                    </Grid>

                    <Grid item xs={12}>
                      <Button variant="contained" fullWidth disabled>
                        Update
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default UserProfile;
