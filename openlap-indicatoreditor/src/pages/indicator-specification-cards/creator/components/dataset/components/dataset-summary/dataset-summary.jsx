import { useContext, useState } from "react";
import { ISCContext } from "../../../../indicator-specification-card";
import { Chip, Fade, IconButton, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import LockIcon from "@mui/icons-material/Lock";
import ToggleSummaryButton from "../../../toggle-summary-button";
import SummaryTipPopover from "./summary-tip-popover";
import DataTable from "../data-table";
import {
  ToggleEditButton,
  ToggleEditIconButton,
} from "../../../toggle-edit-button";

export default function DatasetSummary() {
  const { lockedStep, dataset, setLockedStep } = useContext(ISCContext);
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
      dataset: {
        ...p.dataset,
        openPanel: !p.dataset.openPanel,
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
                {!lockedStep.dataset.locked ? (
                  <Chip label={lockedStep.dataset.step} color="primary" />
                ) : (
                  <IconButton size="small">
                    <LockIcon />
                  </IconButton>
                )}
                <Typography>Choose Dataset</Typography>
                <SummaryTipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                />
                {!lockedStep.dataset.openPanel && (
                  <ToggleSummaryButton
                    showSelections={state.showSelections}
                    toggleShowSelection={handleToggleShowSelection}
                  />
                )}
              </Grid>
            </Grid>
            <ToggleEditIconButton
              openPanel={lockedStep.dataset.openPanel}
              togglePanel={handleTogglePanel}
            />
          </Grid>
        </Grid>
      </Grid>
      {!lockedStep.dataset.locked && (
        <Fade
          in={!lockedStep.dataset.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 250 }}
          unmountOnExit
        >
          <Grid size={{ xs: 12 }} sx={{ pt: 1 }}>
            <Typography variant="body2" gutterBottom>
              Preview
            </Typography>
            <DataTable rows={dataset.rows} columns={dataset.columns} />
          </Grid>
        </Fade>
      )}
    </>
  );
}
