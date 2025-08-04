import { useContext, useState } from "react";
import Grid from "@mui/material/Grid2";
import { Button, Chip, Fade, IconButton, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import LockIcon from "@mui/icons-material/Lock";
import { ISCContext } from "../../../../indicator-specification-card";
import SummaryTipPopover from "./summary-tip-popover";
import ToggleSummaryButton from "../../../toggle-summary-button";

export default function ChoosePathSummary() {
  const { lockedStep, requirements, setLockedStep } = useContext(ISCContext);
  const [state, setState] = useState({
    tipAnchor: null,
    showSelections: true,
  });

  const handleTipAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

  const handleToggleShowSelection = () => {
    setState((p) => ({ ...p, showSelections: !p.showSelections }));
  };

  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      path: { ...p.path, openPanel: !p.path.openPanel },
    }));
  };

  return (
    <>
      <Grid container spacing={1}>
        <Grid size={{ xs: 12 }}>
          <Grid
            container
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Grid size="grow">
              <Grid container alignItems="center" spacing={1}>
                {!lockedStep.path.locked ? (
                  <Chip label={lockedStep.path.step} color="primary" />
                ) : (
                  <IconButton size="small">
                    <LockIcon />
                  </IconButton>
                )}
                <Typography>How would you like to start?</Typography>
                <SummaryTipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                />
                {!lockedStep.path.openPanel && (
                  <ToggleSummaryButton
                    showSelections={state.showSelections}
                    toggleShowSelection={handleToggleShowSelection}
                  />
                )}
              </Grid>
            </Grid>
            <Grid size="auto">
              <Button
                startIcon={
                  lockedStep.path.openPanel ? <CloseIcon /> : <EditIcon />
                }
                onClick={handleTogglePanel}
              >
                {lockedStep.path.openPanel ? "Close" : "Edit"}
              </Button>
            </Grid>
          </Grid>
        </Grid>
        <Fade
          in={!lockedStep.path.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 0 }}
          unmountOnExit
        >
          <Grid size={{ xs: 12 }}>
            {requirements.selectedPath !== "" ? (
              <Grid item xs={12}>
                <Grid container alignItems="center" spacing={1}>
                  <Grid item>
                    <Typography>Selected path:</Typography>
                  </Grid>
                  <Grid item>
                    <Chip label={requirements.selectedPath} />
                  </Grid>
                </Grid>
              </Grid>
            ) : (
              !lockedStep.path.locked &&
              <Typography>
                <em>No path selected yet</em>
              </Typography>
            )}
          </Grid>
        </Fade>
      </Grid>
    </>
  );
}
