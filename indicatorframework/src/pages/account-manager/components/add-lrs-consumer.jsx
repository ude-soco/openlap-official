import { useContext, useEffect, useState } from "react";
import {
  Alert,
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
import { useSnackbar } from "notistack";
import {
  requestAvailableLrsInOpenLAP,
  requestLrsConsumerValidation,
} from "../utils/account-manager-api.js";
import { AuthContext } from "../../../setup/auth-context-manager/auth-context-manager";

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
    loadLRSData();
  }, [addLrsConsumer.open]);

  const loadLRSData = async () => {
    setState((p) => ({ ...p, loadingConsumerLrs: true }));
    try {
      const availableLRS = await requestAvailableLrsInOpenLAP(api);
      setState((p) => ({ ...p, allAvailableLrs: availableLRS }));
    } catch (error) {
      enqueueSnackbar(error.response.message, { variant: "error" });
    } finally {
      setState((p) => ({ ...p, loadingConsumerLrs: false }));
    }
  };

  const handleLrsConsumerRequest = (event) => {
    const { name, value } = event.target;
    setState((p) => ({
      ...p,
      [name]: value,
      validation: {
        ...p.validation,
        status: undefined,
        message: "",
      },
    }));
  };

  const handleConfirm = async () => {
    setState((p) => ({ ...p, validation: { ...p.validation, loading: true } }));

    try {
      const validationResponse = await requestLrsConsumerValidation(
        api,
        state.lrsId,
        state.uniqueIdentifier
      );
      setState((p) => ({
        ...p,
        validation: {
          ...p.validation,
          loading: false,
          status: validationResponse.data,
        },
      }));
      toggleOpen(true, validationResponse.message);
    } catch (error) {
      if (error.response.status === 404) {
        setState((p) => ({
          ...p,
          validation: {
            ...p.validation,
            loading: false,
            status: false,
            message: error.response.data.message,
          },
        }));
      }
    }
  };

  return (
    <>
      <Dialog open={addLrsConsumer.open} maxWidth="sm" fullWidth>
        <DialogTitle>Add new LRS</DialogTitle>
        <DialogContent>
          <Grid container direction="column" spacing={2} sx={{ pt: 1 }}>
            {state.loadingConsumerLrs ? (
              <Skeleton variant="rectangular" height={200} width="100%" />
            ) : state.allAvailableLrs.length > 0 ? (
              <>
                <FormControl fullWidth>
                  <InputLabel>Available LRS</InputLabel>
                  <Select
                    name="lrsId"
                    value={state.lrsId}
                    label="Available LRS"
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
                <TextField
                  fullWidth
                  name="uniqueIdentifier"
                  label="Unique Identifier"
                  placeholder="Unique Identifier"
                  onChange={handleLrsConsumerRequest}
                />
                {state.validation.status !== undefined &&
                  !state.validation.status && (
                    <Alert severity="error">{state.validation.message}</Alert>
                  )}
              </>
            ) : (
              <Typography>No LRS available</Typography>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button fullWidth onClick={toggleOpen}>
            Cancel
          </Button>
          <Button
            loading={state.validation.loading}
            loadingPosition="start"
            loadingIndicator="Adding LRS. Please wait…"
            fullWidth
            autoFocus
            onClick={handleConfirm}
            variant="contained"
            disabled={
              !Boolean(state.lrsId.length) || !Boolean(state.uniqueIdentifier)
            }
          >
            {!state.validation.loading && "Add LRS"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AddLrsConsumer;
