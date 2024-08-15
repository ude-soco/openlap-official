import React, { createContext, useContext, useState } from "react";
import {
  Divider,
  Grid,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { useSnackbar } from "notistack";
import PreviewPanel from "../components/preview-panel/preview-panel.jsx";
import SelectionPanel from "./selection-panel/selection-panel.jsx";
import { requestCreateCompositeIndicator } from "../components/preview-panel/utils/preview-api.js";

export const CompositeIndicatorContext = createContext(undefined);

const CompositeIndicator = () => {
  const { api } = useContext(AuthContext);
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("xl"));
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const [indicator, setIndicator] = useState({
    previewData: {
      displayCode: "",
      scriptData: [],
    },
    indicatorName: "",
    type: "COMPOSITE",
  });

  const [indicatorRef, setIndicatorRef] = useState({
    columnToMerge: {},
    indicators: [],
    analyzedData: {},
  });

  const [visRef, setVisRef] = useState({
    visualizationLibraryId: "",
    visualizationTypeId: "",
    visualizationParams: {},
    visualizationMapping: {
      mapping: [],
    },
  });

  const [lockedStep, setLockedStep] = useState({
    indicators: {
      locked: false,
      openPanel: true,
    },
    columnMerge: {
      locked: true,
      openPanel: false,
    },
    visualization: {
      locked: true,
      openPanel: false,
    },
  });

  // TODO: Autosaving feature
  // const prevDependencies = useRef({
  //   indicator,
  //   indicatorRef,
  //   visRef,
  //   lockedStep,
  // });
  //
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     let session = {
  //       indicator,
  //       indicatorRef,
  //       visRef,
  //       lockedStep,
  //     };
  //
  //     sessionStorage.setItem("session", JSON.stringify(session));
  //
  //     // Check if any of the dependencies have changed
  //     if (
  //       prevDependencies.current.indicator !== indicator ||
  //       prevDependencies.current.indicatorRef !== indicatorRef ||
  //       prevDependencies.current.visRef !== visRef ||
  //       prevDependencies.current.visRef !== visRef ||
  //       prevDependencies.current.lockedStep !== lockedStep
  //     ) {
  //       enqueueSnackbar("Autosaved", { variant: "success" });
  //     }
  //
  //     // Update the previous dependencies to the current ones
  //     prevDependencies.current = {
  //       indicator,
  //       indicatorRef,
  //       visRef,
  //       lockedStep,
  //     };
  //   }, 4000);
  //
  //   return () => clearInterval(intervalId);
  // }, [indicator, indicatorRef, visRef, lockedStep]);

  const handleChangeIndicatorName = (event) => {
    const { name, value } = event.target;
    setIndicator((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSaveNewBasicIndicator = () => {
    const loadCreateCompositeIndicator = async (
      api,
      indicator,
      indicatorRef,
      visRef,
    ) => {
      try {
        return await requestCreateCompositeIndicator(
          api,
          indicator,
          indicatorRef,
          visRef,
        );
      } catch (error) {
        console.log("Error analyzing the data");
      }
    };

    loadCreateCompositeIndicator(api, indicator, indicatorRef, visRef).then(
      (response) => {
        enqueueSnackbar(response.message, {
          variant: "success",
        });
        navigate("/indicator");
        clearSession();
      },
    );
  };

  const clearSession = () => {
    sessionStorage.removeItem("visualization");
  };

  return (
    <>
      <CompositeIndicatorContext.Provider
        value={{
          lockedStep,
          indicator,
          setLockedStep,
          setIndicator,
          indicatorRef,
          setIndicatorRef,
          visRef,
          setVisRef,
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Grid container alignItems="center">
              <Grid item>
                <Grid container alignItems="center">
                  <Grid item>
                    <Tooltip
                      arrow
                      title={
                        <Typography variant="body2">
                          Back to Indicator Editor
                        </Typography>
                      }
                    >
                      <IconButton
                        size="small"
                        onClick={() => navigate("/indicator/editor")}
                      >
                        <ArrowBack />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                  <Grid item>
                    <Typography>Back</Typography>
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs>
                <Typography align="center">
                  Composite Indicator Editor
                </Typography>
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12}>
            <Divider />
          </Grid>
          {isSmallScreen ? (
            <>
              <Grid item xs={12} xl={8}>
                <SelectionPanel />
              </Grid>
              <Grid item xs={12} xl={4}>
                <PreviewPanel
                  indicator={indicator}
                  changeIndicatorName={handleChangeIndicatorName}
                  handleSaveIndicator={handleSaveNewBasicIndicator}
                />
              </Grid>
            </>
          ) : (
            <>
              <Grid item xs={12} xl={4}>
                <PreviewPanel
                  indicator={indicator}
                  changeIndicatorName={handleChangeIndicatorName}
                  handleSaveIndicator={handleSaveNewBasicIndicator}
                />
              </Grid>
              <Grid item xs={12} lg={8}>
                <SelectionPanel />
              </Grid>
            </>
          )}
        </Grid>
      </CompositeIndicatorContext.Provider>
    </>
  );
};

export default CompositeIndicator;
