import { useContext, useState } from "react";
import { Chip, Collapse, Grid, Stack, Typography } from "@mui/material";
import { BasicContext } from "../../basic-indicator";
import ToggleSummaryButton from "../../../../../../common/components/toggle-summary-button/toggle-summary-button";
import { ToggleEditButton } from "../../../../../../common/components/toggle-edit-button/toggle-edit-button";
import TipPopover from "../../../../../../common/components/tip-popover/tip-popover";
import WorkflowStepHeader from "../../../../../../common/components/workflow-step-header/workflow-step-header.jsx";

export default function DatasetSummary() {
  const { dataset, lockedStep, setLockedStep } = useContext(BasicContext);
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

  const handleCheckDatasetSelected = () => {
    return dataset.selectedLRSList.length !== 0;
  };

  return (
    <>
      <WorkflowStepHeader
        stepNumber={lockedStep.dataset.step}
        title="Dataset"
        helper={
          <TipPopover
            tipAnchor={state.tipAnchor}
            toggleTipAnchor={handleTipAnchor}
            description={state.tipDescription}
          />
        }
        summaryToggle={
          !lockedStep.dataset.openPanel && (
            <ToggleSummaryButton
              showSelections={state.showSelections}
              toggleShowSelection={handleToggleShowSelection}
            />
          )
        }
        editToggle={
          <ToggleEditButton
            openPanel={lockedStep.dataset.openPanel}
            togglePanel={handleTogglePanel}
          />
        }
      />
      <Collapse
        in={!lockedStep.dataset.openPanel && state.showSelections}
        timeout={{ enter: 500, exit: 250 }}
        unmountOnExit
      >
        <Stack gap={1}>
          <Typography variant="body2" gutterBottom>
            Selection summary
          </Typography>
          <Grid container spacing={1} alignItems="center">
            {handleCheckDatasetSelected() ? (
              <>
                <Typography>Source of data:</Typography>
                {dataset.selectedLRSList.map((lrs) => (
                  <Grid key={lrs.id}>
                    <Chip label={lrs.lrsTitle} />
                  </Grid>
                ))}
              </>
            ) : (
              <Typography sx={{ fontStyle: "italic" }}>
                No source selected yet!
              </Typography>
            )}
          </Grid>
        </Stack>
      </Collapse>
    </>
  );
}
