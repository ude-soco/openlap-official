import React, { useContext, useEffect, useState } from "react";
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
import { MultiLevelAnalysisIndicatorContext } from "../../../multi-level-analysis-indicator.jsx";
import {
  requestCompatibleColumnsToMerge,
  requestMergeIndicatorsToPreviewData,
} from "./utils/column-merge-api.js";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useSnackbar } from "notistack";
import MergeCard from "./merge-card.jsx";
import AnalyzedDataTable from "../../../../components/analyzed-data-table/analyzed-data-table.jsx";
import { LoadingButton } from "@mui/lab";
import IconButton from "@mui/material/IconButton";
import LockIcon from "@mui/icons-material/Lock";

const ColumnMerge = () => {
  const { api } = useContext(AuthContext);
  const { lockedStep, setLockedStep, indicatorRef, setIndicatorRef } =
    useContext(MultiLevelAnalysisIndicatorContext);
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({
    showSelections: true,
    loadingIndicators: false,
    indicatorsToMerge: [],
    loadingPreview: false,
  });

  useEffect(() => {
    const loadCompatibleColumns = async (api, indicators) => {
      try {
        return await requestCompatibleColumnsToMerge(api, indicators);
      } catch (error) {
        throw error;
      }
    };
    if (indicatorRef.indicators.length > 0) {
      setState((prevState) => ({
        ...prevState,
        loadingIndicators: true,
      }));
      loadCompatibleColumns(api, indicatorRef.indicators)
        .then((response) => {
          setState((prevState) => ({
            ...prevState,
            loadingIndicators: false,
            indicatorsToMerge: response.data,
          }));
          setIndicatorRef((prevState) => {
            let tempIndicators = [...prevState.indicators];
            for (let indicator of tempIndicators) {
              let correspondingData = response.data.find(
                (item) => item.indicatorId === indicator.indicatorId
              );
              if (
                correspondingData &&
                correspondingData.columnsToMerge.length === 1
              ) {
                indicator.columnToMerge = correspondingData.columnsToMerge[0];
              }
            }
            return {
              ...prevState,
              indicators: tempIndicators,
            };
          });
        })
        .catch((error) => {
          enqueueSnackbar(error.response.message, {
            variant: "error",
          });
          setState((prevState) => ({
            ...prevState,
            loadingIndicators: false,
          }));
        });
    } else if (indicatorRef.indicators.length === 0) {
      setLockedStep((prevState) => ({
        ...prevState,
        columnMerge: {
          locked: true,
          openPanel: false,
        },
      }));
      setState((prevState) => ({
        ...prevState,
        indicatorsToMerge: [],
      }));
    }
  }, [indicatorRef.indicators.length]);

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

  const handlePreviewMergeData = () => {
    const loadMergePreviewData = async (api, indicators) => {
      try {
        return await requestMergeIndicatorsToPreviewData(api, indicators);
      } catch (error) {
        throw error;
      }
    };

    setState((prevState) => ({
      ...prevState,
      loadingPreview: true,
    }));
    loadMergePreviewData(api, indicatorRef.indicators)
      .then((response) => {
        setState((prevState) => ({
          ...prevState,
          loadingPreview: false,
        }));
        setIndicatorRef((prevState) => ({
          ...prevState,
          mergedData: response.data.mergedData.columns,
        }));
      })
      .catch((error) => {
        setState((prevState) => ({
          ...prevState,
          loadingPreview: false,
        }));
        enqueueSnackbar(error.data.message, {
          variant: "error",
        });
      });
  };

  const handleUnlockAnalysis = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      analysis: {
        locked: false,
        openPanel: true,
      },
    }));
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
                      <Button
                        color="primary"
                        variant="outlined"
                        size="small"
                        onClick={handleTogglePanel}
                      >
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
                {Object.entries(indicatorRef.mergedData).length > 0 && (
                  <Grid item xs={12}>
                    <AnalyzedDataTable analyzedData={indicatorRef.mergedData} />
                  </Grid>
                )}
              </>
            ) : undefined}
          </Grid>
        </AccordionSummary>

        <AccordionDetails>
          <Grid container spacing={3}>
            {state.loadingIndicators ? (
              Array.from({ length: 2 }).map((_, index) => (
                <Grid
                  item
                  xs={12}
                  lg={6}
                  key={index}
                  sx={{ display: "flex", alignItems: "stretch" }}
                >
                  <Skeleton variant="rectangular" height={300} width="100%" />
                </Grid>
              ))
            ) : state.indicatorsToMerge.length !== 0 ? (
              <>
                {state.indicatorsToMerge.map((indicator) => {
                  return (
                    <Grid
                      item
                      xs={6}
                      key={indicator.id}
                      sx={{ display: "flex", alignItems: "stretch" }}
                    >
                      <MergeCard
                        indicator={indicator}
                        columnsToMerge={indicator.columnsToMerge}
                        analyzedData={indicator.analyzedDataset.columns}
                      />
                    </Grid>
                  );
                })}
              </>
            ) : (
              <Grid item xs={12}>
                <Typography>
                  Merge not possible. Choose other indicators.
                </Typography>
              </Grid>
            )}

            <Grid item xs={12}>
              <Divider />
            </Grid>
            {state.loadingPreview ? (
              <Grid item xs={12}>
                <Skeleton variant="rectangular" height={200} width="100%" />
              </Grid>
            ) : (
              Object.entries(indicatorRef.mergedData).length > 0 && (
                <Grid item xs={12}>
                  <AnalyzedDataTable analyzedData={indicatorRef.mergedData} />
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
                  state.indicatorsToMerge.length <= 1 ||
                  !indicatorRef.indicators.every((indicator) =>
                    indicator.hasOwnProperty("columnToMerge")
                  )
                }
                onClick={handlePreviewMergeData}
              >
                Preview data
              </LoadingButton>
            </Grid>
            <Grid item xs>
              <Button
                variant="contained"
                fullWidth
                disabled={
                  indicatorRef.indicators.length <= 1 ||
                  !Object.entries(indicatorRef.mergedData).length ||
                  indicatorRef.mergedData[
                    Object.keys(indicatorRef.mergedData)[0]
                  ].data.length === 0
                }
                onClick={handleUnlockAnalysis}
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
