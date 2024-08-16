import React, { useContext, useState } from "react";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";
import { Divider, Grid, Paper, TextField, Typography } from "@mui/material";

const UserProfile = () => {
  const { logout, api, user } = useContext(AuthContext);

  const [state, setState] = useState({
    userData: {
      name: "",
      email: "",
      lrsConsumerList: [],
      lrsProviderList: [],
      password: "",
      confirmPassword: "",
    },
    lrsConsumerRequest: {
      lrsId: "",
      uniqueIdentifier: "",
    },
    lrsProviderRequest: {
      title: "",
      uniqueIdentifier: "",
    },
    loadingData: false,
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   const loadData = async () => {
  //     try {
  //       const userData = await fetchUserData(api);
  //       setData(userData);
  //     } catch (error) {
  //       console.error("Failed to load user data", error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };
  //   loadData();
  // }, [api]);

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
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 3 }}>
                <Grid container justifyContent="center">
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography>Update Account</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField fullWidth />
                    </Grid>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default UserProfile;
