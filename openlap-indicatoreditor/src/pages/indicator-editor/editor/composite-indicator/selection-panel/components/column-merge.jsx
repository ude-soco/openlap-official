import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useSnackbar } from "notistack";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  FormGroup,
  Grid,
  Skeleton,
  Switch,
  Typography,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";
import LockIcon from "@mui/icons-material/Lock";
import { CompositeIndicatorContext } from "../../composite-indicator.jsx";
import { LoadingButton } from "@mui/lab";
import ColumnToMerge from "../../../basic-indicator/selection-panel/components/filters/components/column-to-merge.jsx";
import MergeCard from "./merge-card.jsx";
import MergedDataTable from "./merged-data-table.jsx";
import {
  requestIndicatorsToAnalyze,
  requestMergeIndicatorData,
} from "../utils/selection-api.js";

const ColumnMerge = () => {
  const { api } = useContext(AuthContext);
  const { lockedStep, setLockedStep, indicatorRef, setIndicatorRef } =
    useContext(CompositeIndicatorContext);
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({
    showSelections: true,
    loadingIndicators: false,
    indicatorsToAnalyze: {
      indicators: [],
      analyticsOutputs: [],
    },
    selectedAnalyticsOutput: {},
    loadingPreview: false,
  });

  useEffect(() => {
    const loadIndicatorsToAnalyze = async (api, indicators) => {
      try {
        return await requestIndicatorsToAnalyze(api, indicators);
      } catch (error) {
        throw error;
      }
    };

    if (
      indicatorRef.indicators.length > 1 &&
      Object.entries(indicatorRef.analyzedData).length === 0
    ) {
      loadIndicatorsToAnalyze(api, indicatorRef.indicators).then((response) => {
        setState((prevState) => ({
          ...prevState,
          indicatorsToAnalyze: {
            ...prevState.indicatorsToAnalyze,
            indicators: response.indicators,
            analyticsOutputs: response.analyticsOutputs,
          },
          selectedAnalyticsOutput:
            response.analyticsOutputs.length === 1
              ? response.analyticsOutputs[0]
              : {},
        }));

        setIndicatorRef((prevState) => ({
          ...prevState,
          columnToMerge:
            response.analyticsOutputs.length === 1
              ? response.analyticsOutputs[0]
              : {},
        }));
      });
    }
  }, [lockedStep.columnMerge.openPanel]);

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      columnMerge: {
        ...prevState.columnMerge,
        openPanel: !prevState.columnMerge.openPanel,
      },
    }));
  };

  const handleToggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleUnlockVisualization = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: {
        locked: false,
        openPanel: true,
      },
    }));
  };

  const handlePreviewAnalyzedData = () => {
    setState((prevState) => ({
      ...prevState,
      loadingPreview: true,
    }));
    setIndicatorRef((prevState) => ({
      ...prevState,
      analyzedData: {},
    }));

    const loadMergeData = async (api, columnToMerge, indicators) => {
      try {
        return requestMergeIndicatorData(api, columnToMerge, indicators);
      } catch (error) {
        console.log("Error merging indicators");
        throw error;
      }
    };

    loadMergeData(api, indicatorRef.columnToMerge, indicatorRef.indicators)
      .then((response) => {
        setState((prevState) => ({
          ...prevState,
          loadingPreview: false,
        }));
        setIndicatorRef((prevState) => ({
          ...prevState,
          analyzedData: response.data.columns,
        }));
      })
      .catch((error) => {
        enqueueSnackbar("Error getting indicators", { variant: "error" });
      })
      .finally(() => {
        setState((prevState) => ({
          ...prevState,
          loadingPreview: false,
        }));
      });
  };

  return (
    <>
      <Accordion
        sx={{ mb: 1 }}
        expanded={lockedStep.columnMerge.openPanel}
        disabled={lockedStep.columnMerge.locked}
      >
        <AccordionSummary>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Grid
                container
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Grid item xs>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      {!lockedStep.columnMerge.locked ? (
                        <Chip label="2" color="primary" />
                      ) : (
                        <IconButton size="small">
                          <LockIcon />
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>Columns to merge</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                {!lockedStep.columnMerge.locked && (
                  <Grid item>
                    <Grid container>
                      {!lockedStep.columnMerge.openPanel && (
                        <FormGroup>
                          <FormControlLabel
                            control={<Switch checked={state.showSelections} />}
                            onChange={handleToggleShowSelection}
                            label="Show selections"
                          />
                        </FormGroup>
                      )}
                      <Button color="primary" variant="outlined" size="small" onClick={handleTogglePanel}>
                        {lockedStep.columnMerge.openPanel
                          ? "Close section"
                          : "Change selections"}
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
            {!lockedStep.columnMerge.openPanel && state.showSelections ? (
              <>
                {/*  Column to merge */}
                {Object.entries(state.selectedAnalyticsOutput).length !== 0 && (
                  <>
                    <Grid item xs={12}>
                      <Grid container spacing={1} alignItems="center">
                        <Grid item>
                          <Typography>Merged column: </Typography>
                        </Grid>
                        <Grid item>
                          <Chip label={state.selectedAnalyticsOutput.title} />
                        </Grid>
                      </Grid>
                    </Grid>
                  </>
                )}
                {/*  Preview data */}
                {Object.entries(indicatorRef.analyzedData).length !== 0 && (
                  <Grid item xs={12}>
                    <MergedDataTable state={state} />
                  </Grid>
                )}
              </>
            ) : undefined}
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            {indicatorRef.indicators.length > 1 && (
              <>
                {Object.entries(state.indicatorsToAnalyze.analyticsOutputs)
                  .length !== 0 ? (
                  <Grid item xs={12} md={6}>
                    <ColumnToMerge state={state} setState={setState} />
                  </Grid>
                ) : (
                  <Grid item xs={12}>
                    <Skeleton variant="rectangular" height={50} width="100%" />
                  </Grid>
                )}
                {state.indicatorsToAnalyze.indicators.length > 1 ? (
                  <Grid item xs={12}>
                    <Grid container spacing={1}>
                      {state.indicatorsToAnalyze.indicators.map((indicator) => {
                        return (
                          <Grid
                            item
                            xs={12}
                            md={6}
                            sx={{ display: "flex", alignItems: "stretch" }}
                          >
                            <MergeCard
                              key={indicator.id}
                              indicator={indicator}
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Grid>
                ) : (
                  <Grid item xs={12}>
                    <Skeleton variant="rectangular" height={200} width="100%" />
                  </Grid>
                )}
                <Grid item xs={12} sx={{ pb: 1 }}>
                  <Divider />
                </Grid>
              </>
            )}
            {state.loadingPreview ? (
              <Grid item xs={12}>
                <Skeleton variant="rectangular" height={200} width="100%" />
              </Grid>
            ) : (
              Object.entries(indicatorRef.analyzedData).length > 0 && (
                <Grid item xs={12}>
                  <MergedDataTable state={state} />
                </Grid>
              )
            )}
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Grid container spacing={2}>
            <Grid item xs>
              <LoadingButton
                loading={state.loadingPreview}
                loadingIndicator="Loading…"
                variant="contained"
                fullWidth
                disabled={
                  !Object.entries(indicatorRef.columnToMerge).length ||
                  indicatorRef.indicators.length <= 1
                }
                onClick={handlePreviewAnalyzedData}
              >
                Preview data
              </LoadingButton>
            </Grid>
            <Grid item xs>
              <Button
                variant="contained"
                fullWidth
                disabled={
                  !Object.entries(indicatorRef.columnToMerge).length ||
                  indicatorRef.indicators.length <= 1 ||
                  !Object.entries(indicatorRef.analyzedData).length
                }
                onClick={handleUnlockVisualization}
              >
                Next
              </Button>
            </Grid>
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default ColumnMerge;
