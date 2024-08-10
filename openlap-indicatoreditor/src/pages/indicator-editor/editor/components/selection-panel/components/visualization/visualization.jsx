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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { SelectionContext } from "../../selection-panel";
import VisualizationLibrary from "./components/library";
import VisualizationType from "./components/type";
import Inputs from "./components/inputs";

const Visualization = () => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, lockedStep, visRef, setVisRef } =
    useContext(SelectionContext);
  const [state, setState] = useState({
    openPanel: false,
    libraryList: [],
    typeList: [],
    inputs: [],
    autoCompleteValue: null,
  });

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !lockedStep.visualization,
    }));
  }, [lockedStep.visualization]);

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
        disabled={lockedStep.visualization}
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
                      {!lockedStep.visualization ? (
                        <Chip label="4" color="primary" />
                      ) : (
                        <IconButton size="small">
                          <LockIcon />
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>Visualization</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
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

            {!state.openPanel && (
              <>
                {/* Visualization Library */}
                <Grid item xs={12}>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      <Typography>Library:</Typography>
                    </Grid>
                    <Grid item md>
                      <Grid container spacing={1}>
                        <Grid item>
                          <Chip label="C3.js" />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Visualization Type */}
                <Grid item xs={12}>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      <Typography>Type:</Typography>
                    </Grid>
                    <Grid item md>
                      <Grid container spacing={1}>
                        <Grid item>
                          <Chip label="Bar Chart" />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Visualization Inputs */}
                <Grid item xs={12}>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item>
                      <Typography>Inputs:</Typography>
                    </Grid>
                    <Grid item md>
                      <Grid container spacing={1}>
                        <Grid item>
                          <Chip label="Item names (X-Axis)" />
                        </Grid>
                        <Grid item>
                          <Chip label="Item count (Y-Axis)" />
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </>
            )}
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <VisualizationLibrary state={state} setState={setState} />
            </Grid>
            {visRef.visualizationLibraryId.length > 0 && (
              <Grid item xs={12}>
                <VisualizationType state={state} setState={setState} />
              </Grid>
            )}
            {visRef.visualizationTypeId.length > 0 && (
              <Grid item xs={12}>
                <Inputs state={state} setState={setState} />
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Button>Cancel</Button>
          <Button>Agree</Button>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Visualization;
