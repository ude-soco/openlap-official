import { useContext, useEffect, useState } from "react";
import {
  Breadcrumbs,
  Button,
  Divider,
  Link,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import { Alert } from "@mui/material";
import AddLrsConsumer from "./components/add-lrs-consumer";
import { useSnackbar } from "notistack";
import { requestUserDetails } from "./utils/account-manager-api.js";
import ManageLrsConsumerList from "./components/manage-lrs-consumer-list";
import ManageLrsProviderList from "./components/manage-lrs-provider-list";
import RoleTypes from "./utils/enums/role-types.js";
import AddLrsProvider from "./components/add-lrs-provider";
import { Link as RouterLink } from "react-router-dom";

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
    addLRSConsumerDialog: { open: false, lrsConsumerUpdated: true },
    deleteLrsConsumerDialog: { open: false, lrsProviderId: "" },
    addLRSProviderDialog: { open: false, lrsProviderUpdated: true },
    deleteLrsProviderDialog: { open: false, lrsProviderId: "" },
  });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (
      state.addLRSConsumerDialog.lrsConsumerUpdated ||
      state.addLRSProviderDialog.lrsProviderUpdated
    ) {
      loadLRSData();
    }
  }, [
    state.addLRSConsumerDialog.lrsConsumerUpdated === true,
    state.addLRSProviderDialog.lrsProviderUpdated === true,
  ]);

  const loadLRSData = async () => {
    setState((p) => ({ ...p, loading: true }));
    try {
      const userDetails = await requestUserDetails(api);
      setState((p) => ({
        ...p,
        user: { ...p.user, ...userDetails },
        loading: false,
        addLRSConsumerDialog: {
          ...p.addLRSConsumerDialog,
          lrsConsumerUpdated: false,
        },
        addLRSProviderDialog: {
          ...p.addLRSProviderDialog,
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

      await refreshTokenIfUserRoleChange(userDetails.lrsConsumerList);
    } catch (error) {
      console.error("Error", error);
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

  const handleToggleAddLrsConsumer = (lrsConsumerUpdated = null, message) => {
    setState((p) => ({
      ...p,
      addLRSConsumerDialog: {
        ...p.addLRSConsumerDialog,
        open: !p.addLRSConsumerDialog.open,
        lrsConsumerUpdated: lrsConsumerUpdated !== null,
      },
    }));
    if (lrsConsumerUpdated !== null && message) {
      enqueueSnackbar(message, { variant: "success" });
    }
  };

  const handleToggleAddLrsProvider = (lrsProviderUpdated = null, message) => {
    setState((p) => ({
      ...p,
      addLRSProviderDialog: {
        ...p.addLRSProviderDialog,
        open: !p.addLRSProviderDialog.open,
        lrsProviderUpdated: lrsProviderUpdated !== null,
      },
    }));
    if (lrsProviderUpdated !== null && message) {
      enqueueSnackbar(message, { variant: "success" });
    }
  };

  return (
    <>
      <Grid container direction="column" spacing={2}>
        <Breadcrumbs>
          <Link component={RouterLink} underline="hover" color="inherit" to="/">
            Home
          </Link>
          <Typography sx={{ color: "text.primary" }}>Manage LRS</Typography>
        </Breadcrumbs>

        <Divider />

        <Grid container justifyContent="center" sx={{ pt: 3 }}>
          <Grid size={{ xs: 12, sm: 8 }}>
            <Grid container justifyContent="space-between">
              <Typography>Your LRSs</Typography>
              <Button
                color="primary"
                size="small"
                variant="contained"
                disableElevation
                onClick={
                  roles.includes(RoleTypes["data provider"])
                    ? handleToggleAddLrsProvider
                    : handleToggleAddLrsConsumer
                }
              >
                Add New LRS
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
          <Grid size={{ xs: 12, sm: 8 }}>
            {state.loading ? (
              Array.from({ length: 1 }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  height={60}
                  width="100%"
                />
              ))
            ) : state.user.lrsConsumerList.length > 0 &&
              (roles.includes(RoleTypes.user) ||
                roles.includes(RoleTypes.userWithoutLRS)) ? (
              <ManageLrsConsumerList state={state} setState={setState} />
            ) : state.user.lrsProviderList.length > 0 &&
              roles.includes(RoleTypes["data provider"]) ? (
              <ManageLrsProviderList state={state} setState={setState} />
            ) : (
              <Alert severity="info">You do not belong to any LRS yet.</Alert>
            )}
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default ManageLrs;
