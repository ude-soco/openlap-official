import { useContext, useState } from "react";
import { Chip, Collapse, Grid, Stack, Typography } from "@mui/material";
import { BasicContext } from "../../../basic-indicator";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button";
import { ToggleEditButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";
import WorkflowStepHeader from "../../../../../../../common/components/workflow-step-header/workflow-step-header.jsx";

export default function VisualizationSummary() {
  const { visualization, lockedStep, setLockedStep } = useContext(BasicContext);
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
      visualization: {
        ...p.visualization,
        openPanel: !p.visualization.openPanel,
      },
    }));
  };

  const handleCheckVisualizationSelected = (condition) => {
    switch (condition) {
      case "library":
        return visualization.selectedLibrary.name.length !== 0;
      case "chart":
        return visualization.selectedType.name.length !== 0;
      case "inputs":
        return visualization.inputs.some((obj) => "selectedInput" in obj);
      default:
        return false;
    }
  };

  const locked = lockedStep.visualization.locked;

  return (
    <>
      <WorkflowStepHeader
        stepNumber={lockedStep.visualization.step}
        title="Visualization"
        locked={locked}
        helper={
          !locked && (
            <TipPopover
              tipAnchor={state.tipAnchor}
              toggleTipAnchor={handleTipAnchor}
              description={state.tipDescription}
            />
          )
        }
        summaryToggle={
          !locked &&
          !lockedStep.visualization.openPanel && (
            <ToggleSummaryButton
              showSelections={state.showSelections}
              toggleShowSelection={handleToggleShowSelection}
            />
          )
        }
        editToggle={
          <ToggleEditButton
            openPanel={lockedStep.visualization.openPanel}
            togglePanel={handleTogglePanel}
          />
        }
      />
      <Collapse
        in={
          !locked && !lockedStep.visualization.openPanel && state.showSelections
        }
        timeout={{ enter: 500, exit: 250 }}
        unmountOnExit
      >
        <Stack gap={1}>
          <Typography variant="body2" gutterBottom>
            Selection summary
          </Typography>
          {handleCheckVisualizationSelected("library") && (
            <Grid container spacing={1} alignItems="center">
              <Typography>Selected Visualization Library</Typography>
              <Chip label={visualization.selectedLibrary.name} />
            </Grid>
          )}
          {handleCheckVisualizationSelected("chart") && (
            <Grid container spacing={1} alignItems="center">
              <Typography>Selected Chart</Typography>
              <Chip label={visualization.selectedType.name} />
            </Grid>
          )}
          {handleCheckVisualizationSelected("inputs") && (
            <Grid container spacing={1} alignItems="center">
              <Typography>Selected Inputs</Typography>
              {visualization.inputs.map((input) => {
                if (input.selectedInput) {
                  return (
                    <Chip
                      key={input.id}
                      label={`${input.title} (${input.selectedInput.title})`}
                    />
                  );
                }
              })}
            </Grid>
          )}
        </Stack>
      </Collapse>
    </>
  );
}
