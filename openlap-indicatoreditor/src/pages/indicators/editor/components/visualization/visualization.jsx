import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Typography,
  Skeleton,
  Grow,
} from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import VisualizationLibrary from "./components/library.jsx";
import VisualizationType from "./components/type.jsx";
import Inputs from "./components/inputs.jsx";
import { LoadingButton } from "@mui/lab";
import { useSnackbar } from "notistack";

const Visualization = ({
  lockedStep,
  setLockedStep,
  visRef,
  generate,
  setChartConfiguration,
  setVisRef,
  analyzedData,
  setIndicator,
  setGenerate,
  handlePreview,
}) => {
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
  const { enqueueSnackbar } = useSnackbar();

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
    setState((prevState) => ({
      ...prevState,
      loadingPreview: true,
    }));
    setIndicator((prevState) => ({
      ...prevState,
      previewData: {
        displayCode: [],
        scriptData: "",
      },
    }));
    handlePreview()
      .then((previewResponse) => {
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
        setLockedStep((prevState) => ({
          ...prevState,
          finalize: {
            ...prevState.finalize,
            locked: false,
            openPanel: true,
          },
        }));
        setGenerate(true);
        enqueueSnackbar(previewResponse.message, { variant: "success" });
      })
      .catch((error) => {
        enqueueSnackbar(error.response.data.message, { variant: "error" });
        setState((prevState) => ({
          ...prevState,
          loadingPreview: false,
        }));
      });
  };

  return (
    <>
      <Accordion
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
                    {!lockedStep.visualization.locked &&
                      !lockedStep.visualization.openPanel && (
                        <>
                          <Grid item>
                            <Tooltip title="Edit visualization selection">
                              <IconButton onClick={handleTogglePanel}>
                                <EditIcon color="primary" />
                              </IconButton>
                            </Tooltip>
                          </Grid>

                          <Grid item>
                            <Tooltip
                              title={
                                !state.showSelections
                                  ? "Show summary"
                                  : "Hide summary"
                              }
                            >
                              <IconButton onClick={handleToggleShowSelection}>
                                {!state.showSelections ? (
                                  <VisibilityIcon color="primary" />
                                ) : (
                                  <VisibilityOffIcon color="primary" />
                                )}
                              </IconButton>
                            </Tooltip>
                          </Grid>
                        </>
                      )}
                  </Grid>
                </Grid>
                {!lockedStep.visualization.locked &&
                  lockedStep.visualization.openPanel && (
                    <Grid item>
                      <Tooltip title="Close panel">
                        <IconButton onClick={handleTogglePanel}>
                          <CloseIcon color="primary" />
                        </IconButton>
                      </Tooltip>
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
              <VisualizationLibrary
                state={state}
                setState={setState}
                visRef={visRef}
                setVisRef={setVisRef}
                setIndicator={setIndicator}
                setGenerate={setGenerate}
              />
            </Grid>
            <Grow in={visRef.visualizationLibraryId.length > 0} unmountOnExit>
              {state.typeList.length > 0 ? (
                <Grid item xs={12}>
                  <VisualizationType
                    state={state}
                    setState={setState}
                    visRef={visRef}
                    setVisRef={setVisRef}
                    setIndicator={setIndicator}
                    setGenerate={setGenerate}
                    setChartConfiguration={setChartConfiguration}
                  />
                </Grid>
              ) : (
                <Grid item xs={12}>
                  <Skeleton variant="rectangular" height={118} />
                </Grid>
              )}
            </Grow>
            <Grow in={visRef.visualizationTypeId.length > 0} unmountOnExit>
              {state.inputs.length > 0 ? (
                <Grid item xs={12}>
                  <Inputs
                    state={state}
                    setState={setState}
                    visRef={visRef}
                    setVisRef={setVisRef}
                    analyzedData={analyzedData}
                  />
                </Grid>
              ) : (
                <Grid item xs={12}>
                  <Skeleton variant="rectangular" height={118} />
                </Grid>
              )}
            </Grow>
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Grid container justifyContent="center">
            <Grid item xs={12} md={6}>
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
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Visualization;
