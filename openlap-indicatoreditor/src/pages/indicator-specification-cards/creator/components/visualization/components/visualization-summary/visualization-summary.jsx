import { useContext, useState } from "react";
import { ISCContext } from "../../../../indicator-specification-card";
import { Button, Chip, Fade, IconButton, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import LockIcon from "@mui/icons-material/Lock";
import ToggleSummaryButton from "../../../toggle-summary-button";
import SummaryTipPopover from "./summary-tip-popover";
import Summary from "./summary";
import { ToggleEditIconButton } from "../../../toggle-edit-button";

export default function VisualizationSummary() {
  const { lockedStep, visRef, setLockedStep } = useContext(ISCContext);
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
      visualization: {
        ...p.visualization,
        openPanel: !p.visualization.openPanel,
      },
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
                {!lockedStep.visualization.locked ? (
                  <Chip label={lockedStep.visualization.step} color="primary" />
                ) : (
                  <IconButton size="small">
                    <LockIcon />
                  </IconButton>
                )}
                <Typography>Choose visualization</Typography>
                <SummaryTipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                />
                {!lockedStep.visualization.openPanel && (
                  <ToggleSummaryButton
                    showSelections={state.showSelections}
                    toggleShowSelection={handleToggleShowSelection}
                  />
                )}
              </Grid>
            </Grid>
            <ToggleEditIconButton
              openPanel={lockedStep.visualization.openPanel}
              togglePanel={handleTogglePanel}
            />
          </Grid>
        </Grid>
      </Grid>
      <Fade
        in={!lockedStep.visualization.openPanel && state.showSelections}
        timeout={{ enter: 500, exit: 0 }}
        unmountOnExit
      >
        <Grid size={{ xs: 12 }} sx={{ pt: 1 }}>
          <Summary
            filterType={visRef.filter.type}
            chartType={visRef.chart.type}
          />
        </Grid>
      </Fade>
    </>
  );
}
