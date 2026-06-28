import { useContext, useEffect, useState } from "react";
import { Button, Skeleton, Container, Stack } from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";
import AddLrsConsumer from "./components/add-lrs-consumer";
import { useSnackbar } from "notistack";
import { requestUserDetails } from "./utils/account-manager-api.js";
import ManageLrsConsumerList from "./components/manage-lrs-consumer-list";
import ManageLrsProviderList from "./components/manage-lrs-provider-list";
import RoleTypes from "./utils/enums/role-types.js";
import AddLrsProvider from "./components/add-lrs-provider";
import PageHeader from "../../common/components/page-header/page-header";
import EmptyState from "../../common/components/empty-state/empty-state";

const ManageLrs = () => {
  const {
    api,
    refreshAccessToken,
    user: { roles },
  } = useContext(AuthContext);
  const [state, setState] = useState({
    loading: false,
    error: false,
    user: {
      name: "",
      email: "",
      lrsConsumerList: [],
      lrsProviderList: [],
    },
    addLRSConsumerDialog: { open: false, lrsConsumerUpdated: true },
    deleteLrsConsumerDialog: { open: false, lrsProviderId: "" },
    addLRSProviderDialog: { open: false, lrsProviderUpdated: true },
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
    setState((p) => ({ ...p, loading: true, error: false }));
    try {
      const userDetails = await requestUserDetails(api);
      setState((p) => ({
        ...p,
        user: { ...p.user, ...userDetails },
        loading: false,
        error: false,
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
      }));

      await refreshTokenIfUserRoleChange(userDetails.lrsConsumerList);
    } catch (error) {
      console.error("Error", error);
      // Surface a graceful, non-blocking error state instead of leaving the
      // page stuck on the loading skeleton.
      setState((p) => ({ ...p, loading: false, error: true }));
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

  const isProvider = roles.includes(RoleTypes["data provider"]);
  const handleAddLrs = isProvider
    ? handleToggleAddLrsProvider
    : handleToggleAddLrsConsumer;

  const hasConsumerLrs =
    state.user.lrsConsumerList.length > 0 &&
    (roles.includes(RoleTypes.user) ||
      roles.includes(RoleTypes.userWithoutLRS));
  const hasProviderLrs = state.user.lrsProviderList.length > 0 && isProvider;

  const renderContent = () => {
    if (state.error) {
      return (
        <EmptyState
          icon={ErrorOutlineIcon}
          tone="error"
          title="Couldn't load your Learning Record Stores"
          description="Something went wrong while loading your LRS list. Please try again."
          action={
            <Button variant="outlined" onClick={loadLRSData}>
              Retry
            </Button>
          }
        />
      );
    }
    if (state.loading) {
      return Array.from({ length: 3 }).map((_, index) => (
        <Skeleton
          key={index}
          variant="rounded"
          height={96}
          sx={{ borderRadius: 2 }}
        />
      ));
    }
    if (hasConsumerLrs) {
      return <ManageLrsConsumerList state={state} setState={setState} />;
    }
    if (hasProviderLrs) {
      return <ManageLrsProviderList state={state} setState={setState} />;
    }
    return (
      <EmptyState
        icon={StorageIcon}
        title="No Learning Record Store yet"
        description="Connect a Learning Record Store to start working with your learning data."
        action={
          <Button variant="contained" disableElevation onClick={handleAddLrs}>
            Add New LRS
          </Button>
        }
      />
    );
  };

  return (
    <>
      <PageHeader
        title="Manage LRS"
        subtitle="Manage the Learning Record Stores connected to your account."
        breadcrumbs={[{ label: "Home", to: "/" }]}
        actions={
          <Button
            color="primary"
            variant="contained"
            disableElevation
            onClick={handleAddLrs}
          >
            Add New LRS
          </Button>
        }
      />
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
      <Container maxWidth="lg" sx={{ pt: 2 }} disableGutters>
        <Stack gap={2}>{renderContent()}</Stack>
      </Container>
    </>
  );
};

export default ManageLrs;
