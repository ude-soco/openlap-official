import React, { useContext, useState } from "react";
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
import { AuthContext } from "../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { CompositeIndicatorContext } from "../composite-indicator.jsx";
import IndicatorList from "./components/indicator-list.jsx";
import CompatibleIndicatorList from "./components/compatible-indicator-list.jsx";
import ColumnToMerge from "../../basic-indicator/selection-panel/components/filters/components/column-to-merge.jsx";
import { LoadingButton } from "@mui/lab";
import { requestMergeIndicatorData } from "./utils/selection-api.js";
import MergedDataTable from "./components/merged-data-table.jsx";
import MergeCard from "./components/merge-card.jsx";

const SelectIndicator = () => {
  const { api } = useContext(AuthContext);
  const { lockedStep, setLockedStep, indicatorRef, setIndicatorRef } =
    useContext(CompositeIndicatorContext);
  const [state, setState] = useState({
    showSelections: true,
    params: {
      page: 0,
    },
    allIndicators: {
      content: [],
      totalPages: 1,
    },
    selectedIndicator: [],
    compatibleIndicatorParams: {
      page: 0,
    },
    compatibleIndicators: {
      content: [
        {
          indicators: [],
          analyticsTechnique: {},
          analyticsOutputs: [],
        },
      ],
    },
    selectedCompatibleIndicators: [],
    selectedAnalyticsOutput: {},
    loadingCompatibleIndicators: false,
    loadingPreview: false,
  });

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      indicators: {
        ...prevState.indicators,
        openPanel: !prevState.indicators.openPanel,
      },
    }));
  };

  const handleToggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handlePreviewAnalyzedData = () => {
    setState((prevState) => ({
      ...prevState,
      loadingPreview: true,
      analyzedData: {},
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
        setState((prevState) => ({
          ...prevState,
          loadingPreview: false,
          analyzedData: {},
        }));
      });
  };

  const handleUnlockVisualization = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: {
        ...prevState.visualization,
        locked: false,
        openPanel: true,
      },
    }));
  };

  return (
    <>
      <Accordion sx={{ mb: 1 }} expanded={lockedStep.indicators.openPanel}>
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
                      <Chip label="1" color="primary" />
                    </Grid>
                    <Grid item>
                      <Typography>Combine indicators</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                  <Grid container>
                    {!lockedStep.indicators.openPanel && (
                      <FormGroup>
                        <FormControlLabel
                          control={<Switch checked={state.showSelections} />}
                          onChange={handleToggleShowSelection}
                          label="Show selections"
                        />
                      </FormGroup>
                    )}
                    <Button color="primary" onClick={handleTogglePanel}>
                      {lockedStep.indicators.openPanel
                        ? "Close section"
                        : "CHANGE"}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            {!lockedStep.indicators.openPanel && state.showSelections ? (
              <>
                {state.selectedIndicator.length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Selected indicator:</Typography>
                      </Grid>
                      <Grid item>
                        <Chip label={state.selectedIndicator[0].name} />
                      </Grid>
                    </Grid>
                  </Grid>
                )}
                {state.selectedCompatibleIndicators.length !== 0 && (
                  <Grid item xs={12}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item>
                        <Typography>
                          Select compatible indicator(s):{" "}
                        </Typography>
                      </Grid>
                      <Grid item>
                        <Grid container spacing={1}>
                          {state.selectedCompatibleIndicators.map(
                            (indicator, index) => (
                              <Grid item key={index}>
                                <Chip label={indicator.name} />
                              </Grid>
                            ),
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
                {Boolean(
                  state.compatibleIndicators.content[0].analyticsTechnique.name,
                ) && (
                  <>
                    <Grid item xs={12}>
                      <Grid container spacing={1} alignItems="center">
                        <Grid item>
                          <Typography>Shared analysis technique: </Typography>
                        </Grid>
                        <Grid item>
                          <Chip
                            label={
                              state.compatibleIndicators.content[0]
                                .analyticsTechnique.name
                            }
                          />
                        </Grid>
                      </Grid>
                    </Grid>
                  </>
                )}
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
            <Grid item xs={12}>
              <IndicatorList state={state} setState={setState} />
            </Grid>

            {state.selectedIndicator.length !== 0 && (
              <Grid item xs={12}>
                <CompatibleIndicatorList state={state} setState={setState} />
              </Grid>
            )}

            {state.selectedCompatibleIndicators.length > 0 && (
              <>
                <Grid item xs={12} md={6}>
                  <ColumnToMerge state={state} setState={setState} />
                </Grid>
                <Grid item xs={12}>
                  <Grid container spacing={1}>
                    {[
                      ...state.selectedIndicator,
                      ...state.selectedCompatibleIndicators,
                    ].map((indicator, index) => {
                      return (
                        <Grid
                          item
                          xs={12}
                          md={6}
                          sx={{ display: "flex", alignItems: "stretch" }}
                        >
                          <MergeCard key={index} indicator={indicator} />
                        </Grid>
                      );
                    })}
                  </Grid>
                </Grid>
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

export default SelectIndicator;
