import { useState, useContext } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import { ISCContext } from "../../../isc-context.js";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { requestCreateISC, requestUpdateISC } from "../utils/finalize-api.js";
import { getFinalizeReadiness } from "../utils/finalize-readiness.js";
import { useSnackbar } from "notistack";
import { useNavigate, useParams } from "react-router-dom";

const SummaryLine = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" gap={2}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={600} sx={{ textAlign: "right" }}>
      {value}
    </Typography>
  </Stack>
);
SummaryLine.propTypes = { label: PropTypes.node, value: PropTypes.node };

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

  const isUpdate = Boolean(params.id);
  const { ready, issues, summary } = getFinalizeReadiness({
    requirements,
    dataset,
    visRef,
  });

  const handleCloseDialog = () => {
    toggleOpen();
  };

  const handleSaveIndicator = async () => {
    const callISC = async (isUpdateRequest) => {
      try {
        if (isUpdateRequest) {
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
      await callISC(Boolean(id));

      enqueueSnackbar(
        `Indicator ${
          isUpdate ? "updated" : "saved"
        } — it's now available in My ISCs.`,
        { variant: "success" }
      );
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
      <Dialog
        open={open}
        fullWidth
        maxWidth="sm"
        aria-labelledby="save-indicator-title"
        aria-describedby="save-indicator-description"
      >
        <DialogTitle id="save-indicator-title">
          {isUpdate ? "Update indicator?" : "Save indicator?"}
        </DialogTitle>
        <DialogContent>
          {ready ? (
            <DialogContentText
              id="save-indicator-description"
              component="div"
            >
              <Typography gutterBottom>
                You&apos;re about to {isUpdate ? "update" : "save"}:
              </Typography>
              <Stack gap={0.75} sx={{ mb: 1 }}>
                <SummaryLine
                  label="Indicator name"
                  value={summary.indicatorName}
                />
                <SummaryLine
                  label="Visualization"
                  value={summary.chartType}
                />
                <SummaryLine
                  label="Dataset"
                  value={`${summary.rowCount} row${
                    summary.rowCount === 1 ? "" : "s"
                  } × ${summary.columnCount} column${
                    summary.columnCount === 1 ? "" : "s"
                  }`}
                />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={2}
                >
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Stack direction="row" gap={0.5} alignItems="center">
                    <CheckCircleRoundedIcon fontSize="small" color="success" />
                    <Typography variant="body2" fontWeight={600}>
                      Ready
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </DialogContentText>
          ) : (
            <DialogContentText
              id="save-indicator-description"
              component="div"
            >
              <Typography gutterBottom>
                This indicator isn&apos;t ready to save yet:
              </Typography>
              <Stack gap={0.75} sx={{ mb: 1 }}>
                {issues.map((issue, i) => (
                  <Stack
                    key={i}
                    direction="row"
                    gap={1}
                    alignItems="flex-start"
                  >
                    <ReportProblemOutlinedIcon
                      fontSize="small"
                      color="warning"
                      sx={{ mt: "1px" }}
                    />
                    <Typography variant="body2">{issue}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Resolve these, then save your indicator.
              </Typography>
            </DialogContentText>
          )}
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
            disabled={!ready}
            onClick={handleSaveIndicator}
            variant="contained"
          >
            {!state.loading && (isUpdate ? "Update indicator" : "Save indicator")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

NameDialog.propTypes = {
  open: PropTypes.bool,
  toggleOpen: PropTypes.func,
};

export default NameDialog;
