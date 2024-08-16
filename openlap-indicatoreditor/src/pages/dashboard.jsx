import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Divider,
  Grid,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { requestUserDetails } from "./account-manager/utils/account-manager-api.js";
import { AuthContext } from "../setup/auth-context-manager/auth-context-manager.jsx";
import { ArrowForward } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import RoleTypes from "../common/enums/role-types.js";

const Dashboard = () => {
  const {
    api,
    user: { roles },
  } = useContext(AuthContext);
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    user: {
      name: "",
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

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Dashboard</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={2} sx={{ p: 2 }}>
            <Grid item xs={12}>
              <Typography variant="h4">
                {state.user.name ? `Hello, ${state.user.name}` : <Skeleton />}
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper variant="outlined" sx={{ p: 4 }}>
                <Grid container>
                  <Grid item xs={12}>
                    <Typography gutterBottom>
                      #Learning Record Stores
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="h1">2</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      endIcon={<ArrowForward />}
                      onClick={() => navigate("/manage-lrs")}
                    >
                      Manage LRS
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
            {roles.includes(RoleTypes.user) ? (
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 4 }}>
                  <Grid container>
                    <Grid item xs={12}>
                      <Typography gutterBottom>#ISCs created</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="h1">30</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        endIcon={<ArrowForward />}
                        onClick={() => navigate("/isc/editor")}
                      >
                        Create ISCs
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ) : undefined}
            {roles.includes(RoleTypes.user) ? (
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 4 }}>
                  <Grid container>
                    <Grid item xs={12}>
                      <Typography gutterBottom>#Indicators created</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="h1">51</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        endIcon={<ArrowForward />}
                        onClick={() => navigate("/indicator/editor")}
                      >
                        Create Indicators
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            ) : undefined}
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default Dashboard;
