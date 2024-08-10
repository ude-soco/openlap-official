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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { SelectionContext } from "../../selection-panel";
import VisualizationLibrary from "./components/library";
import VisualizationType from "./components/type";
import Inputs from "./components/inputs";
import { fetchPreviewVisualization } from "./utils/visualization-api";
import { IndicatoEditorContext } from "../../../../indicator-editor";

const Visualization = () => {
  const { indicator, setIndicator } = useContext(IndicatoEditorContext);
  const { api } = useContext(AuthContext);
  const { indicatorQuery, lockedStep, analysisRef, visRef, setVisRef } =
    useContext(SelectionContext);
  const [state, setState] = useState({
    openPanel: false,
    showSelections: true,
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

  const handletoggleShowSelection = () => {
    setState((prevState) => ({
      ...prevState,
      showSelections: !prevState.showSelections,
    }));
  };

  const handleGeneratePreview = () => {
    const loadPreviewVisualization = async (
      api,
      indicatorQuery,
      analysisRef,
      visRef
    ) => {
      try {
        let previewResponse = await fetchPreviewVisualization(
          api,
          indicatorQuery,
          analysisRef,
          visRef
        );

        setIndicator((prevState) => ({
          ...prevState,
          previewData: previewResponse,
        }));
      } catch (error) {
        console.log("Error analyzing the data");
      }
    };

    loadPreviewVisualization(api, indicatorQuery, analysisRef, visRef);
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
                {!lockedStep.visualization && (
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
                      <Button color="primary" onClick={handleTogglePanel}>
                        {state.openPanel ? "Close section" : "CHANGE"}
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>

            {!state.openPanel && state.showSelections && (
              <>
                {/* Visualization Library */}
                {visRef.visualizationLibraryId.length > 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Library:</Typography>
                      </Grid>
                      <Grid item xs>
                        <Grid container spacing={1}>
                          {state.libraryList?.map((library, index) => {
                            if (library.id === visRef.visualizationLibraryId) {
                              return (
                                <Grid item key={index}>
                                  <Chip label={library.name} />
                                </Grid>
                              );
                            }
                          })}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}
                {/* Visualization Type */}
                {visRef.visualizationTypeId.length > 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Type:</Typography>
                      </Grid>
                      <Grid item md>
                        <Grid container spacing={1}>
                          {state.typeList?.map((type, index) => {
                            if (type.id === visRef.visualizationTypeId) {
                              return (
                                <Grid item key={index}>
                                  <Chip label={type.name} />
                                </Grid>
                              );
                            }
                          })}
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                )}

                {/* Visualization Inputs */}
                {visRef.visualizationMapping.mapping.length > 0 && (
                  <Grid item xs={12}>
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item>
                        <Typography>Inputs:</Typography>
                      </Grid>
                      <Grid item md>
                        <Grid container spacing={1}>
                          {visRef.visualizationMapping.mapping.map(
                            (mapping, index) => (
                              <Grid item>
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
          <Grid container>
            <Button
              variant="contained"
              fullWidth
              // disabled={
              //   !indicatorQuery.lrsStores.length ||
              //   !indicatorQuery.platforms.length
              // }
              onClick={handleGeneratePreview}
            >
              Generate Preview
            </Button>
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Visualization;
