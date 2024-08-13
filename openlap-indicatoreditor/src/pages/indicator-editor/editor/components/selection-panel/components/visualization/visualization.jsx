import {useContext, useEffect, useState} from "react";
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
import LockIcon from "@mui/icons-material/Lock";
import IconButton from "@mui/material/IconButton";
import {AuthContext} from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import VisualizationLibrary from "./components/library";
import VisualizationType from "./components/type";
import Inputs from "./components/inputs";
import {fetchPreviewVisualization} from "./utils/visualization-api";
import {BasicIndicatorContext} from "../../../basic-indicator.jsx";
import {LoadingButton} from "@mui/lab";
import {useSnackbar} from "notistack";

const Visualization = () => {
  const {
    indicatorQuery,
    lockedStep,
    analysisRef,
    visRef,
    setLockedStep,
    indicator,
    setIndicator,
  } = useContext(BasicIndicatorContext);
  const {api} = useContext(AuthContext);
  const [state, setState] = useState(() => {
    const savedState = sessionStorage.getItem("visualization");
    return savedState
      ? JSON.parse(savedState)
      : {
        showSelections: true,
        libraryList: [],
        typeList: [],
        inputs: [],
        autoCompleteValue: null,
        loadingPreview: false,
      };
  });
  const {enqueueSnackbar} = useSnackbar();

  useEffect(() => {
    sessionStorage.setItem("visualization", JSON.stringify(state));
  }, [state]);

  const handleTogglePanel = () => {
    setLockedStep((prevState) => ({
      ...prevState,
      visualization: {
        ...prevState.visualization,
        openPanel: !prevState.visualization.openPanel,
      },
    }));
  };

  const handleToggleShowSelection = () => {
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
        return await fetchPreviewVisualization(
          api,
          indicatorQuery,
          analysisRef,
          visRef
        );
      } catch (error) {
        setState((prevState) => ({
          ...prevState,
          loadingPreview: false,
        }));
        enqueueSnackbar(error.response.data.message, {variant: "error"});
        console.log("Error analyzing the data");
      }
    };
    setState((prevState) => ({
      ...prevState,
      loadingPreview: true,
    }));
    setIndicator((prevState) => ({
      ...prevState,
      previewData: {
        displayCode: "",
        scriptData: [],
      },
    }));
    loadPreviewVisualization(api, indicatorQuery, analysisRef, visRef).then(previewResponse => {
      setIndicator((prevState) => ({
        ...prevState,
        previewData: {
          ...prevState.previewData,
          displayCode: previewResponse.displayCode,
          scriptData: previewResponse.scriptData,
        },
      }));

      setState((prevState) => ({
        ...prevState,
        loadingPreview: false,
      }));
      enqueueSnackbar(previewResponse.message, {variant: "success"});
    });
  };

  return (
    <>
      <Accordion
        sx={{mb: 1}}
        expanded={lockedStep.visualization.openPanel}
        disabled={lockedStep.visualization.locked}
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
                      {!lockedStep.visualization.locked ? (
                        <Chip label="4" color="primary"/>
                      ) : (
                        <IconButton size="small">
                          <LockIcon/>
                        </IconButton>
                      )}
                    </Grid>
                    <Grid item>
                      <Typography>Visualization</Typography>
                    </Grid>
                  </Grid>
                </Grid>
                {!lockedStep.visualization.locked && (
                  <Grid item>
                    <Grid container>
                      {!lockedStep.visualization.openPanel && (
                        <FormGroup>
                          <FormControlLabel
                            control={<Switch checked={state.showSelections}/>}
                            onChange={handleToggleShowSelection}
                            label="Show selections"
                          />
                        </FormGroup>
                      )}
                      <Button color="primary" onClick={handleTogglePanel}>
                        {lockedStep.visualization.openPanel
                          ? "Close section"
                          : "CHANGE"}
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>

            {!lockedStep.visualization.openPanel && state.showSelections && (
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
                                  <Chip label={library.name}/>
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
                                  <Chip label={type.name}/>
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
              <VisualizationLibrary state={state} setState={setState}/>
            </Grid>
            {visRef.visualizationLibraryId.length > 0 && (
              <Grid item xs={12}>
                <VisualizationType state={state} setState={setState}/>
              </Grid>
            )}
            {visRef.visualizationTypeId.length > 0 && (
              <Grid item xs={12}>
                <Inputs state={state} setState={setState}/>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Grid container>
            <LoadingButton
              loading={state.loadingPreview}
              loadingIndicator="Generating…"
              variant="contained"
              fullWidth
              disabled={
                !visRef.visualizationLibraryId.length ||
                !visRef.visualizationTypeId.length ||
                !visRef.visualizationMapping.mapping.length
              }
              onClick={handleGeneratePreview}
            >
              Generate Preview
            </LoadingButton>
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Visualization;
