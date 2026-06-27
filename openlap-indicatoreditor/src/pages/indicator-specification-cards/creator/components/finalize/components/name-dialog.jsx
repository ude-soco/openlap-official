import { useEffect, useState, useContext } from "react";
import PropTypes from "prop-types";
import {
  Button,
  CircularProgress,
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
import { publishDraft, updateDraft } from "../../../utils/isc-draft-api.js";
import { getFinalizeReadiness } from "../utils/finalize-readiness.js";
import { getIscChangeSummary } from "../../../utils/isc-change-summary.js";
import { requestISCDetails } from "../../../../dashboard/utils/dashboard-api.js";
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
  const { id, requirements, dataset, visRef, lockedStep, draftMeta } =
    useContext(ISCContext);
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: false,
  });

  const isEditDraft = draftMeta?.mode === "EDIT_DRAFT";
  const isUpdate = Boolean(params.id) || isEditDraft;

  // Change review for edit drafts: load the saved source and diff it against the
  // current draft so the user sees what will change before publishing.
  const [compare, setCompare] = useState({
    loading: false,
    error: false,
    summary: null,
  });

  useEffect(() => {
    if (!open || !isEditDraft || !draftMeta?.sourceId) {
      setCompare({ loading: false, error: false, summary: null });
      return;
    }
    let active = true;
    setCompare({ loading: true, error: false, summary: null });
    (async () => {
      try {
        const source = await requestISCDetails(api, draftMeta.sourceId);
        const savedDomain = {
          requirements: JSON.parse(source.requirements),
          dataset: JSON.parse(source.dataset),
          visRef: JSON.parse(source.visRef),
          lockedStep: JSON.parse(source.lockedStep),
        };
        const summary = getIscChangeSummary(savedDomain, {
          requirements,
          dataset,
          visRef,
          lockedStep,
        });
        if (active) setCompare({ loading: false, error: false, summary });
      } catch (error) {
        console.warn("Could not load saved version for comparison", error);
        if (active) setCompare({ loading: false, error: true, summary: null });
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEditDraft, draftMeta?.sourceId]);

  // Block publishing an edit draft that has no detected changes (comparison
  // failures do NOT block — the review is advisory).
  const noChanges =
    isEditDraft && compare.summary && !compare.summary.hasChanges;
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
      if (draftMeta?.draftId) {
        // Backend draft → flush the latest state, then publish (new → SAVED,
        // edit → merge into source). The database is the source of truth.
        const domain = { requirements, dataset, visRef, lockedStep };
        try {
          await updateDraft(api, draftMeta.draftId, domain);
          await publishDraft(api, draftMeta.draftId);
        } catch (error) {
          enqueueSnackbar(error.message, { variant: "error" });
          throw error;
        }
      } else {
        // Legacy fallback: session-only draft (no backend draftId). Preserve the
        // previous create/update behavior keyed on the restored id.
        await callISC(Boolean(id));
      }

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
            isEditDraft ? (
              <DialogContentText id="save-indicator-description" component="div">
                <Typography gutterBottom>
                  Review the changes before updating the saved indicator.
                </Typography>
                {compare.loading && (
                  <Stack direction="row" gap={1} alignItems="center" sx={{ my: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2">
                      Comparing with the saved version…
                    </Typography>
                  </Stack>
                )}
                {!compare.loading && compare.error && (
                  <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
                    Could not load the published version for comparison. You can
                    still update.
                  </Typography>
                )}
                {!compare.loading && !compare.error && noChanges && (
                  <Stack gap={0.5} sx={{ my: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      No changes detected.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This draft is identical to the saved indicator.
                    </Typography>
                  </Stack>
                )}
                {!compare.loading &&
                  !compare.error &&
                  compare.summary &&
                  compare.summary.hasChanges && (
                    <Stack gap={1.5} sx={{ mt: 1 }}>
                      <Typography variant="subtitle2" component="h4">
                        Changes since the saved version
                      </Typography>
                      {compare.summary.groups.map((group) => (
                        <Stack key={group.title} gap={0.25}>
                          <Typography
                            variant="overline"
                            color="text.secondary"
                            component="h5"
                          >
                            {group.title}
                          </Typography>
                          {group.changes.map((change, i) => (
                            <Typography key={i} variant="body2">
                              • {change}
                            </Typography>
                          ))}
                        </Stack>
                      ))}
                    </Stack>
                  )}
              </DialogContentText>
            ) : (
              <DialogContentText id="save-indicator-description" component="div">
                <Typography gutterBottom>
                  You&apos;re about to {isUpdate ? "update" : "save"}:
                </Typography>
                <Stack gap={0.75} sx={{ mb: 1 }}>
                  <SummaryLine
                    label="Indicator name"
                    value={summary.indicatorName}
                  />
                  <SummaryLine label="Visualization" value={summary.chartType} />
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
            )
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
            disabled={!ready || noChanges}
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
