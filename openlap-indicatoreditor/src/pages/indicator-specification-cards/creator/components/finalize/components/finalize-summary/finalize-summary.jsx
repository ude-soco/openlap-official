import { useContext, useState } from "react";
import { ISCContext } from "../../../../indicator-specification-card";
import { Chip, IconButton, Grid, Typography, Stack } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { ToggleEditButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button.jsx";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover.jsx";

export default function FinalizeSummary() {
  const { lockedStep, setLockedStep } = useContext(ISCContext);
  const [state, setState] = useState({
    tipAnchor: null,
    showSelections: true,
    tipDescription: `
      <b>Tip:</b><br/>
      Take a final look at your indicator with the chosen data. Customize the chart by adding a title, subtitle, and choosing colors that highlight your message. <br/>
      Make sure everything looks clear and meaningful before you finish.
    `,
  });

  const handleTipAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

  const handleTogglePanel = () => {
    setLockedStep((p) => ({
      ...p,
      finalize: {
        ...p.finalize,
        openPanel: !p.finalize.openPanel,
      },
    }));
  };

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Stack direction="row" alignItems="center" gap={1}>
          {!lockedStep.finalize.locked ? (
            <Chip label={lockedStep.finalize.step} color="primary" />
          ) : (
            <IconButton size="small">
              <LockIcon />
            </IconButton>
          )}
          <Typography>Finalize Indicator</Typography>
          {!lockedStep.finalize.locked && (
            <TipPopover
              tipAnchor={state.tipAnchor}
              toggleTipAnchor={handleTipAnchor}
              description={state.tipDescription}
            />
          )}
        </Stack>
        <ToggleEditButton
          openPanel={lockedStep.finalize.openPanel}
          togglePanel={handleTogglePanel}
        />
      </Stack>
    </>
  );
}
