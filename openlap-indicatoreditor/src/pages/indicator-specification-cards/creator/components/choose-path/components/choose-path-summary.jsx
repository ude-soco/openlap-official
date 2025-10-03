import { useContext, useState } from "react";
import { Chip, Collapse, IconButton, Stack, Typography } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import ToggleSummaryButton from "../../../../../../common/components/toggle-summary-button/toggle-summary-button.jsx";
import { ToggleEditButton } from "../../../../../../common/components/toggle-edit-button/toggle-edit-button.jsx";
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
      <li>If you have a <b>chart</b> in mind, you can start by choosing a <b>Visualization</b>.</li>
      <li>If you have an idea what <b>data</b> you want to show in a table, you can start by creating or uploading a <b>Dataset</b>.</li>
      <li>If you know <b>why</b> are you analyzing your data, you can start by choosing a <b>Task</b>.</li>
    </ul>
    Don’t worry — you’ll complete the steps either way.
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
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ pb: 2 }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
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
        </Stack>
        <ToggleEditButton
          openPanel={lockedStep.path.openPanel}
          togglePanel={handleTogglePanel}
        />
      </Stack>
      <Collapse
        in={!lockedStep.path.openPanel && state.showSelections}
        timeout={{ enter: 500, exit: 250 }}
        unmountOnExit
      >
        {requirements.selectedPath !== "" ? (
          <Stack direction="row" alignItems="center" gap={1}>
            <Typography>Selected path:</Typography>
            <Chip label={requirements.selectedPath} />
          </Stack>
        ) : (
          !lockedStep.path.locked && (
            <Typography>
              <em>No path selected yet</em>
            </Typography>
          )
        )}
      </Collapse>
    </>
  );
}
