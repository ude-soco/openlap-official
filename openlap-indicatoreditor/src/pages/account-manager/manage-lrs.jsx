import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Divider,
  Grid,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";
import { Alert } from "@mui/material";
import AddLrsConsumer from "./components/add-lrs-consumer.jsx";
import { useSnackbar } from "notistack";
import { requestUserDetails } from "./utils/account-manager-api.js";
import ManageLrsConsumerList from "./components/manage-lrs-consumer-list.jsx";
import ManageLrsProviderList from "./components/manage-lrs-provider-list.jsx";
import RoleTypes from "./utils/enums/role-types.js";
import AddLrsProvider from "./components/add-lrs-provider.jsx";

const ManageLrs = () => {
  const {
    api,
    refreshAccessToken,
    user: { roles },
  } = useContext(AuthContext);
  const [state, setState] = useState({
    loading: false,
    user: {
      name: "",
      email: "",
      lrsConsumerList: [],
      lrsProviderList: [],
    },
    addLRSConsumerDialog: {
      open: false,
      lrsConsumerUpdated: true,
    },
    deleteLrsConsumerDialog: {
      open: false,
      lrsProviderId: "",
    },
    addLRSProviderDialog: {
      open: false,
      lrsProviderUpdated: true,
    },
    deleteLrsProviderDialog: {
      open: false,
      lrsProviderId: "",
    },
  });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const loadData = async () => {
      try {
        return await requestUserDetails(api);
      } catch (error) {
        console.error("Failed to load user data", error);
      }
    };
    const refreshTokenIfUserRoleChange = async (lrsConsumerList) => {
      if (
        (roles.includes(RoleTypes.userWithoutLRS) &&
          lrsConsumerList.length > 0) ||
        (roles.includes(RoleTypes.user) && lrsConsumerList.length === 0)
      ) {
        await refreshAccessToken();
      }
    };
    if (
      state.addLRSConsumerDialog.lrsConsumerUpdated ||
      state.addLRSProviderDialog.lrsProviderUpdated
    ) {
      setState((prevState) => ({
        ...prevState,
        loading: true,
      }));
      loadData()
        .then((response) => {
          setState((prevState) => ({
            ...prevState,
            user: {
              ...prevState.user,
              ...response,
            },
            loading: false,
            addLRSConsumerDialog: {
              ...prevState.addLRSConsumerDialog,
              lrsConsumerUpdated: false,
            },
            addLRSProviderDialog: {
              ...prevState.addLRSProviderDialog,
              lrsProviderUpdated: false,
            },
            deleteLrsConsumerDialog: {
              open: false,
              lrsProviderId: "",
            },
            deleteLrsProviderDialog: {
              open: false,
              lrsProviderId: "",
            },
          }));
          return response.lrsConsumerList;
        })
        .then((lrsConsumerList) =>
          refreshTokenIfUserRoleChange(lrsConsumerList)
        );
    }
  }, [
    state.addLRSConsumerDialog.lrsConsumerUpdated === true,
    state.addLRSProviderDialog.lrsProviderUpdated === true,
  ]);

  const handleToggleAddLrsConsumer = (lrsConsumerUpdated = null, message) => {
    setState((prevState) => ({
      ...prevState,
      addLRSConsumerDialog: {
        ...prevState.addLRSConsumerDialog,
        open: !prevState.addLRSConsumerDialog.open,
        lrsConsumerUpdated: lrsConsumerUpdated !== null,
      },
    }));
    if (lrsConsumerUpdated !== null && message) {
      enqueueSnackbar(message, { variant: "success" });
    }
  };

  const handleToggleAddLrsProvider = (lrsProviderUpdated = null, message) => {
    setState((prevState) => ({
      ...prevState,
      addLRSProviderDialog: {
        ...prevState.addLRSProviderDialog,
        open: !prevState.addLRSProviderDialog.open,
        lrsProviderUpdated: lrsProviderUpdated !== null,
      },
    }));
    if (lrsProviderUpdated !== null && message) {
      enqueueSnackbar(message, { variant: "success" });
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>Manage LRS</Typography>
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
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs>
                          <Typography>Your LRSs</Typography>
                        </Grid>
                        <Grid item>
                          <Button
                            color="primary"
                            size="small"
                            variant="contained"
                            onClick={
                              roles.includes(RoleTypes["data provider"])
                                ? handleToggleAddLrsProvider
                                : handleToggleAddLrsConsumer
                            }
                          >
                            New
                          </Button>
                          {state.addLRSConsumerDialog.open && (
                            <AddLrsConsumer
                              addLrsConsumer={state.addLRSConsumerDialog}
                              toggleOpen={handleToggleAddLrsConsumer}
                            />
                          )}
                          {state.addLRSProviderDialog.open && (
                            <AddLrsProvider
                              addLrsProvider={state.addLRSProviderDialog}
                              toggleOpen={handleToggleAddLrsProvider}
                            />
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                    {state.loading ? (
                      Array.from({ length: 1 }).map((_, index) => (
                        <Grid
                          item
                          xs={12}
                          key={index}
                          sx={{ display: "flex", alignItems: "stretch" }}
                        >
                          <Skeleton
                            variant="rectangular"
                            height={60}
                            width="100%"
                          />
                        </Grid>
                      ))
                    ) : state.user.lrsConsumerList.length > 0 &&
                      (roles.includes(RoleTypes.user) ||
                        roles.includes(RoleTypes.userWithoutLRS)) ? (
                      <ManageLrsConsumerList
                        state={state}
                        setState={setState}
                      />
                    ) : state.user.lrsProviderList.length > 0 &&
                      roles.includes(RoleTypes["data provider"]) ? (
                      <ManageLrsProviderList
                        state={state}
                        setState={setState}
                      />
                    ) : (
                      <Grid item xs={12}>
                        <Alert severity="info">
                          You do not belong to any LRS yet.
                        </Alert>
                      </Grid>
                    )}
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

export default ManageLrs;
