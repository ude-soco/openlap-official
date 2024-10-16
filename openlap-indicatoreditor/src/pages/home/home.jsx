import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Divider,
  Grid,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { requestUserDetails } from "../account-manager/utils/account-manager-api.js";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";
import { ArrowForward } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import RoleTypes from "../account-manager/utils/enums/role-types.js";
import LRSLogo from "../../assets/svg/learning_locker.svg";
import PrototypeImage from "../../assets/svg/prototype.svg";

const Home = () => {
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
          <Typography>Home</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
        <Grid item xs={12}>
          <Grid container spacing={3} sx={{ p: 2 }}>
            <Grid item xs={12}>
              <Typography variant="h4">
                {state.user.name ? `Hello, ${state.user.name}` : <Skeleton />}
              </Typography>
            </Grid>
            {/*<Grid item xs={12} md={4}>*/}
            {/*  <Paper variant="outlined" sx={{ p: 4 }}>*/}
            {/*    <Grid container alignItems="center">*/}
            {/*      <Grid item xs={6}>*/}
            {/*        <Grid container>*/}
            {/*          <Grid item xs={12}>*/}
            {/*            <Typography gutterBottom>*/}
            {/*              #Learning Record Stores*/}
            {/*            </Typography>*/}
            {/*          </Grid>*/}
            {/*          <Grid item xs={12}>*/}
            {/*            <Typography variant="h1">1</Typography>*/}
            {/*          </Grid>*/}
            {/*        </Grid>*/}
            {/*      </Grid>*/}
            {/*      <Grid*/}
            {/*        item*/}
            {/*        xs={6}*/}
            {/*        sx={{*/}
            {/*          height: 120,*/}
            {/*        }}*/}
            {/*        component="img"*/}
            {/*        src={LRSLogo}*/}
            {/*        alt="LRS Logo"*/}
            {/*      />*/}
            {/*    </Grid>*/}
            {/*    <Grid container>*/}
            {/*      <Grid item xs={12}>*/}
            {/*        <Button*/}
            {/*          endIcon={<ArrowForward />}*/}
            {/*          onClick={() => navigate("/manage-lrs")}*/}
            {/*        >*/}
            {/*          Manage LRS*/}
            {/*        </Button>*/}
            {/*      </Grid>*/}
            {/*    </Grid>*/}
            {/*  </Paper>*/}
            {/*</Grid>*/}
            <Grid item xs={12} sm={6} md={3}>
              <Grid
                container
                justifyContent="center"
                component={Paper}
                variant="outlined"
                sx={{
                  p: 2,
                  cursor: "pointer",
                  "&:hover": { backgroundColor: "#f5f5f5" },
                }}
                onClick={() => navigate("/isc/creator")}
              >
                <Grid
                  item
                  xs={12}
                  sx={{ height: 200, mb: 3 }}
                  component="img"
                  src={PrototypeImage}
                  alt="LRS Logo"
                />
                <Grid item>
                  <Typography align="center">
                    Create an Indicator Specification Card
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
            {roles.includes(RoleTypes.user) ? (
              <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 4 }}>
                  <Grid container alignItems="center">
                    <Grid item xs={6}>
                      <Grid container>
                        <Grid item xs={12}>
                          <Typography gutterBottom>
                            #Indicators created
                          </Typography>
                        </Grid>
                        <Grid item xs={12}>
                          <Typography variant="h1">5</Typography>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid
                      item
                      xs={6}
                      sx={{
                        height: 130,
                      }}
                      component="img"
                      src={PrototypeImage}
                      alt="LRS Logo"
                    />
                  </Grid>
                  <Grid container>
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

export default Home;
