import { useState, useContext } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestCreateISC, requestUpdateISC } from "../utils/finalize-api.js";
import { useSnackbar } from "notistack";
import { useNavigate, useParams } from "react-router-dom";

const NameDialog = ({ open, toggleOpen }) => {
  const params = useParams();
  const { api, SESSION_ISC } = useContext(AuthContext);
  const { id, requirements, dataset, visRef, lockedStep } =
    useContext(ISCContext);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: false,
  });

  const handleCloseDialog = () => {
    toggleOpen();
  };

  const handleSaveIndicator = async () => {
    const callISC = async (isUpdate) => {
      try {
        if (isUpdate) {
          return await requestUpdateISC(
            api,
            id,
            requirements,
            dataset,
            visRef,
            lockedStep
          );
        } else {
          return await requestCreateISC(
            api,
            requirements,
            dataset,
            visRef,
            lockedStep
          );
        }
      } catch (error) {
        enqueueSnackbar(error.message, { variant: "error" });
        throw error;
      }
    };

    setState((prevState) => ({
      ...prevState,
      loading: true,
    }));

    try {
      const response = await callISC(Boolean(id));

      enqueueSnackbar(response.message, { variant: "success" });
      toggleOpen();
      sessionStorage.removeItem(SESSION_ISC);
      navigate("/isc");
    } catch (error) {
      console.error(error);
    } finally {
      setState((prevState) => ({
        ...prevState,
        loading: false,
      }));
    }
  };

  return (
    <>
      <Dialog open={open} fullWidth maxWidth="sm">
        <DialogTitle>
          {params.id ? "Update Indicator?" : "Save Indicator?"}
        </DialogTitle>
        <DialogContent>
          <Typography>
            You've completed all the steps. Saving now will{" "}
            {params.id ? "update" : "finalize"} the indicator and make it
            available for use from My ISCs.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button fullWidth color="primary" onClick={handleCloseDialog}>
            Continue editing
          </Button>
          <Button
            loading={state.loading}
            loadingPosition="start"
            loadingIndicator="Please wait..."
            fullWidth
            disabled={requirements.indicatorName === ""}
            onClick={handleSaveIndicator}
            variant="contained"
          >
            {!state.loading && "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NameDialog;
