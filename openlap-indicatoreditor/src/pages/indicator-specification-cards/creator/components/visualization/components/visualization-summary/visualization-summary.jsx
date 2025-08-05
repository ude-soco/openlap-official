import { useContext, useState } from "react";
import { ISCContext } from "../../../../indicator-specification-card";
import { Chip, Fade, IconButton, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import LockIcon from "@mui/icons-material/Lock";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button.jsx";
import Summary from "./summary";
import { ToggleEditIconButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button.jsx";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover.jsx";

export default function VisualizationSummary() {
  const { lockedStep, visRef, setLockedStep } = useContext(ISCContext);
  const [state, setState] = useState({
    tipAnchor: null,
    showSelections: true,
    tipDescription: `
      <b>Tip!</b><br />
      Choose a <b>Chart type</b> that fits your needs.<br />
      Each chart requires specific type of data (e.g. <em>categorical</em>, <em>numerical</em>, and <em>categorical (ordinal)</em>).<br />
      Your <b>Dataset</b> should have the type of data required by your selected <b>Chart</b>. <br />
      Check the required type of data under the short description for the Charts.<br /><br />
      <b>Good to know!</b><br />
      Charts will be <b>recommended</b> to you if those match the type of data available in your <b>Dataset</b>.
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
                {!lockedStep.visualization.locked ? (
                  <Chip label={lockedStep.visualization.step} color="primary" />
                ) : (
                  <IconButton size="small">
                    <LockIcon />
                  </IconButton>
                )}
                <Typography>Choose visualization</Typography>
                <TipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                  description={state.tipDescription}
                />
                {!lockedStep.visualization.openPanel && (
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
      </Grid>
      <Fade
        in={!lockedStep.visualization.openPanel && state.showSelections}
        timeout={{ enter: 500, exit: 0 }}
        unmountOnExit
      >
        <Grid size={{ xs: 12 }} sx={{ pt: 1 }}>
          <Summary
            filterType={visRef.filter.type}
            chartType={visRef.chart.type}
          />
        </Grid>
      </Fade>
    </>
  );
}
