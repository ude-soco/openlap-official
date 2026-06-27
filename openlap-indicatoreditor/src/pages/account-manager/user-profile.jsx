import { useState } from "react";
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
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { useUserDetails } from "./hooks/use-user-details";
import PageHeader from "../../common/components/page-header/page-header";

const UserProfile = () => {
  const { user } = useUserDetails();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });

  const togglePage = (pageNumber) => {
    setPage(pageNumber);
  };

  const handleFormFields = (event) => {
    const { name, value } = event.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  return (
    <>
      <PageHeader title="Account Settings" breadcrumbs={[{ label: "Home", to: "/" }]} />
      <Grid container justifyContent="center" sx={{ pt: 3 }}>
        <Grid size={{ xs: 12, sm: 8 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Grid container direction="column">
              <Paper variant="outlined" component="form">
                <List component="div" disablePadding>
                  <ListItemButton
                    onClick={() => togglePage(1)}
                    selected={page === 1}
                  >
                    <ListItemText primary="Account" />
                  </ListItemButton>
                </List>
                <Divider />
                <List component="div" disablePadding>
                  <ListItemButton
                    onClick={() => togglePage(2)}
                    selected={page === 2}
                  >
                    <ListItemText primary="Change Password" />
                  </ListItemButton>
                </List>
              </Paper>
            </Grid>

            {page === 1 && (
              <Paper variant="outlined" sx={{ p: 3, width: "100%" }}>
                <Grid container direction="column" spacing={2}>
                  <Typography variant="h5">
                    {user.name ? `Hello, ${user.name}` : <Skeleton />}
                  </Typography>
                  <Grid container spacing={1} alignItems="center">
                    <Typography>Email:</Typography>
                    <Chip label={user.email} />
                    <IconButton size="small" aria-label="Edit email address">
                      <Edit />
                    </IconButton>
                  </Grid>
                </Grid>
              </Paper>
            )}
            {page === 2 && (
              <Paper variant="outlined" sx={{ p: 3, width: "100%" }}>
                <Stack spacing={2}>
                  <Typography>Change password</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    <TextField
                      fullWidth
                      name="password"
                      label="Password"
                      placeholder="Password"
                      type="password"
                      value={form.password}
                      onChange={handleFormFields}
                    />
                    <TextField
                      fullWidth
                      name="confirmPassword"
                      label="Confirm Password"
                      placeholder="Confirm password"
                      type="password"
                      value={form.confirmPassword}
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
    </>
  );
};

export default UserProfile;
