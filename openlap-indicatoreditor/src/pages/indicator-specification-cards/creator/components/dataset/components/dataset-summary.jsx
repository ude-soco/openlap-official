import { useContext, useState } from "react";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import { Chip, Collapse, IconButton, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import LockIcon from "@mui/icons-material/Lock";
import ToggleSummaryButton from "../../../../../../common/components/toggle-summary-button/toggle-summary-button.jsx";
import DataTable from "./data-table.jsx";
import { ToggleEditIconButton } from "../../../../../../common/components/toggle-edit-button/toggle-edit-button.jsx";
import TipPopover from "../../../../../../common/components/tip-popover/tip-popover.jsx";

export default function DatasetSummary() {
  const { lockedStep, dataset, setLockedStep } = useContext(ISCContext);
  const [state, setState] = useState({
    tipAnchor: null,
    showSelections: true,
    tipDescription: `
      <b>Tip!</b><br/>
      Create your own data by filling in the table.
      <ul>
        <li>You can add new columns and rows based on your needs</li>
        <li>Double click on the cells in each row to enter the values you want to analyze</li>
        <li>Click the column header to access the menu options</li>
      </ul>
      If you have an existing dataset (.csv data), you can upload it here
      easily.
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
                {!lockedStep.dataset.locked && (
                  <TipPopover
                    tipAnchor={state.tipAnchor}
                    toggleTipAnchor={handleTipAnchor}
                    description={state.tipDescription}
                  />
                )}
                {!lockedStep.dataset.locked &&
                  !lockedStep.dataset.openPanel && (
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
        <Collapse
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
        </Collapse>
      )}
    </>
  );
}
