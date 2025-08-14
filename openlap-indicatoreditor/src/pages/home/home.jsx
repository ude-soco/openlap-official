import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Divider,
  LinearProgress,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { requestUserDetails } from "../account-manager/utils/account-manager-api.js";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";

import { useNavigate } from "react-router-dom";
import RoleTypes from "../account-manager/utils/enums/role-types.js";
import homeData from "./utils/home-data.js";

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
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await requestUserDetails(api);
      setState((p) => ({
        ...p,
        user: { ...p.user, ...response },
        loading: false,
      }));
    } catch (error) {
      console.error("Failed to load user data", error);
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        <Typography sx={{ color: "text.primary" }}>Home</Typography>
        <Grid size={{ xs: 12 }} sx={{ mb: 2 }}>
          <Divider />
        </Grid>

        {state.loading && (
          <Grid size={{ xs: 12 }}>
            <Typography gutterBottom>Loading</Typography>
            <LinearProgress />
          </Grid>
        )}
        {!state.loading && (
          <>
            <Grid size={{ xs: 12 }}>
              <Typography variant="h4">Hello, {state.user.name}</Typography>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Grid container spacing={2}>
                {homeData.map((home) => {
                  const disabled = roles.some((role) =>
                    home.disabledRoles.includes(role)
                  );
                  if (!disabled) {
                    return (
                      <Grid
                        key={home.id}
                        size={{ xs: 12, md: 4 }}
                        sx={{ display: "flex" }}
                      >
                        <Card
                          variant="outlined"
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                          }}
                        >
                          <CardMedia sx={{ height: 250 }} image={home.image} />
                          <CardContent sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" component="div">
                              {home.label}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ color: "text.secondary" }}
                            >
                              {home.description}
                            </Typography>
                          </CardContent>
                          <CardActions>
                            {home.buttons.map((button) => (
                              <Button
                                key={button.id}
                                variant={button.variant}
                                startIcon={
                                  button.icon
                                    ? React.createElement(button.icon)
                                    : null
                                }
                                onClick={() => navigate(button.link)}
                              >
                                {button.label}
                              </Button>
                            ))}
                          </CardActions>
                        </Card>
                      </Grid>
                    );
                  }
                  return undefined;
                })}
              </Grid>
            </Grid>
          </>
        )}
      </Grid>
    </>
  );
}
