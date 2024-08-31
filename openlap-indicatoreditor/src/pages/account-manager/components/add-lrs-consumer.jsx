import React, { useContext, useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { Alert } from "@mui/material";
import { useSnackbar } from "notistack";
import {
  requestAvailableLrsInOpenLAP,
  requestLrsConsumerValidation,
} from "../utils/account-manager-api.js";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager.jsx";

const AddLrsConsumer = ({ addLrsConsumer, toggleOpen }) => {
  const { api } = useContext(AuthContext);
  const [state, setState] = useState({
    lrsId: "",
    uniqueIdentifier: "",
    loadingConsumerLrs: false,
    allAvailableLrs: [],
    validation: {
      status: undefined,
      message: "",
    },
  });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const loadLRSData = async (api) => {
      try {
        return await requestAvailableLrsInOpenLAP(api);
      } catch (error) {
        throw error;
      }
    };
    setState((prevState) => ({
      ...prevState,
      loadingConsumerLrs: true,
    }));
    loadLRSData(api)
      .then((response) => {
        setState((prevState) => ({
          ...prevState,
          allAvailableLrs: response,
          loadingConsumerLrs: false,
        }));
      })
      .catch((error) => {
        setState((prevState) => ({
          ...prevState,
          loadingConsumerLrs: false,
        }));
        enqueueSnackbar(error.response.message, { variant: "error" });
      });
  }, [addLrsConsumer.open]);

  const handleLrsConsumerRequest = (event) => {
    const { name, value } = event.target;
    setState((prevState) => ({
      ...prevState,
      [name]: value,
      validation: {
        ...prevState.validation,
        status: undefined,
        message: "",
      },
    }));
  };

  const handleConfirm = async () => {
    setState((prevState) => ({
      ...prevState,
      validation: {
        ...prevState.validation,
        loading: true,
      },
    }));

    await requestLrsConsumerValidation(api, state.lrsId, state.uniqueIdentifier)
      .then((response) => {
        setState((prevState) => ({
          ...prevState,
          validation: {
            ...prevState.validation,
            loading: false,
            status: response.data,
          },
        }));
        toggleOpen(true, response.message);
      })
      .catch((error) => {
        if (error.response.status === 404) {
          setState((prevState) => ({
            ...prevState,
            validation: {
              ...prevState.validation,
              loading: false,
              status: false,
              message: error.response.data.message,
            },
          }));
        }
      });
  };

  return (
    <>
      <Dialog
        open={addLrsConsumer.open}
        // onClose={toggleOpen}
        maxWidth="sm"
        fullWidth
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Add new LRS</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            {state.loadingConsumerLrs ? (
              <Grid item xs={12}>
                <Skeleton variant="rectangular" height={200} width="100%" />
              </Grid>
            ) : state.allAvailableLrs.length > 0 ? (
              <>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel id="lrs-select-label">Available LRS</InputLabel>
                    <Select
                      name="lrsId"
                      value={state.lrsId}
                      label="LRS ID"
                      onChange={handleLrsConsumerRequest}
                    >
                      {state.allAvailableLrs.map((lrs) => {
                        return (
                          <MenuItem key={lrs.lrsId} value={lrs.lrsId}>
                            {lrs.title}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="uniqueIdentifier"
                    label="Unique Identifier"
                    placeholder="Unique Identifier"
                    onChange={handleLrsConsumerRequest}
                  />
                </Grid>
                {state.validation.status !== undefined &&
                  !state.validation.status && (
                    <Grid item xs={12}>
                      <Alert severity="error">{state.validation.message}</Alert>
                    </Grid>
                  )}
              </>
            ) : (
              <Typography>No LRS available</Typography>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Grid container spacing={1} justifyContent="space-between">
            <Grid item xs>
              <Button fullWidth onClick={toggleOpen}>
                Cancel
              </Button>
            </Grid>
            <Grid item xs>
              <LoadingButton
                loading={state.validation.loading}
                loadingIndicator="Adding…"
                fullWidth
                autoFocus
                onClick={handleConfirm}
                variant="contained"
                disabled={
                  !Boolean(state.lrsId.length) ||
                  !Boolean(state.uniqueIdentifier)
                }
              >
                Add LRS
              </LoadingButton>
            </Grid>
          </Grid>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddLrsConsumer;
