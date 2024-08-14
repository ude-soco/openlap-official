import React, { useContext, useEffect, useState } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  FormControlLabel,
  FormGroup,
  Grid,
  Switch,
  Typography,
} from "@mui/material";
import { MultiLevelAnalysisIndicatorContext } from "../../../multi-level-analysis-indicator.jsx";
import { requestCompatibleColumnsToMerge } from "./utils/column-merge-api.js";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useSnackbar } from "notistack";

const ColumnMerge = () => {
  const { api } = useContext(AuthContext);
  const { lockedStep, setLockedStep, indicatorRef } = useContext(
    MultiLevelAnalysisIndicatorContext,
  );
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({
    showSelections: true,
    loadingIndicators: false,
    indicatorsToMerge: [],
  });

  useEffect(() => {
    const loadCompatibleColumns = async (api, indicators) => {
      try {
        return await requestCompatibleColumnsToMerge(api, indicators);
      } catch (error) {
        throw error;
      }
    };
    if (indicatorRef.indicators.length > 1) {
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
          enqueueSnackbar(response.message, {
            variant: "success",
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
    }
  }, [indicatorRef.indicators.length]);

  console.log(state.indicatorsToMerge);

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

  return (
    <>
      <Accordion sx={{ mb: 1 }} expanded={lockedStep.columnMerge.openPanel}>
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
                      <Chip label="2" color="primary" />
                    </Grid>
                    <Grid item>
                      <Typography>Column to merge</Typography>
                    </Grid>
                  </Grid>
                </Grid>
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
                    <Button color="primary" onClick={handleTogglePanel}>
                      {lockedStep.columnMerge.openPanel
                        ? "Close section"
                        : "CHANGE"}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            {!lockedStep.indicators.openPanel && state.showSelections ? (
              <>
                {/*{state.selectedIndicators.length !== 0 && (*/}
                {/*  <Grid item xs={12}>*/}
                {/*    <Grid container spacing={1} alignItems="center">*/}
                {/*      <Grid item>*/}
                {/*        <Typography>Selected indicators:</Typography>*/}
                {/*      </Grid>*/}
                {/*      <Grid item>*/}
                {/*        <Grid container spacing={1}>*/}
                {/*          {state.selectedIndicators.map((indicator, index) => (*/}
                {/*            <Grid item key={index}>*/}
                {/*              <Chip label={indicator.name} />*/}
                {/*            </Grid>*/}
                {/*          ))}*/}
                {/*        </Grid>*/}
                {/*      </Grid>*/}
                {/*    </Grid>*/}
                {/*  </Grid>*/}
                {/*)}*/}
              </>
            ) : undefined}
          </Grid>
        </AccordionSummary>

        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {/*<IndicatorList state={state} setState={setState} />*/}
            </Grid>
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Button
            variant="contained"
            fullWidth
            // disabled={
            //   !Object.entries(indicatorRef.columnToMerge).length ||
            //   indicatorRef.indicators.length <= 1 ||
            //   !Object.entries(indicatorRef.analyzedData).length
            // }
            // onClick={handleUnlockColumnMerge}
          >
            Next
          </Button>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default ColumnMerge;
