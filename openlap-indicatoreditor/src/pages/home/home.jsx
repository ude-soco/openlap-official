import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardMedia,
  Divider,
  LinearProgress,
  Grid,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { requestUserDetails } from "../account-manager/utils/account-manager-api";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { useNavigate } from "react-router-dom";
import homeData from "./utils/home-data";

export default function Home() {
  const {
    api,
    user: { roles },
  } = useContext(AuthContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("lg"));
  const [state, setState] = useState({
    loading: false,
    user: { name: "", lrsProviderList: [], lrsConsumerList: [] },
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setState((p) => ({ ...p, loading: true }));
    try {
      const userData = await requestUserDetails(api);
      setState((p) => ({ ...p, user: { ...p.user, ...userData } }));
    } catch (error) {
      console.error("Failed to load user data", error);
    } finally {
      setState((p) => ({ ...p, loading: false }));
    }
  };

  return (
    <>
      <Stack gap={2}>
        <Typography color="textPrimary">Home</Typography>
        <Divider />

        {state.loading && (
          <>
            <Typography gutterBottom>Loading</Typography>
            <LinearProgress />
          </>
        )}
        {!state.loading && (
          <>
            <Typography variant="h4" gutterBottom>
              Hello, {state.user.name}
            </Typography>
            <Grid container spacing={2}>
              {homeData.map((home) => {
                const disabled = roles.some((role) =>
                  home.disabledRoles.includes(role)
                );
                if (!disabled) {
                  return (
                    <Grid
                      key={home.id}
                      size={{ xs: 12, sm: 6, lg: 4 }}
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
                        <CardMedia sx={{ height: 350 }} image={home.image} />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" component="div">
                            {home.label}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {home.description}
                          </Typography>
                        </CardContent>
                        <Stack
                          direction={isSmallScreen ? "column" : "row"}
                          sx={{ p: 1 }}
                          spacing={1}
                        >
                          {home.buttons.map((button) => (
                            <Button
                              disableElevation
                              size="small"
                              key={button.id}
                              fullWidth
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
                        </Stack>
                      </Card>
                    </Grid>
                  );
                }
                return undefined;
              })}
            </Grid>
          </>
        )}
      </Stack>
    </>
  );
}
