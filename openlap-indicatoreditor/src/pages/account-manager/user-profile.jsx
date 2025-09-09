import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import {
  Breadcrumbs,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Link,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { requestUserDetails } from "./utils/account-manager-api.js";
import { Edit } from "@mui/icons-material";

const UserProfile = () => {
  const { api } = useContext(AuthContext);

  const [state, setState] = useState({
    loading: false,
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
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setState((p) => ({ ...p, loading: true }));
    try {
      const userData = await requestUserDetails(api);
      setState((p) => ({ ...p, user: { ...p.user, ...userData } }));
    } catch (error) {
      console.error("Error loading user data", error);
    } finally {
      setState((p) => ({ ...p, loading: false }));
    }
  };

  const togglePage = (pageNumber) => {
    setState((p) => ({ ...p, page: pageNumber }));
  };

  const handleFormFields = (event) => {
    const { name, value } = event.target;
    setState((p) => ({ ...p, user: { ...p.user, [name]: value } }));
  };

  return (
    <>
      <Grid container direction="column" spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography sx={{ color: "text.primary" }}>
            Account Settings
          </Typography>
        </Breadcrumbs>

        <Divider />
        <Grid container justifyContent="center" sx={{ pt: 3 }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <Stack direction="row" spacing={2}>
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

              {state.page === 1 && (
                <Paper variant="outlined" sx={{ p: 3, width: "100%" }}>
                  <Grid container direction="column" spacing={2}>
                    <Typography variant="h5">
                      {state.user.name ? (
                        `Hello, ${state.user.name}`
                      ) : (
                        <Skeleton />
                      )}
                    </Typography>
                    <Grid container spacing={1} alignItems="center">
                      <Typography>Email:</Typography>
                      <Chip label={state.user.email} />
                      <IconButton size="small">
                        <Edit />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Paper>
              )}
              {state.page === 2 && (
                <Paper variant="outlined" sx={{ p: 3, width: "100%" }}>
                  <Stack spacing={2}>
                    <Typography>Change password</Typography>
                    <Stack direction="row" spacing={2}>
                      <TextField
                        fullWidth
                        name="password"
                        label="Password"
                        placeholder="Password"
                        type="password"
                        onChange={handleFormFields}
                      />
                      <TextField
                        fullWidth
                        name="confirmPassword"
                        label="Confirm Password"
                        placeholder="Confirm password"
                        type="password"
                        onChange={handleFormFields}
                      />
                    </Stack>

                    <Button variant="contained" fullWidth disabled>
                      Update
                    </Button>
                  </Stack>
                </Paper>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default UserProfile;
