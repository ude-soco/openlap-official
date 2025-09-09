import { useContext, useState } from "react";
import { Chip, Collapse, Grid, Typography } from "@mui/material";
import { ISCContext } from "../../../../indicator-specification-card";
import Summary from "./summary";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button.jsx";
import { ToggleEditIconButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button.jsx";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover.jsx";

export default function RequirementSummary() {
  const { lockedStep, requirements, setLockedStep } = useContext(ISCContext);
  const [state, setState] = useState({
    tipAnchor: null,
    showSelections: true,
    tipDescription: `
    <b>Tip!</b><br/>
    This step is designed to help you define and create a data-driven indicator related to your educational goals. It breaks down a potentially complex data analysis task into simple, fillable steps.
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
      requirements: { ...p.requirements, openPanel: !p.requirements.openPanel },
    }));
  };

  return (
    <>
      <Grid
        container
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <Grid size="grow">
          <Grid container alignItems="center" spacing={1}>
            <Chip label={lockedStep.requirements.step} color="primary" />
            <Typography>Specify requirements</Typography>
            <TipPopover
              tipAnchor={state.tipAnchor}
              toggleTipAnchor={handleTipAnchor}
              description={state.tipDescription}
            />
            {!lockedStep.requirements.openPanel && (
              <ToggleSummaryButton
                showSelections={state.showSelections}
                toggleShowSelection={handleToggleShowSelection}
              />
            )}
          </Grid>
        </Grid>
        <ToggleEditIconButton
          openPanel={lockedStep.requirements.openPanel}
          togglePanel={handleTogglePanel}
        />
      </Grid>
      <Collapse
        in={!lockedStep.requirements.openPanel && state.showSelections}
        timeout={{ enter: 500, exit: 250 }}
        unmountOnExit
      >
        <Grid size={{ xs: 12 }}>
          <Summary
            verb={requirements.goalType.verb}
            goal={requirements.goal}
            goalName={requirements.goalType.name}
            question={requirements.question}
            indicatorName={requirements.indicatorName}
            indicatorData={requirements.data}
          />
        </Grid>
      </Collapse>
    </>
  );
}
