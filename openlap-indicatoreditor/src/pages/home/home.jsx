import React, { useContext, useEffect, useState } from "react";
import { Paper, Skeleton, Typography } from "@mui/material";
import { requestUserDetails } from "../account-manager/utils/account-manager-api.js";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";

import { useNavigate } from "react-router-dom";
import RoleTypes from "../account-manager/utils/enums/role-types.js";
import LRSLogo from "../../assets/svg/learning_locker.svg";
import PrototypeImage from "../../assets/svg/prototype.svg";
import Grid from "@mui/material/Grid2";

export default function Home() {
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
        const response = await requestUserDetails(api);
        setState((prevState) => ({
          ...prevState,
          user: {
            ...prevState.user,
            ...response,
          },
          loading: false,
        }));
      } catch (error) {
        console.error("Failed to load user data", error);
      }
    };
    loadData();
  }, []);

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={12}>
          <Typography variant="h4">
            {state.loading ? (
              <Skeleton width={300} />
            ) : (
              `Hello, ${state.user.name}`
            )}
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          {state.loading ? (
            <Skeleton width={300} height={100} />
          ) : (
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
                size={{ xs: 12 }}
                sx={{ height: 200, mb: 3 }}
                component="img"
                src={PrototypeImage}
                alt="LRS Logo"
              />
              <Grid size={{ xs: 12 }}>
                <Typography align="center">
                  Create an <b>Indicator Specification Card</b>
                </Typography>
              </Grid>
            </Grid>
          )}
        </Grid>

        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          {state.loading ? (
            <Skeleton width={300} height={100} />
          ) : (
            <>
              {roles.includes(RoleTypes.user) && (
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
                  onClick={() => navigate("/indicator/editor")}
                >
                  <Grid
                    size={{ xs: 12 }}
                    sx={{ height: 200, mb: 3 }}
                    component="img"
                    src={PrototypeImage}
                    alt="LRS Logo"
                  />
                  <Grid size={{ xs: 12 }}>
                    <Typography align="center">
                    Create an <b>Indicator</b>
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </>
          )}
        </Grid>
      </Grid>
    </>
  );
}
