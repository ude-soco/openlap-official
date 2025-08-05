import { useContext, useState } from "react";
import { Chip, Collapse, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { BasicContext } from "../../basic-indicator";
import ToggleSummaryButton from "../../../../../../common/components/toggle-summary-button/toggle-summary-button";
import { ToggleEditIconButton } from "../../../../../../common/components/toggle-edit-button/toggle-edit-button";
import TipPopover from "../../../../../../common/components/tip-popover/tip-popover";

export default function DatasetSummary() {
  const { lockedStep, setLockedStep } = useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: false,
    showSelections: true,
    tipDescription: `
      <b>Tip!</b><br/>
      To be decided!
    `,
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
          <Grid container justifyContent="space-between" spacing={1}>
            <Grid size="grow">
              <Grid container alignItems="center" spacing={1}>
                <Chip label={lockedStep.dataset.step} color="primary" />
                <Typography>Choose source of data</Typography>
                <TipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                  description={state.tipDescription}
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
        <Collapse
          in={!lockedStep.dataset.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 0 }}
          unmountOnExit
        >
          <Grid size={{ xs: 12 }}>
            <Typography>Dataset summary</Typography>
          </Grid>
        </Collapse>
      </Grid>
    </>
  );
}
