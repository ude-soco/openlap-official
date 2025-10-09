import { useContext, useState } from "react";
import {
  Chip,
  Collapse,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { BasicContext } from "../../../basic-indicator";
import TipPopover from "../../../../../../../common/components/tip-popover/tip-popover";
import ToggleSummaryButton from "../../../../../../../common/components/toggle-summary-button/toggle-summary-button";
import { ToggleEditIconButton } from "../../../../../../../common/components/toggle-edit-button/toggle-edit-button";
import AnalyzedDataTable from "./analyzed-data-table";

export default function AnalysisSummary() {
  const { analysis, lockedStep, setLockedStep } = useContext(BasicContext);
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
      analysis: { ...p.analysis, openPanel: !p.analysis.openPanel },
    }));
  };

  const handleCheckAnalyticsMethodSelected = (condition) => {
    switch (condition) {
      case "method":
        return analysis.selectedAnalyticsMethod.method.name.length !== 0;
      case "inputs":
        return analysis.inputs.some((obj) => "selectedInput" in obj);
      default:
        return false;
    }
  };

  return (
    <>
      <Stack gap={2}>
        <Stack direction="row" justifyContent="space-between" gap={1}>
          <Grid container alignItems="center" spacing={1}>
            {!lockedStep.analysis.locked ? (
              <Chip label={lockedStep.analysis.step} color="primary" />
            ) : (
              <IconButton size="small">
                <LockIcon />
              </IconButton>
            )}
            <Typography>Analysis</Typography>
            {!lockedStep.analysis.locked && (
              <TipPopover
                tipAnchor={state.tipAnchor}
                toggleTipAnchor={handleTipAnchor}
                description={state.tipDescription}
              />
            )}
            {!lockedStep.analysis.locked && !lockedStep.analysis.openPanel && (
              <ToggleSummaryButton
                showSelections={state.showSelections}
                toggleShowSelection={handleToggleShowSelection}
              />
            )}
          </Grid>
          <ToggleEditIconButton
            openPanel={lockedStep.analysis.openPanel}
            togglePanel={handleTogglePanel}
          />
        </Stack>
        <Collapse
          in={!lockedStep.analysis.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 250 }}
          unmountOnExit
        >
          <Grid container spacing={1}>
            {handleCheckAnalyticsMethodSelected("method") && (
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Analytics Method</Typography>
                  <Chip label={analysis.selectedAnalyticsMethod.method.name} />
                </Grid>
              </Grid>
            )}
            {handleCheckAnalyticsMethodSelected("inputs") && (
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Inputs</Typography>
                  {analysis.inputs.map((input) => {
                    if (input.selectedInput) {
                      return (
                        <Chip
                          key={input.id}
                          label={`${input.title} (${input.selectedInput.name})`}
                        />
                      );
                    }
                  })}
                </Grid>
              </Grid>
            )}
            {handleCheckAnalyticsMethodSelected("method") && (
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Params</Typography>
                  {analysis.params.map((param) => (
                    <Chip
                      key={param.id}
                      label={`${param.title} (${param.value})`}
                    />
                  ))}
                </Grid>
              </Grid>
            )}
            <Grid size={{ xs: 12 }}>
              {Object.keys(analysis.analyzedData).length ? (
                <AnalyzedDataTable />
              ) : undefined}
            </Grid>
          </Grid>
        </Collapse>
      </Stack>
    </>
  );
}
