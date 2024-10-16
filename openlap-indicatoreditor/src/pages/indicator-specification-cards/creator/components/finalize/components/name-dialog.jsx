import React, { useState, useContext } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from "@mui/material";
import LoadingButton from "@mui/lab/LoadingButton";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestCreateISC } from "../utils/finalize-api.js";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";

const NameDialog = ({ open, toggleOpen }) => {
  const { api } = useContext(AuthContext);
  const { requirements, dataset, visRef, lockedStep } = useContext(ISCContext);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [state, setState] = useState({
    indicatorName: "",
    loading: false,
  });

  const handleChangeName = (event) => {
    const { name, value } = event.target;
    setState((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleCloseDialog = () => {
    toggleOpen();
  };

  const handleSaveIndicator = () => {
    const createISC = async (
      api,
      requirements,
      dataset,
      visRef,
      lockedStep,
    ) => {
      try {
        return await requestCreateISC(
          api,
          requirements,
          dataset,
          visRef,
          lockedStep,
        );
      } catch (error) {
        enqueueSnackbar(error.message, { variant: "error" });
      }
    };
    setState((prevState) => ({
      prevState,
      loading: true,
    }));
    let newRequirements = {
      ...requirements,
      indicatorName: state.indicatorName,
    };
    createISC(api, newRequirements, dataset, visRef, lockedStep)
      .then((response) => {
        enqueueSnackbar(response.message, { variant: "success" });
        toggleOpen();
        sessionStorage.removeItem("session_isc");
        navigate("/isc");
        setState((prevState) => ({
          prevState,
          loading: false,
        }));
      })
      .catch((error) => {
        setState((prevState) => ({
          prevState,
          loading: false,
        }));
        console.error(error);
      });
  };

  return (
    <>
      <Dialog open={open} fullWidth maxWidth="md">
        <DialogTitle>Provide a name</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 2 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                fullWidth
                name="indicatorName"
                label="Indicator name"
                value={state.name}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={(event) => handleChangeName(event)}
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button fullWidth color="primary" onClick={handleCloseDialog}>
            Cancel
          </Button>
          <LoadingButton
            loading={state.loading}
            loadingPosition="start"
            fullWidth
            disabled={state.name === ""}
            onClick={handleSaveIndicator}
            variant="contained"
          >
            Save
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NameDialog;
