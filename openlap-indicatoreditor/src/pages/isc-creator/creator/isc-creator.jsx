import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Grid,
  Paper,
  Slide,
  Typography,
} from "@mui/material";
import {
  Dataset as DatasetIcon,
  ExpandMore as ExpandMoreIcon,
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  ScatterPlot as ScatterPlotIcon,
} from "@mui/icons-material";
import VisualizationSelection from "./visualization/visualization-selection.jsx";
import DataSelection from "./data/data-selection.jsx";
import { v4 as uuidv4 } from "uuid";
import CreatorHeader from "./creator-header.jsx";
import ChartList from "./visualization/components/chart-list.jsx";

export default function IscCreator() {
  const [expandVisualization, setExpandVisualization] = useState(true);
  const [expandDataset, setExpandDataset] = useState(true);
  const [dataState, setDataState] = useState(
    JSON.parse(sessionStorage.getItem("openlap-isc-data"))?.indicatorData || {
      rowData: [],
      columnData: [],
      status: false,
    },
  );
  const [openEditor, setOpenEditor] = useState({
    type: "",
    open: false,
    name: "",
  });

  const toggleEditPanel = (type = "", open) => {
    setOpenEditor((prevState) => ({
      ...prevState,
      type,
      open,
      name:
        type === "string"
          ? "categorical"
          : type === "numerical"
            ? "numerical"
            : "",
    }));
  };

  const defaultChartSelected = {
    image: "",
    code: "",
    name: "",
    types: [],
    categorical: 0,
    numerical: 0,
    "categorical (ordinal)": 0,
    description: "",
    shortDesc: "",
    descImg1: "",
    descImg2: "",
    showDetails: false,
  };
  const [chartSelected, setChartSelected] = useState(defaultChartSelected);

  const [userCreatesIndicator, setUserCreatesIndicator] = useState(
    JSON.parse(sessionStorage.getItem("openlap-settings"))
      ?.userCreatesIndicator || false,
  );
  const [userSelectsDataset, setUserSelectsDataset] = useState(
    JSON.parse(sessionStorage.getItem("openlap-settings"))
      ?.userSelectsDataset || false,
  );
  const [userSelectsVisualization, setUserSelectsVisualization] = useState(
    JSON.parse(sessionStorage.getItem("openlap-settings"))
      ?.userSelectsVisualization || false,
  );
  const [userSelectsOnlyVisualization, setUserSelectsOnlyVisualization] =
    useState(
      JSON.parse(sessionStorage.getItem("openlap-settings"))
        ?.userSelectsOnlyVisualization || false,
    );
  const [userFinalizeSelection, setUserFinalizeSelection] = useState(
    JSON.parse(sessionStorage.getItem("openlap-settings"))
      ?.userFinalizeSelection || false,
  );

  const toggleUserCreatesIndicator = (reset) => {
    if (reset) {
      setUserCreatesIndicator(false);
      return;
    }
    setUserCreatesIndicator((prevState) => !prevState);
  };

  const resetChartSelected = () => {
    setChartSelected(defaultChartSelected);
  };

  const toggleUserSelectsDataset = (initialValue = false) => {
    if (initialValue) {
      setUserSelectsDataset(!initialValue);
      return;
    }
    setUserSelectsDataset((prevState) => !prevState);
  };
  const toggleUserSelectsVisualization = (initialValue = false) => {
    if (initialValue) {
      setUserSelectsVisualization(!initialValue);
      return;
    }
    setUserSelectsVisualization((prevState) => !prevState);
  };

  useEffect(() => {
    let openlapISCData = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
    const updateSessionStorage = () => {
      let tempISCData = {
        ...openlapISCData,
        indicatorData: dataState,
      };
      sessionStorage.setItem("openlap-isc-data", JSON.stringify(tempISCData));
    };
    updateSessionStorage();
  }, [dataState]);

  const handleResetIndicator = () => {
    let ISCSettings = JSON.parse(sessionStorage.getItem("openlap-settings"));
    delete ISCSettings.userCreatesIndicator;
    delete ISCSettings.userSelectsDataset;
    delete ISCSettings.userSelectsVisualization;
    delete ISCSettings.userSelectsOnlyVisualization;
    delete ISCSettings.userFinalizeSelection;
    sessionStorage.setItem("openlap-settings", JSON.stringify(ISCSettings));
    sessionStorage.removeItem("chart-options");
    sessionStorage.removeItem("chart-series");
    sessionStorage.removeItem("openlap-isc-data");
    setExpandVisualization(true);
    setExpandDataset(true);
    setDataState({
      rowData: [],
      columnData: [],
      status: false,
    });
    setChartSelected(defaultChartSelected);
    toggleUserSelectsDataset(true);
    toggleUserSelectsVisualization(true);
    setUserFinalizeSelection(false);
    setUserSelectsOnlyVisualization(false);
  };

  // This function is used to populate data to the indicator data table.
  // command parameter: "rename" is used to rename the column header name.
  const handleAddIndicatorData = (newRowData, newColumnData, command = "") => {
    let iscData = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
    let tempISCData;
    if (command === "coldstart") {
      let tempRowData = iscData.indicatorData.rowData.map((obj, index) => {
        if (!obj.hasOwnProperty(newColumnData.field)) {
          obj[newColumnData.field] = newRowData[index][newColumnData.field];
        }
        return obj;
      });
      setDataState((prevState) => {
        tempISCData = {
          ...iscData,
          indicatorData: {
            ...iscData.indicatorData,
            rowData: tempRowData,
            status: true,
          },
        };
        sessionStorage.setItem("openlap-isc-data", JSON.stringify(tempISCData));
        return tempISCData.indicatorData;
      });
      return tempISCData.indicatorData;
    }
    if (command === "rename") {
      let tempColumnData = iscData.indicatorData.columnData.map((column) => {
        if (column.field === newColumnData.field) {
          column.headerName = newColumnData.headerName;
        }
        return column;
      });
      setDataState((prevState) => {
        tempISCData = {
          ...iscData,
          indicatorData: {
            ...iscData.indicatorData,
            columnData: tempColumnData,
            status: true,
          },
        };
        sessionStorage.setItem("openlap-isc-data", JSON.stringify(tempISCData));
        return tempISCData.indicatorData;
      });
      return tempISCData.indicatorData;
    }
    if (
      iscData.indicatorData.columnData.some(
        (column) => column.field === newColumnData.field,
      )
    ) {
      let tempRowData = iscData.indicatorData.rowData.map((obj, index) => {
        if (obj.hasOwnProperty(newColumnData.field)) {
          obj[newColumnData.field] = newRowData[index];
        }
        return obj;
      });
      setDataState((prevState) => {
        tempISCData = {
          ...iscData,
          indicatorData: {
            ...iscData.indicatorData,
            rowData: tempRowData,
            status: true,
          },
        };
        sessionStorage.setItem("openlap-isc-data", JSON.stringify(tempISCData));
        return tempISCData.indicatorData;
      });
      return tempISCData.indicatorData;
    }

    let tempColumnData = [...iscData.indicatorData.columnData, newColumnData];
    const mergeData = (initialRowData, newDataRow, field) => {
      const finalRowData = [];

      for (
        let i = 0;
        i < Math.max(initialRowData.length, newDataRow.length);
        i++
      ) {
        const combinedObject = {};

        if (initialRowData[i]) {
          Object.assign(combinedObject, initialRowData[i]);
        } else {
          combinedObject.id = uuidv4();
          for (let j = 0; j < dataState.columnData.length; j++) {
            combinedObject[dataState.columnData[j].field] = "";
          }
        }

        if (newDataRow[i]) {
          combinedObject[field] = newDataRow[i];
        } else {
          combinedObject[field] = newColumnData["type"] === "string" ? "" : 0;
        }

        finalRowData.push(combinedObject);
      }

      return finalRowData;
    };

    let tempRowData;
    if (iscData.indicatorData.rowData.length === 0) {
      tempRowData = newRowData.map((row) => ({
        id: uuidv4(),
        [newColumnData.field]: row,
      }));
    } else {
      tempRowData = mergeData(
        iscData.indicatorData.rowData,
        newRowData,
        newColumnData.field,
      );
    }
    setDataState(() => {
      tempISCData = {
        ...iscData,
        indicatorData: {
          ...iscData.indicatorData,
          rowData: tempRowData,
          columnData: tempColumnData,
          status: true,
        },
      };
      sessionStorage.setItem("openlap-isc-data", JSON.stringify(tempISCData));
      return tempISCData.indicatorData;
    });
    return tempISCData.indicatorData;
  };

  // Function to add new rows to the dataset
  const handleAddNewRows = (rowCount) => {
    let iscData = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
    let tempColumnData = iscData.indicatorData.columnData;
    const newRows = Array.from({ length: rowCount }, () => {
      const newRow = { id: uuidv4() };
      tempColumnData.forEach((column) => {
        newRow[column.field] = column.type === "number" ? 0 : "";
      });
      return newRow;
    });
    let tempISCData = {
      ...iscData,
      indicatorData: {
        ...iscData.indicatorData,
        rowData: [...iscData.indicatorData.rowData, ...newRows],
        columnData: tempColumnData,
        status: true,
      },
    };
    sessionStorage.setItem("openlap-isc-data", JSON.stringify(tempISCData));
    setDataState({
      rowData: [...iscData.indicatorData.rowData, ...newRows],
      columnData: tempColumnData,
      status: true,
    });
  };

  const handleExpandVisualization = () => {
    setExpandVisualization((prevState) => !prevState);
  };

  const handleExpandDataset = () => {
    setExpandDataset((prevState) => !prevState);
  };

  const handleDeleteIndicatorData = (rowIdArray) => {
    let iscData = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
    setDataState((prevState) => {
      const filteredRowData = prevState.rowData.filter(
        (item) => !rowIdArray.includes(item.id),
      );
      let tempDataState = {
        ...prevState,
        rowData: filteredRowData,
        status: true,
      };
      let tempISCData = {
        ...iscData,
        indicatorData: tempDataState,
      };
      sessionStorage.setItem("openlap-isc-data", JSON.stringify(tempISCData));
      return tempDataState;
    });
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography>ISC Creator</Typography>
        </Grid>
        <Grid item xs={12}>
          <Divider />
        </Grid>
      </Grid>
      <Grid
        container
        spacing={2}
        style={{
          maxWidth: "990px",
          display: "flex",
          flexDirection: "column",
          margin: "24px auto",
          padding: "0 32px",
        }}
      >
        <Grid item xs={12}>
          <CreatorHeader
            chartSelected={chartSelected}
            dataState={dataState}
            userCreatesIndicator={userCreatesIndicator}
            handleResetIndicator={handleResetIndicator}
            toggleUserCreatesIndicator={toggleUserCreatesIndicator}
          />
          {userCreatesIndicator && (
            <>
              <Slide direction="left" in={userCreatesIndicator}>
                <Box>
                  {!userSelectsDataset &&
                    !userSelectsVisualization &&
                    !userFinalizeSelection && (
                      <Grid container justifyContent="center" sx={{ mt: 2 }}>
                        <Grid item xs={12}>
                          <Divider sx={{ mb: 6.5, mt: 1 }} />
                        </Grid>
                        <Typography>How would you like to start?</Typography>

                        <Grid
                          container
                          justifyContent="center"
                          spacing={4}
                          sx={{ py: 2, zIndex: 1 }}
                        >
                          <Grid item>
                            <Paper
                              elevation={0}
                              sx={{
                                height: 150,
                                width: 150,
                                border: "3px solid",
                                borderColor: "openlapTheme.secondary2",
                                "&:hover": {
                                  boxShadow: 5,
                                  backgroundColor: "openlapTheme.light",
                                },
                                p: 2,
                                borderRadius: 2,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                setUserSelectsOnlyVisualization(true);
                                toggleUserSelectsVisualization();
                              }}
                            >
                              <Typography variant="h6" align="center">
                                Select Visualization
                              </Typography>
                            </Paper>
                          </Grid>

                          <Grid item>
                            <Paper
                              elevation={0}
                              sx={{
                                height: 150,
                                width: 150,
                                border: "3px solid",
                                borderColor: "openlapTheme.secondary",
                                "&:hover": {
                                  boxShadow: 5,
                                  backgroundColor: "openlapTheme.light",
                                },
                                p: 2,
                                borderRadius: 2,
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                cursor: "pointer",
                              }}
                              onClick={() => toggleUserSelectsDataset()}
                            >
                              <Typography variant="h6" align="center">
                                Select Data
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </Grid>
                    )}

                  {userFinalizeSelection && (
                    <>
                      <Grid container justifyContent="center" sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                          <Divider />
                        </Grid>
                      </Grid>
                      <Accordion expanded={expandVisualization} defaultExpanded>
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            "&:hover": {
                              backgroundColor: "openlapTheme.light",
                            },
                          }}
                          onClick={handleExpandVisualization}
                        >
                          <ScatterPlotIcon />
                          <Typography sx={{ pl: 1 }}>Visualization</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pb: 3, pl: 3, pr: 3 }}>
                          <Grid container justifyContent="center">
                            <Grid item xs={12}>
                              <VisualizationSelection
                                openEditor={openEditor}
                                toggleEditPanel={toggleEditPanel}
                                chartSelected={chartSelected}
                                dataState={dataState}
                                setChartSelected={setChartSelected}
                                handleAddIndicatorData={handleAddIndicatorData}
                                handleAddNewRows={handleAddNewRows}
                                handleDeleteIndicatorData={
                                  handleDeleteIndicatorData
                                }
                              />
                            </Grid>
                          </Grid>
                        </AccordionDetails>
                      </Accordion>

                      <Accordion expanded={expandDataset} defaultExpanded>
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          sx={{
                            "&:hover": {
                              backgroundColor: "openlapTheme.light",
                            },
                          }}
                          onClick={handleExpandDataset}
                        >
                          <DatasetIcon />
                          <Typography sx={{ pl: 1 }}>Data table</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <DataSelection
                            dataState={dataState}
                            resetChartSelected={resetChartSelected}
                            handleAddIndicatorData={handleAddIndicatorData}
                            handleAddNewRows={handleAddNewRows}
                            handleDeleteIndicatorData={
                              handleDeleteIndicatorData
                            }
                            toggleEditPanel={toggleEditPanel}
                            chartSelected={chartSelected.code}
                            setDataState={setDataState}
                          />
                        </AccordionDetails>
                      </Accordion>
                    </>
                  )}
                </Box>
              </Slide>
              <Slide direction="left" in={userSelectsDataset}>
                <Box>
                  {userSelectsDataset && (
                    <>
                      <Grid container justifyContent="center" sx={{ mt: 2 }}>
                        <Grid item xs={12}>
                          <Divider sx={{ mb: 2, mt: 1 }} />
                        </Grid>
                      </Grid>
                      <DataSelection
                        dataState={dataState}
                        handleAddIndicatorData={handleAddIndicatorData}
                        handleAddNewRows={handleAddNewRows}
                        handleDeleteIndicatorData={handleDeleteIndicatorData}
                        resetChartSelected={resetChartSelected}
                        toggleEditPanel={toggleEditPanel}
                        toggleUserSelectsDataset={toggleUserSelectsDataset}
                        toggleUserSelectsVisualization={
                          toggleUserSelectsVisualization
                        }
                        setDataState={setDataState}
                      />
                    </>
                  )}
                </Box>
              </Slide>
              <Slide direction="left" in={userSelectsVisualization}>
                <Box>
                  {userSelectsVisualization && (
                    <Grid container justifyContent="center" sx={{ mt: 2 }}>
                      <Grid item xs={12}>
                        <Divider sx={{ mb: 2, mt: 1 }} />
                      </Grid>

                      <Grid
                        container
                        justifyContent="space-between"
                        sx={{ pb: 2 }}
                      >
                        <Button
                          variant="outlined"
                          startIcon={<KeyboardArrowLeftIcon />}
                          onClick={() => {
                            if (userSelectsOnlyVisualization) {
                              toggleUserSelectsVisualization();
                              setUserSelectsOnlyVisualization(false);
                              return;
                            }
                            if (
                              !userSelectsDataset &&
                              userSelectsVisualization
                            ) {
                              toggleUserSelectsDataset();
                            }
                            toggleUserSelectsVisualization();
                          }}
                        >
                          Back
                        </Button>

                        <Button
                          endIcon={<KeyboardArrowRightIcon />}
                          variant="contained"
                          disabled={chartSelected.code === ""}
                          onClick={() => {
                            setUserFinalizeSelection(true);
                            toggleUserSelectsVisualization();
                            setDataState({
                              ...dataState,
                              status: true,
                            });
                          }}
                        >
                          Preview
                        </Button>
                      </Grid>

                      <ChartList
                        dataState={dataState}
                        chartSelected={chartSelected}
                        setChartSelected={setChartSelected}
                        toggleEditPanel={toggleEditPanel}
                      />

                      <Grid
                        container
                        justifyContent="space-between"
                        sx={{ pb: 2 }}
                      >
                        <Button
                          variant="outlined"
                          startIcon={<KeyboardArrowLeftIcon />}
                          onClick={() => {
                            if (userSelectsOnlyVisualization) {
                              toggleUserSelectsVisualization();
                              setUserSelectsOnlyVisualization(false);
                              return;
                            }
                            if (
                              !userSelectsDataset &&
                              userSelectsVisualization
                            ) {
                              toggleUserSelectsDataset();
                            }
                            toggleUserSelectsVisualization();
                          }}
                        >
                          Back
                        </Button>

                        <Button
                          endIcon={<KeyboardArrowRightIcon />}
                          variant="contained"
                          disabled={chartSelected.code === ""}
                          onClick={() => {
                            setUserFinalizeSelection(true);
                            toggleUserSelectsVisualization();
                            setDataState({
                              ...dataState,
                              status: true,
                            });
                          }}
                        >
                          Preview
                        </Button>
                      </Grid>
                    </Grid>
                  )}
                </Box>
              </Slide>
            </>
          )}
        </Grid>
      </Grid>
    </>
  );
}
