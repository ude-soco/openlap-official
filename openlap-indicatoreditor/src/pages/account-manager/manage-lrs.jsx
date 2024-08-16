import React, { useContext, useEffect, useState } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager.jsx";
import { fetchUserData } from "./user-api.js";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Alert } from "@mui/lab";
import AddLrsConsumer from "./components/add-lrs-consumer.jsx";
import { useSnackbar } from "notistack";
import DeleteDialog from "../../common/components/delete-dialog/delete-dialog.jsx";
import { requestDeleteLRSConsumer } from "./utils/account-manager-api.js";

const ManageLrs = () => {
  const { api } = useContext(AuthContext);
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
      lrsConsumerId: "",
    },
  });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const loadData = async () => {
      try {
        return await fetchUserData(api);
      } catch (error) {
        console.error("Failed to load user data", error);
      }
    };
    if (state.addLRSConsumerDialog.lrsConsumerUpdated) {
      console.log("Effect", state.user);
      setState((prevState) => ({
        ...prevState,
        loading: true,
      }));
      loadData().then((response) => {
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
        }));
      });
    }
  }, [state.addLRSConsumerDialog.lrsConsumerUpdated === true]);

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

  const handleToggleDelete = (lrsConsumerId = "") => {
    setState((prevState) => ({
      ...prevState,
      deleteLrsConsumerDialog: {
        ...prevState.deleteLrsConsumerDialog,
        open: !prevState.deleteLrsConsumerDialog.open,
        lrsConsumerId: lrsConsumerId,
      },
    }));
  };

  const handleDeleteLrs = async () => {
    try {
      await requestDeleteLRSConsumer(
        api,
        state.deleteLrsConsumerDialog.lrsConsumerId,
      ).then((response) => {
        setState((prevState) => ({
          ...prevState,
          addLRSConsumerDialog: {
            ...prevState.addLRSConsumerDialog,
            lrsConsumerUpdated: true,
          },
        }));
      });
    } catch (error) {
      console.log(error);
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
                            onClick={handleToggleAddLrsConsumer}
                          >
                            New
                          </Button>
                          {state.addLRSConsumerDialog.open && (
                            <AddLrsConsumer
                              addLrsConsumer={state.addLRSConsumerDialog}
                              toggleOpen={handleToggleAddLrsConsumer}
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
                    ) : state.user.lrsConsumerList.length > 0 ? (
                      state.user.lrsConsumerList?.map((lrs) => (
                        <Grid item xs={12} key={lrs.id}>
                          <Accordion>
                            <AccordionSummary
                              expandIcon={<ExpandMoreIcon />}
                              aria-controls="panel1-content"
                              id="panel1-header"
                            >
                              {lrs.lrsTitle}
                            </AccordionSummary>
                            <AccordionDetails>
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <Grid
                                    container
                                    spacing={1}
                                    alignItems="center"
                                  >
                                    <Grid item>
                                      <Typography>LRS:</Typography>
                                    </Grid>
                                    <Grid item>
                                      <Chip label={lrs.lrsTitle} />
                                    </Grid>
                                  </Grid>
                                </Grid>
                                <Grid item xs={12}>
                                  <Grid
                                    container
                                    spacing={1}
                                    alignItems="center"
                                  >
                                    <Grid item>
                                      <Typography>
                                        Unique Identifier:
                                      </Typography>
                                    </Grid>
                                    <Grid item>
                                      <Chip label={lrs.uniqueIdentifier} />
                                    </Grid>
                                  </Grid>
                                </Grid>
                              </Grid>
                            </AccordionDetails>
                            <AccordionActions>
                              <Button
                                color="error"
                                onClick={() => handleToggleDelete(lrs.id)}
                              >
                                Delete
                              </Button>
                              <DeleteDialog
                                open={state.deleteLrsConsumerDialog.open}
                                toggleOpen={handleToggleDelete}
                                message="This will delete the LRS permanently. You cannot undo this action."
                                handleDelete={handleDeleteLrs}
                              />
                            </AccordionActions>
                          </Accordion>
                        </Grid>
                      ))
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
