import { useContext, useState } from "react";
import { Chip, Collapse, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { BasicContext } from "../../../basic-indicator";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button";
import { ToggleEditIconButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";

export default function FilterSummary() {
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
      filters: { ...p.filters, openPanel: !p.filters.openPanel },
    }));
  };

  return (
    <>
      <Grid container spacing={1}>
        <Grid size={{ xs: 12 }}>
          <Grid container justifyContent="space-between" spacing={1}>
            <Grid size="grow">
              <Grid container alignItems="center" spacing={1}>
                <Chip label={lockedStep.filters.step} color="primary" />
                <Typography>Filters</Typography>
                <TipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                  description={state.tipDescription}
                />
                {!lockedStep.filters.openPanel && (
                  <ToggleSummaryButton
                    showSelections={state.showSelections}
                    toggleShowSelection={handleToggleShowSelection}
                  />
                )}
              </Grid>
            </Grid>
            <ToggleEditIconButton
              openPanel={lockedStep.filters.openPanel}
              togglePanel={handleTogglePanel}
            />
          </Grid>
        </Grid>
        <Collapse
          in={!lockedStep.filters.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 0 }}
          unmountOnExit
        >
          <Grid size={{ xs: 12 }}>
            {/* // TODO: Incomplete summary */}
            <Typography>Filters summary</Typography>
          </Grid>
        </Collapse>
      </Grid>
    </>
  );
}
