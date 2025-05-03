import { useContext, useEffect, useState } from "react";
import { Box, Tab } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { ElementsBar } from "./components/elements-bar.jsx";
import { StylesBar } from "./components/styles.jsx";
import { FiltersBar } from "./components/filter.jsx";
import { requestBasicIndicatorPreview } from "../../visualization/utils/visualization-api.js";
import { useSnackbar } from "notistack";
import { BasicIndicatorContext } from "../../../basic-indicator/basic-indicator.jsx";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager.jsx";

const ChartCustomization = ({
  indicatorQuery,
  analysisRef,
  chartConfiguration,
  setVisRef,
  setIndicator,
  setLoading,
}) => {
  const { api } = useContext(AuthContext);

  const [value, setvalue] = useState("1");
  const [state, setState] = useState({
    showLegend: true,
    legendPosition: "bottom",
    showXAxis: true,
    showYAxis: true,
    chartTitle: "",
    chartSubtitle: "",
    titleAndSubtitlePosition: "left",
    showLabels: true,
    showLabelsBackground: false,
    labelsPosition: "bottom",
    colorsArray: [
      "#008ffb",
      "#ff5733",
      "#3498db",
      "#2ecc71",
      "#9b59b6",
      "#f1c40f",
      "#e74c3c",
      "#1abc9c",
      "#34495e",
      "#d35400",
      "#95a5a6",
    ],
    dataLabelsForeColor: "#ffffff",
    useSeriesColors: false,
    dataLabelsBgColor: "#000000",
    hiddenCategoriesIndexes: [],
    sortingOrder: "desc",
    edited: false,
  });

  const { enqueueSnackbar } = useSnackbar();

  const handleChange = (e, newValue) => {
    setvalue(newValue);
  };

  // useEffect(() => {
  //   return () => {
  //     localStorage.removeItem("basic_indic_cats");
  //   };
  // }, []);

  const loadPreviewVisualization = async (
    api,
    indicatorQuery,
    analysisRef,
    visRef
  ) => {
    try {
      return await requestBasicIndicatorPreview(
        api,
        indicatorQuery,
        analysisRef,
        visRef
      );
    } catch (error) {
      enqueueSnackbar(error, { variant: "error" });
      console.log("Error analyzing the data");
      throw error;
    }
  };

  // useEffect(() => {}, [indicator]);

  // useEffect(() => {
  //   loadPreviewVisualization(api, indicatorQuery, analysisRef, visRef)
  //     .then((previewResponse) => {
  //       if (previewResponse) {
  //         console.log(previewResponse);

  //         setIndicator((prevState) => ({
  //           ...prevState,
  //           previewData: {
  //             ...prevState.previewData,
  //             displayCode: previewResponse.displayCode,
  //             scriptData: previewResponse.scriptData,
  //           },
  //         }));
  //         setLoading(false);
  //       }

  //       enqueueSnackbar(previewResponse.message, { variant: "success" });
  //     })
  //     .catch((error) => {
  //       enqueueSnackbar(error.response.data.message, { variant: "error" });
  //       setLoading(false);
  //     });
  // }, [visRef]);

  useEffect(() => {
    if (!state.edited) {
      return;
    }
    setLoading(true);

    setIndicator((prevState) => ({
      ...prevState,
      previewData: {
        ...prevState.previewData,
        displayCode: [],
        scriptData: "",
      },
    }));
    setVisRef((prevVisref) => {
      const newVisRef = {
        ...prevVisref,
        visualizationParams: {
          ...prevVisref.visualizationParams,
          ...state,
        },
      };
      loadPreviewVisualization(api, indicatorQuery, analysisRef, newVisRef)
        .then((previewResponse) => {
          if (previewResponse) {
            setIndicator((prevState) => ({
              ...prevState,
              previewData: {
                ...prevState.previewData,
                displayCode: previewResponse.displayCode,
                scriptData: previewResponse.scriptData,
              },
            }));
            setLoading(false);
          }
        })
        .catch((error) => {
          enqueueSnackbar(error.response.data.message, { variant: "error" });
          setLoading(false);
        });
      return newVisRef;
    });
    setState((prevState) => ({
      ...prevState,
      edited: false,
    }));
  }, [state.edited]);

  return (
    <>
      <Box height="100%" sx={{ border: "1px solid #f0f0f0", borderRadius: 2 }}>
        <TabContext value={value}>
          <Box sx={{ borderBottom: 1, borderColor: "divider", width: "100%" }}>
            <TabList
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              onChange={handleChange}
              sx={{ width: "100%" }} // Set width to 100%
            >
              <Tab label="ELEMENTS" value="1" />
              <Tab label="STYLES" value="2" />
              {(chartConfiguration.categoriesFilteringAvailable ||
                chartConfiguration.sortingOrderChangeable) && (
                <Tab label="FILTERS" value="3" />
              )}
            </TabList>
          </Box>
          <Box height="90%" sx={{ overflowY: "scroll" }}>
            <TabPanel value="1">
              <ElementsBar
                state={state}
                setState={setState}
                chartConfiguration={chartConfiguration}
              />
            </TabPanel>
            <TabPanel value="2">
              <StylesBar
                state={state}
                setState={setState}
                categories={analysisRef.analyzedData?.item_name?.data}
                chartConfiguration={chartConfiguration}
              />
            </TabPanel>
            <TabPanel value="3">
              <FiltersBar
                categories={analysisRef.analyzedData?.item_name?.data}
                state={state}
                setState={setState}
                chartConfiguration={chartConfiguration}
              />
            </TabPanel>
          </Box>
        </TabContext>
      </Box>
    </>
  );
};

export default ChartCustomization;
