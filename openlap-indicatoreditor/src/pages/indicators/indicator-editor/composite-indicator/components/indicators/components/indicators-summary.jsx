import { useContext, useState } from "react";
import { Chip, Collapse, Grid, Typography } from "@mui/material";
import { CompositeContext } from "../../../composite-indicator";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button";
import { ToggleEditButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button";

const IndicatorsSummary = () => {
  const { lockedStep, setLockedStep } = useContext(CompositeContext);
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
      indicators: { ...p.indicators, openPanel: !p.indicators.openPanel },
    }));
  };

  return (
    <>
      <Grid container spacing={1}>
        <Grid size={{ xs: 12 }}>
          <Grid container justifyContent="space-between" spacing={1}>
            <Grid size="grow">
              <Grid container alignItems="center" spacing={1}>
                <Chip label={lockedStep.indicators.step} color="primary" />
                <Typography>Indicators</Typography>
                <TipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                  description={state.tipDescription}
                />
                {!lockedStep.indicators.openPanel && (
                  <ToggleSummaryButton
                    showSelections={state.showSelections}
                    toggleShowSelection={handleToggleShowSelection}
                  />
                )}
              </Grid>
            </Grid>
            <ToggleEditButton
              openPanel={lockedStep.indicators.openPanel}
              togglePanel={handleTogglePanel}
            />
          </Grid>
        </Grid>
        <Collapse
          in={!lockedStep.indicators.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 250 }}
          unmountOnExit
        >
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={1} alignItems="center">
              {/* TODO: Complete Indicators Summary */}
              <Typography>Indicators Summary</Typography>
            </Grid>
          </Grid>
        </Collapse>
      </Grid>
    </>
  );
};

export default IndicatorsSummary;
