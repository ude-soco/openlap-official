import { useContext, useState } from "react";
import Grid from "@mui/material/Grid2";
import { Chip, Collapse, Fade, IconButton, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import ToggleSummaryButton from "../../../../../../common/components/toggle-summary-button/toggle-summary-button.jsx";
import { ToggleEditIconButton } from "../../../../../../common/components/toggle-edit-button/toggle-edit-button.jsx";
import TipPopover from "../../../../../../common/components/tip-popover/tip-popover.jsx";

export default function ChoosePathSummary() {
  const { lockedStep, requirements, setLockedStep } = useContext(ISCContext);
  const [state, setState] = useState({
    tipAnchor: null,
    showSelections: true,
    tipDescription: `
    <b>Tip!</b><br/>
    You can choose one of the following paths:
    <ul>
      <li>If you have an idea what data you want to show in a table, you can start by creating or uploading a <b>Dataset</b>.</li>
      <li>If you have a chart in mind, you can start by choosing a <b>Visualization</b>.</li>
    </ul>
    Don’t worry — you’ll complete both steps either way.
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
      path: { ...p.path, openPanel: !p.path.openPanel },
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
                {!lockedStep.path.locked ? (
                  <Chip label={lockedStep.path.step} color="primary" />
                ) : (
                  <IconButton size="small">
                    <LockIcon />
                  </IconButton>
                )}
                <Typography>How would you like to start?</Typography>
                {!lockedStep.path.locked && (
                  <TipPopover
                    tipAnchor={state.tipAnchor}
                    toggleTipAnchor={handleTipAnchor}
                    description={state.tipDescription}
                  />
                )}
                {!lockedStep.path.locked && !lockedStep.path.openPanel && (
                  <ToggleSummaryButton
                    showSelections={state.showSelections}
                    toggleShowSelection={handleToggleShowSelection}
                  />
                )}
              </Grid>
            </Grid>
            <ToggleEditIconButton
              openPanel={lockedStep.path.openPanel}
              togglePanel={handleTogglePanel}
            />
          </Grid>
        </Grid>
        <Collapse
          in={!lockedStep.path.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 250 }}
          unmountOnExit
        >
          {requirements.selectedPath !== "" ? (
            <Grid container alignItems="center" spacing={1}>
              <Typography>Selected path:</Typography>
              <Chip label={requirements.selectedPath} />
            </Grid>
          ) : (
            !lockedStep.path.locked && (
              <Typography>
                <em>No path selected yet</em>
              </Typography>
            )
          )}
        </Collapse>
      </Grid>
    </>
  );
}
