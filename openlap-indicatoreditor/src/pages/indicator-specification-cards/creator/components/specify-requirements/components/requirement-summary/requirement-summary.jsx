import { useContext, useState } from "react";
import { Chip, Collapse, Grid, Stack, Typography } from "@mui/material";
import { ISCContext } from "../../../../indicator-specification-card";
import Summary from "./summary";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button.jsx";
import { ToggleEditButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button.jsx";
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
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ pb: 2 }}
      >
        <Stack direction="row" gap={1} alignItems="center">
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
        </Stack>
        <ToggleEditButton
          openPanel={lockedStep.requirements.openPanel}
          togglePanel={handleTogglePanel}
        />
      </Stack>
      <Collapse
        in={!lockedStep.requirements.openPanel && state.showSelections}
        timeout={{ enter: 500, exit: 250 }}
        unmountOnExit
      >
        <Summary
          verb={requirements.goalType.verb}
          goal={requirements.goal}
          goalName={requirements.goalType.name}
          question={requirements.question}
          indicatorName={requirements.indicatorName}
          indicatorData={requirements.data}
        />
      </Collapse>
    </>
  );
}
