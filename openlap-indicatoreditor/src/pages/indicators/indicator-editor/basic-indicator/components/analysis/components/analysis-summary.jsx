import { useContext, useState } from "react";
import { Chip, Collapse, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
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

  return (
    <>
      <Grid container>
        <Grid size={{ xs: 12 }}>
          <Grid container justifyContent="space-between" spacing={1}>
            <Grid size="grow">
              <Grid container alignItems="center" spacing={1}>
                <Chip label={lockedStep.analysis.step} color="primary" />
                <Typography>Analysis</Typography>
                <TipPopover
                  tipAnchor={state.tipAnchor}
                  toggleTipAnchor={handleTipAnchor}
                  description={state.tipDescription}
                />
                {!lockedStep.analysis.openPanel && (
                  <ToggleSummaryButton
                    showSelections={state.showSelections}
                    toggleShowSelection={handleToggleShowSelection}
                  />
                )}
              </Grid>
            </Grid>
            <ToggleEditIconButton
              openPanel={lockedStep.analysis.openPanel}
              togglePanel={handleTogglePanel}
            />
          </Grid>
        </Grid>
        <Collapse
          in={!lockedStep.analysis.openPanel && state.showSelections}
          timeout={{ enter: 500, exit: 0 }}
          unmountOnExit
        >
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={1}>
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Analytics Method</Typography>
                  <Chip label={analysis.selectedAnalyticsMethod.method.name} />
                </Grid>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Inputs</Typography>
                  {analysis.inputs.map((input) => {
                    if (input.selectedInput) {
                      return (
                        <Chip
                          key={input.id}
                          label={`${input.title} - ${input.selectedInput.name}`}
                        />
                      );
                    }
                  })}
                </Grid>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Grid container spacing={1} alignItems="center">
                  <Typography>Selected Inputs</Typography>
                  {analysis.params.map((param) => (
                    <Chip
                      key={param.id}
                      label={`${param.title} (${param.value})`}
                    />
                  ))}
                </Grid>
              </Grid>
              <Grid size={{ xs: 12 }}>
                {Object.keys(analysis.analyzedData).length ? (
                  <AnalyzedDataTable />
                ) : undefined}
              </Grid>
            </Grid>
          </Grid>
        </Collapse>
      </Grid>
    </>
  );
}
