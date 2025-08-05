import { useContext, useState } from "react";
import { Chip, Fade, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { BasicContext } from "../../basic-indicator";
import SummaryTipPopover from "./summary-tip-popover";
import ToggleSummaryButton from "../../../../../indicator-specification-cards/creator/components/toggle-summary-button";
import { ToggleEditIconButton } from "../../../../../indicator-specification-cards/creator/components/toggle-edit-button";

export default function DatasetSummary() {
  const { lockedStep, setLockedStep } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: false,
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
      dataset: { ...p.dataset, openPanel: !p.dataset.openPanel },
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
                <Chip label={lockedStep.dataset.step} color="primary" />
                <Typography>Choose source of data</Typography>
                <SummaryTipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                />
                {!lockedStep.dataset.openPanel && (
                  <ToggleSummaryButton
                    showSelections={state.showSelections}
                    toggleShowSelection={handleToggleShowSelection}
                  />
                )}
              </Grid>
            </Grid>
            <ToggleEditIconButton
              openPanel={lockedStep.dataset.openPanel}
              togglePanel={handleTogglePanel}
            />
          </Grid>
        </Grid>
        <Fade
          in={!lockedStep.dataset.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 0 }}
          unmountOnExit
        >
          <Grid size={{ xs: 12 }}>
            <Typography>Dataset summary</Typography>
          </Grid>
        </Fade>
      </Grid>
    </>
  );
}
