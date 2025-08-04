import { useContext, useState } from "react";
import Grid from "@mui/material/Grid2";
import { Button, Chip, Fade, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import { ISCContext } from "../../../../indicator-specification-card";
import SummaryTipPopover from "./summary-tip-popover";
import Summary from "./summary";
import ToggleSummaryButton from "../../../toggle-summary-button";

export default function RequirementSummary() {
  const { lockedStep, requirements, setLockedStep } = useContext(ISCContext);
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
      requirements: { ...p.requirements, openPanel: !p.requirements.openPanel },
    }));
  };

  return (
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
              <Chip label={lockedStep.requirements.step} color="primary" />
              <Typography>
                Specify your goal, question, and indicator
              </Typography>
              <SummaryTipPopover
                tipAnchor={state.tipAnchor}
                toggleTipAnchor={handleTipAnchor}
              />
              {!lockedStep.requirements.openPanel && (
                <ToggleSummaryButton
                  showSelections={state.showSelections}
                  toggleShowSelection={handleToggleShowSelection}
                />
              )}
            </Grid>
          </Grid>
          <Grid size="auto">
            <Button
              startIcon={
                lockedStep.requirements.openPanel ? <CloseIcon /> : <EditIcon />
              }
              onClick={handleTogglePanel}
            >
              {lockedStep.requirements.openPanel ? "Close" : "Edit"}
            </Button>
          </Grid>
        </Grid>
      </Grid>
      <Fade
        in={!lockedStep.requirements.openPanel && state.showSelections}
        timeout={{ enter: 500, exit: 0 }}
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
      </Fade>
    </Grid>
  );
}
