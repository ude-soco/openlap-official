import { useEffect, useState, useContext } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionActions,
  Chip,
  Button,
  AccordionDetails,
  Grid,
  Typography,
  Paper,
  FormGroup,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { SelectionContext } from "../../selection-panel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AnalyticsTechnique from "./components/analytics-technique";
import Inputs from "./components/inputs";
import Params from "./components/params";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { fetchAnalyzedData } from "./utils/analytics-api";
import AnalyzedDataTable from "./components/analyzed-data-table";

// const [analysisRef, setAnalysisRef] = useState({
//   analyticsTechniqueId: "",
//   analyticsTechniqueParams: [],
//   analyticsTechniqueMapping: {
//     mappings: [],
//   },
// });

const Analysis = () => {
  const { api } = useContext(AuthContext);
  const {
    indicatorQuery,
    lockedStep,
    setLockedStep,
    analysisRef,
    setAnalysisRef,
  } = useContext(SelectionContext);
  const [state, setState] = useState({
    openPanel: false,
    showSelections: true,
    techniqueList: [],
    inputs: [],
    parameters: [],
    autoCompleteValue: null,
  });

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !lockedStep.analysis,
    }));
  }, [lockedStep.analysis]);

  const handleTogglePanel = () => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !prevState.openPanel,
    }));
  };

  const handletoggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handlePreviewAnalyzedData = () => {
    const loadAnalyzedData = async (api, indicatorQuery, analysisRef) => {
      try {
        let analyzedDataResponse = await fetchAnalyzedData(
          api,
          indicatorQuery,
          analysisRef
        );
        setAnalysisRef((prevState) => ({
          ...prevState,
          analyzedData: analyzedDataResponse,
        }));
      } catch (error) {
        console.log("Error analyzing the data");
      }
    };

    loadAnalyzedData(api, indicatorQuery, analysisRef);
  };

  const handleUnlockAnalysis = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: false,
    }));
  };

  return (
    <>
      <Accordion
        sx={{ mb: 1 }}
        expanded={state.openPanel}
        disabled={lockedStep.analysis}
      >
        <AccordionSummary aria-controls="panel3-content" id="panel3-header">
          <Grid container spacing={1}>
            {/* Label */}
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
                      {!lockedStep.analysis ? (
                        <Chip label="3" color="primary" />
                      ) : (
                        <IconButton size="small">
                          <LockIcon />
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>Analysis</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                <Grid container>
                    {!state.openPanel && (
                      <FormGroup>
                        <FormControlLabel
                          control={<Switch checked={state.showSelections} />}
                          onChange={handletoggleShowSelection}
                          label="Show selections"
                        />
                      </FormGroup>
                    )}
                    <Button
                      size="small"
                      color="primary"
                      onClick={handleTogglePanel}
                    >
                      {state.openPanel ? "Close section" : "CHANGE"}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            {!state.openPanel && state.showSelections && (
              <>
                {/* Analytics Technique */}
                {analysisRef.analyticsTechniqueId.length > 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Technique:</Typography>
                      </Grid>
                      <Grid item xs>
                        <Grid container spacing={1}>
                          {state.techniqueList?.map((technique, index) => {
                            if (
                              technique.id === analysisRef.analyticsTechniqueId
                            ) {
                              return (
                                <Grid item key={index}>
                                  <Chip label={technique.name} />
                                </Grid>
                              );
                            }
                            return undefined;
                          })}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Analysis inputs */}
                {analysisRef.analyticsTechniqueMapping.mapping.length > 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Inputs:</Typography>
                      </Grid>
                      <Grid item xs>
                        <Grid container spacing={1}>
                          {analysisRef.analyticsTechniqueMapping.mapping.map(
                            (mapping, index) => (
                              <Grid item key={index}>
                                <Chip
                                  label={`${mapping.inputPort.title}: ${mapping.outputPort.title}`}
                                />
                              </Grid>
                            )
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Parameters */}
                {analysisRef.analyticsTechniqueParams.length > 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Parameters:</Typography>
                      </Grid>
                      <Grid item xs>
                        <Grid container spacing={1}>
                          {analysisRef.analyticsTechniqueParams?.map(
                            (param, index) => (
                              <Grid item key={index}>
                                <Chip
                                  label={`${param.title}: ${param.value}`}
                                />
                              </Grid>
                            )
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Outputs */}
                {Object.entries(analysisRef.analyzedData).length !== 0 && (
                  <Grid item xs={12}>
                    <AnalyzedDataTable />
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <AnalyticsTechnique state={state} setState={setState} />
            </Grid>
            {analysisRef.analyticsTechniqueId.length !== 0 && (
              <Grid item xs={12}>
                <Inputs state={state} setState={setState} />
              </Grid>
            )}
            {analysisRef.analyticsTechniqueId.length !== 0 && (
              <Grid item xs={12}>
                <Params state={state} setState={setState} />
              </Grid>
            )}
            {Object.entries(analysisRef.analyzedData).length !== 0 && (
              <Grid item xs={12}>
                <AnalyzedDataTable />
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Grid container spacing={2}>
            <Grid item xs>
              <Button
                variant="contained"
                fullWidth
                // disabled={
                //   !indicatorQuery.activityTypes.length ||
                //   !Object.entries(indicatorQuery.activities).length ||
                //   !indicatorQuery.actionOnActivities.length
                // }
                onClick={handlePreviewAnalyzedData}
              >
                Preview data
              </Button>
            </Grid>
            <Grid item xs>
              <Button
                variant="contained"
                fullWidth
                // disabled={
                //   !indicatorQuery.activityTypes.length ||
                //   !Object.entries(indicatorQuery.activities).length ||
                //   !indicatorQuery.actionOnActivities.length
                // }
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

export default Analysis;
