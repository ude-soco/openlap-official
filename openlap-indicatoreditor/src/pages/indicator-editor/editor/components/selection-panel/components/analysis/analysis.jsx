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
} from "@mui/material";
import { SelectionContext } from "../../selection-panel";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import AnalyticsTechnique from "./components/analytics-technique";
import Inputs from "./components/inputs";

// const [analysisRef, setAnalysisRef] = useState({
//   analyticsTechniqueId: "",
//   analyticsTechniqueParams: [],
//   analyticsTechniqueMapping: {
//     mappings: [],
//   },
// });

const Analysis = () => {
  const { indicatorQuery, lockedStep, analysisRef, setAnalysisRef } =
    useContext(SelectionContext);
  const [state, setState] = useState({
    openPanel: true,
    techniqueList: [],
    inputs: [],
    paramters: [],
    autoCompleteValue: null,
  });

  const handleTogglePanel = () => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !prevState.openPanel,
    }));
  };

  return (
    <>
      <Accordion
        sx={{ mb: 1 }}
        expanded={state.openPanel}
        onChange={handleTogglePanel}
        disabled={lockedStep.analysis}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel3-content"
          id="panel3-header"
        >
          <Grid container spacing={1}>
            {/* Label */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  {!lockedStep.filters ? (
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
            {!state.openPanel && (
              <>
                {/* Analytics Technique */}
                {analysisRef.analyticsTechniqueId.length && (
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
                                  <Chip
                                    label={state.techniqueList.filter(
                                      (technique) =>
                                        analysisRef.analyticsTechniqueId
                                    )}
                                  />
                                </Grid>
                              );
                            }
                          })}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Analysis inputs */}
                {/* <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography>Inputs:</Typography>
                </Grid>
                <Grid item md>
                  <Grid container spacing={1}>
                    <Tooltip title="Activities (Items)" arrow>
                      <Grid item>
                        <Chip label="Activities" />
                      </Grid>
                    </Tooltip>
                    <Tooltip title="Users (Users)" arrow>
                      <Grid item>
                        <Chip label="Users" />
                      </Grid>
                    </Tooltip>
                  </Grid>
                </Grid>
              </Grid>
            </Grid> */}

                {/* Parameters */}
                {/* <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Typography>Parameters:</Typography>
                </Grid>
                <Grid item md>
                  <Grid container spacing={1}>
                    <Tooltip title="Most Occuring (Counting direction)" arrow>
                      <Grid item>
                        <Chip label="Most Occuring" />
                      </Grid>
                    </Tooltip>
                    <Tooltip title="All Items (Counting Type)" arrow>
                      <Grid item>
                        <Chip label="All Items" />
                      </Grid>
                    </Tooltip>
                    <Tooltip title="10 (Number of Items to Return (N))" arrow>
                      <Grid item>
                        <Chip label="10" />
                      </Grid>
                    </Tooltip>
                  </Grid>
                </Grid>
              </Grid>
            </Grid> */}
              </>
            )}
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <AnalyticsTechnique state={state} setState={setState} />
            </Grid>
            <Grid item xs={12}>
              {analysisRef.analyticsTechniqueId.length !== 0 && (
                <Inputs state={state} setState={setState} />
              )}
            </Grid>
            <Grid item xs={12}>
              <Typography>Choose Params</Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Grid container>
            <Button
              variant="contained"
              fullWidth
              // disabled={
              //   !indicatorQuery.activityTypes.length ||
              //   !Object.entries(indicatorQuery.activities).length ||
              //   !indicatorQuery.actionOnActivities.length
              // }
              // onClick={handleUnlockAnalysis}
            >
              Next
            </Button>
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Analysis;
