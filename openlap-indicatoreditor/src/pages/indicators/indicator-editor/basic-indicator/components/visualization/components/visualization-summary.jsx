import { useContext, useState } from "react";
import { Chip, Collapse, Grid, IconButton, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { BasicContext } from "../../../basic-indicator";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button";
import { ToggleEditIconButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";

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

  return (
    <>
      <Grid container>
        <Grid size={{ xs: 12 }}>
          <Grid container justifyContent="space-between" spacing={1}>
            <Grid size="grow">
              <Grid container alignItems="center" spacing={1}>
                {!lockedStep.visualization.locked ? (
                  <Chip label={lockedStep.visualization.step} color="primary" />
                ) : (
                  <IconButton size="small">
                    <LockIcon />
                  </IconButton>
                )}
                <Typography>Visualization</Typography>
                {!lockedStep.visualization.locked && (
                  <TipPopover
                    tipAnchor={state.tipAnchor}
                    toggleTipAnchor={handleTipAnchor}
                    description={state.tipDescription}
                  />
                )}
                {!lockedStep.visualization.locked &&
                  !lockedStep.visualization.openPanel && (
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
        <Collapse
          in={!lockedStep.visualization.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 250 }}
          unmountOnExit
        >
          <Grid container spacing={1}>
            {handleCheckVisualizationSelected("library") && (
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Visualization Library</Typography>
                  <Chip label={visualization.selectedLibrary.name} />
                </Grid>
              </Grid>
            )}
            {handleCheckVisualizationSelected("chart") && (
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Chart</Typography>
                  <Chip label={visualization.selectedType.name} />
                </Grid>
              </Grid>
            )}
            {handleCheckVisualizationSelected("inputs") && (
              <Grid size={{ xs: 12 }}>
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
              </Grid>
            )}
          </Grid>
        </Collapse>
      </Grid>
    </>
  );
}
