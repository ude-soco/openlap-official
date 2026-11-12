import { useContext, useState } from "react";
import CustomPaper from "../../../../../../common/components/custom-paper/custom-paper";
import {
  Box,
  Button,
  Collapse,
  Divider,
  FormControl,
  Grid,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import ColumnsMergeSummary from "./components/columns-merge-summary";
import { CompositeContext } from "../../composite-indicator";
import {
  requestIndicatorsToAnalyze,
  requestMergeIndicatorData,
} from "./utils/columns-merge-api";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import PreviewDataTable from "./components/preview-data-table";
import MergedDataTable from "./components/merged-data-table";
import CustomTooltip from "../../../../../../common/components/custom-tooltip/custom-tooltip";

const ColumnsMerge = () => {
  const { api } = useContext(AuthContext);
  const {
    lockedStep,
    indicator,
    columnsMerge,
    setLockedStep,
    setColumnsMerge,
  } = useContext(CompositeContext);
  const [state, setState] = useState({
    isPreviewLoading: false,
  });

  const loadIndicatorsToAnalyze = async () => {
    const indicatorIds = indicator.selectedIndicators.map((items) => items.id);
    try {
      const indicatorsToAnalyze = await requestIndicatorsToAnalyze(
        api,
        indicatorIds
      );
      setColumnsMerge((p) => ({
        ...p,
        indicatorsToAnalyze,
        columnToMerge:
          indicatorsToAnalyze.analyticsOutputs.length === 1
            ? indicatorsToAnalyze.analyticsOutputs.at(0)
            : {},
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectColumnToMerge = (event) => {
    const selectedOutput =
      columnsMerge.indicatorsToAnalyze.analyticsOutputs.find(
        (item) => item.id === event.target.value
      );
    if (selectedOutput) {
      setColumnsMerge((p) => ({ ...p, columnToMerge: selectedOutput }));
    }
  };

  const handlePreviewAnalyzedData = async () => {
    setState((p) => ({ ...p, isPreviewLoading: true }));
    const indicators = indicator.selectedIndicators.map((items) => ({
      indicatorId: items.id,
    }));
    try {
      const anaylzedData = await requestMergeIndicatorData(
        api,
        columnsMerge.columnToMerge,
        indicators
      );
      setColumnsMerge((p) => ({ ...p, analyzedData: anaylzedData.data }));
    } catch (error) {
      console.error(error);
    } finally {
      setState((p) => ({ ...p, isPreviewLoading: true }));
    }
  };
  console.log(columnsMerge.analyzedData);

  return (
    <CustomPaper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <ColumnsMergeSummary />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Collapse
            in={lockedStep.columnsMerge.openPanel}
            timeout={{ enter: 500, exit: 250 }}
            unmountOnExit
          >
            <Grid container spacing={2} justifyContent="center">
              <Grid size={{ xs: 12 }}>
                <Button onClick={loadIndicatorsToAnalyze}>Click</Button>
              </Grid>
              {columnsMerge.indicatorsToAnalyze.indicators.length !== 0 &&
                columnsMerge.indicatorsToAnalyze.indicators.map(
                  (item, index) => (
                    <Grid key={index} size={{ xs: 12, xl: 6 }}>
                      <Grid container>
                        <Grid size={{ xs: 12 }}>
                          <Typography>
                            Indicator: <b>{item.name}</b>
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <PreviewDataTable
                            analyzedData={item.analyzedDataset.columns}
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  )
                )}
              <Grid size={{ xs: 12 }}>
                <Divider />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography gutterBottom>Select column to merge</Typography>
                  <FormControl>
                    <RadioGroup
                      row
                      value={columnsMerge.columnToMerge?.id}
                      onChange={handleSelectColumnToMerge}
                    >
                      {columnsMerge.indicatorsToAnalyze.analyticsOutputs.map(
                        (output, index) => (
                          <FormControlLabel
                            key={index}
                            value={output.id}
                            control={<Radio />}
                            label={
                              <Grid container alignItems="center" spacing={0.5}>
                                <Typography>{output.title}</Typography>
                                {columnsMerge.indicatorsToAnalyze
                                  .analyticsOutputs.length === 1 && (
                                  <>
                                    <Typography>(Preselected)</Typography>
                                    <CustomTooltip
                                      type="help"
                                      message={`This option is preselect because:<br/>
                                        ● There is only <b>one</b> compatible <b>Categorical</b> column available between your selected indicators to merge`}
                                    />
                                  </>
                                )}
                              </Grid>
                            }
                          />
                        )
                      )}
                    </RadioGroup>
                  </FormControl>
                </Paper>
              </Grid>
              <Grid size={{ xs: 12 }}>
                {Object.entries(columnsMerge.analyzedData).length > 0 ? (
                  <MergedDataTable
                    indicatorsToAnalyze={columnsMerge.indicatorsToAnalyze}
                    columnToMerge={columnsMerge.columnToMerge}
                    analyzedData={columnsMerge.analyzedData.columns}
                  />
                ) : (
                  <Box
                    sx={{
                      mt: 2,
                      pb: 1,
                      p: 8,
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: 2,
                      textAlign: "center",
                      color: "text.secondary",
                    }}
                  >
                    <Typography variant="body1" gutterBottom>
                      Click "Preview" to run the analysis and view of the
                      analyzed data.
                    </Typography>
                    <Grid container justifyContent="center">
                      <Button
                        loading={state.isPreviewLoading}
                        loadingPosition="start"
                        loadingIndicator="Loading…"
                        autoFocus
                        variant="contained"
                        //   disabled={handleCheckPreviewDisabled()}
                        onClick={handlePreviewAnalyzedData}
                      >
                        {!state.isPreviewLoading && "Preview"}
                      </Button>
                      {/* {handleCheckPreviewDisabled() && (
                          <CustomTooltip
                            type="help"
                            message={`The button is disabled because:<br/>
                                ● The required <b>Input(s)</b> of the analytics method may not selected.<br/>
                                ● In <b>Filters</b>, under all <b>Activity filters</b>, none of the <b>Activities</b> are possibly not selected.
                                `}
                          />
                        )} */}
                    </Grid>
                  </Box>
                )}
              </Grid>
            </Grid>
          </Collapse>
        </Grid>
      </Grid>
    </CustomPaper>
  );
};

export default ColumnsMerge;
