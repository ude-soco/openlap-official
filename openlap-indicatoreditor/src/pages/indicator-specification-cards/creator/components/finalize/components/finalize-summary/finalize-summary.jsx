import { useContext, useState } from "react";
import { ISCContext } from "../../../../indicator-specification-card";
import { Chip, IconButton, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import LockIcon from "@mui/icons-material/Lock";
import { ToggleEditIconButton } from "../../../toggle-edit-button";
import SummaryTipPopover from "./summary-tip-popover";

export default function FinalizeSummary() {
  const { lockedStep, setLockedStep } = useContext(ISCContext);
  const [state, setState] = useState({
    tipAnchor: null,
    showSelections: true,
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
                {!lockedStep.finalize.locked ? (
                  <Chip label={lockedStep.finalize.step} color="primary" />
                ) : (
                  <IconButton size="small">
                    <LockIcon />
                  </IconButton>
                )}
                <Typography>Finalize Indicator</Typography>
                <SummaryTipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                />
              </Grid>
            </Grid>
            <ToggleEditIconButton
              openPanel={lockedStep.finalize.openPanel}
              togglePanel={handleTogglePanel}
            />
          </Grid>
        </Grid>
      </Grid>
    </>
  );
}
