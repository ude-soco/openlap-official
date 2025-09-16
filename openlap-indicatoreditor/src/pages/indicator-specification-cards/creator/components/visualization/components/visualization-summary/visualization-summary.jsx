import { useContext, useState } from "react";
import { ISCContext } from "../../../../indicator-specification-card";
import {
  Chip,
  Collapse,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button.jsx";
import Summary from "./summary";
import { ToggleEditButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button.jsx";
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
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ pb: 2 }}
      >
        <Stack direction="row" alignItems="center" gap={1}>
          {!lockedStep.visualization.locked ? (
            <Chip label={lockedStep.visualization.step} color="primary" />
          ) : (
            <IconButton size="small">
              <LockIcon />
            </IconButton>
          )}
          <Typography>Choose visualization</Typography>
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
        </Stack>
        <ToggleEditButton
          openPanel={lockedStep.visualization.openPanel}
          togglePanel={handleTogglePanel}
        />
      </Stack>
      <Collapse
        in={!lockedStep.visualization.openPanel && state.showSelections}
        timeout={{ enter: 500, exit: 250 }}
        unmountOnExit
      >
        <Summary
          filterType={visRef.filter.type}
          chartType={visRef.chart.type}
        />
      </Collapse>
    </>
  );
}
