import { useEffect, useState } from "react";
import { Box, Fade, Grid } from "@mui/material";
import Chart from "react-apexcharts";
import { Edit as EditIcon } from "@mui/icons-material";

import EditPanel from "../../components/edit-panel.jsx";
import NumericalDropdown from "./numerical-dropdown.jsx";
import CategoricalDropdown from "./categorical-dropdown.jsx";
import {
  compareSecondAttribute,
  extractProperties,
  getUniqueValuesAndCounts,
} from "../utils/chart-utils.js";

export default function PieChart({
  openEditor,
  toggleEditPanel,
  dataState: { rowData, columnData },
  dataState,
  handleAddIndicatorData,
  handleAddNewRows,
  handleDeleteIndicatorData,
}) {
  let chartType = "polarArea";

  const [series, setSeries] = useState([20, 60, 20]);
  const [options, setOptions] = useState({
    chart: {
      type: chartType,
      width: "100%",
      foreColor: JSON.parse(sessionStorage.getItem("openlap-settings"))
        ?.darkMode
        ? "#ffffff"
        : "#000000", // TODO: Need to find a way to change the legend color dynamically
    },
    xaxis: {
      name: "categories", // field
      seriesName: "values", // field
      unique: false, // Custom property
    },
    headerNameOptions: "", // headerName
    headerNameSeries: "", // headerName
    labels: ["Category 1", "Category 2", "Category 3"],
    default: true,
    legend: {
      position: "bottom",
    },
    name: "Categories  (Sample)", // headerName: to be removed
  });

  const defaultColumn = [
    {
      field: "newColumn",
      headerName: "New column",
      sortable: false,
      editable: true,
      type: openEditor.type,
      flex: 1,
      renderCell: (params) => (
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <EditIcon color="primary" />
          </Grid>
          <Grid item xs>
            {params.value}
          </Grid>
        </Grid>
      ),
    },
  ];
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState(defaultColumn);

  useEffect(() => {
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
    let darkMode = JSON.parse(sessionStorage.getItem("openlap-settings"))
      .darkMode
      ? "#ffffff"
      : "#000000";
    if (sessionOptions && sessionSeries) {
      if (sessionOptions.chart.type === chartType) {
        if (!sessionOptions.default) {
          setOptions((prevOptions) => {
            let tempSeriesHeaderName = sessionOptions.headerNameSeries;
            let tempOptionsHeaderName = sessionOptions.headerNameOptions;
            let tempOptionsField = sessionOptions.xaxis.name;
            let tempOptionsUnique = sessionOptions.xaxis.unique;
            let foundOptionsField = columnData.find(
              (item) => item.field === tempOptionsField,
            );
            if (foundOptionsField) {
              tempOptionsField = foundOptionsField.field;
              tempOptionsHeaderName = foundOptionsField.headerName;
            } else {
              tempOptionsField = "";
              tempOptionsHeaderName = "";
            }
            let tempLabels = rowData.map(
              (row, index) => row[tempOptionsField] || `Category ${index + 1}`,
            );
            if (tempOptionsUnique) {
              var [uniqueColumnDataArray, uniqueColumnDataCountArray] =
                getUniqueValuesAndCounts(tempLabels);
            }
            let tempOptions = {
              ...prevOptions,
              chart: {
                ...prevOptions.chart,
                foreColor: darkMode,
              },
              xaxis: {
                ...prevOptions.xaxis,
                name: tempOptionsField,
                unique: tempOptionsUnique,
              },
              headerNameOptions: `${tempOptionsHeaderName}${
                tempOptionsUnique ? " (Unique)" : ""
              }`,
              headerNameSeries: tempSeriesHeaderName,
              labels: tempOptionsUnique ? uniqueColumnDataArray : tempLabels,
              default: false,
            };
            setSeries(() => {
              let tempSeriesArray = [];

              let numericalColumnField = tempOptions.xaxis.seriesName;
              let foundSeriesField = columnData.find(
                (item) => item.field === numericalColumnField,
              );
              if (foundSeriesField) {
                numericalColumnField = foundSeriesField.field;
                tempSeriesHeaderName = foundSeriesField.headerName;
              } else {
                numericalColumnField = "";
                tempSeriesHeaderName = "";
              }

              if (numericalColumnField === "Count") {
                numericalColumnField = "Count";
                tempSeriesHeaderName = "Count";
                tempSeriesArray = uniqueColumnDataCountArray;
              } else if (foundSeriesField && tempOptionsUnique) {
                let uniqueNumericalColumnDataArray = sumHeaderValues(
                  rowData,
                  tempOptionsField,
                  numericalColumnField,
                  tempOptions.labels,
                );
                tempSeriesArray = uniqueNumericalColumnDataArray;
              } else {
                // Found but not unique or count
                // OR Not found at all and default 1 is set
                const numericalColumnDataArray = rowData.map(
                  (row) => row[numericalColumnField] || 1,
                );
                tempSeriesArray = numericalColumnDataArray;
              }

              tempOptions.headerNameSeries = tempSeriesHeaderName;
              tempOptions.xaxis.seriesName = numericalColumnField;
              sessionStorage.setItem(
                "chart-series",
                JSON.stringify(tempSeriesArray),
              );
              return tempSeriesArray;
            });
            sessionStorage.setItem(
              "chart-options",
              JSON.stringify(tempOptions),
            );

            return tempOptions;
          });
        } else {
          sessionStorage.setItem("chart-options", JSON.stringify(options));
          sessionStorage.setItem("chart-series", JSON.stringify(series));
          toggleEditPanel("", false);
        }
      } else {
        sessionStorage.setItem("chart-options", JSON.stringify(options));
        sessionStorage.setItem("chart-series", JSON.stringify(series));
        toggleEditPanel("", false);
      }
    } else {
      sessionStorage.setItem("chart-options", JSON.stringify(options));
      sessionStorage.setItem("chart-series", JSON.stringify(series));
    }
  }, [
    dataState,
    rowData,
    columnData,
    JSON.parse(sessionStorage.getItem("openlap-settings")).darkMode,
  ]);

  function dynamicMap(data) {
    const dynamicKey = Object.keys(data[0]).find((key) => key !== "id");
    const tempArray = data.map((row) => row[dynamicKey]);
    return tempArray;
  }

  function calculateArray(inputArray) {
    const length = inputArray.length;
    const newArray = Array.from({ length }, () => 100 / length);
    return newArray;
  }

  /**
   * This function updates the header name of the first column in a set of columns.
   */
  const handleNameColumn = (
    columnName,
    columnType = "string",
    numberOfRows,
  ) => {
    let currentRow = [];
    for (let i = 0; i < numberOfRows; i++) {
      let column = columnType === "string" ? `Category ${i + 1}` : 0;
      currentRow.push(column);
    }
    setColumns((currentColumns) => {
      let tempColumns = [...currentColumns];
      tempColumns[0].field = columnName;
      tempColumns[0].headerName = columnName;
      tempColumns[0].type = columnType;
      return tempColumns;
    });
    const datastateTempColumn = {
      headerName: columnName,
      sortable: false,
      editable: true,
      type: columnType,
      field: columnName,
      width: 120,
    };
    let savedData = handleAddIndicatorData(currentRow, datastateTempColumn);
    let tempRows = extractProperties(savedData.rowData, ["id", columnName]);
    setRows(tempRows);
    if (columnType === "string") {
      if (options.default) {
        setSeries(() => {
          let tempSeries = currentRow.map(() => currentRow.length);
          sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
          return tempSeries;
        });
      }
      setOptions((prevStateOptions) => {
        let tempOptions = {
          ...prevStateOptions,
          xaxis: {
            ...prevStateOptions.xaxis,
            name: columnName,
            seriesName: options.default
              ? ""
              : prevStateOptions.xaxis.seriesName,
          },
          labels: currentRow,
          headerNameOptions: columnName,
          headerNameSeries: options.default
            ? ""
            : prevStateOptions.xaxis.seriesName,
          default: false,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        return tempOptions;
      });
      return;
    }
    if (columnType === "number") {
      if (options.default) {
        let tempOptions = {
          ...options,
          xaxis: {
            ...options.xaxis,
            name: "",
            seriesName: columnName,
          },
          labels: currentRow,
          headerNameOptions: "",
          headerNameSeries: columnName,
          default: false,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        setOptions(tempOptions);

        setSeries(() => {
          let tempSeries = calculateArray(currentRow);
          sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
          return tempSeries;
        });
        return;
      }

      // Normal
      setSeries(() => {
        let tempSeries = calculateArray(currentRow);
        sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
        return tempSeries;
      });
    }
  };

  const handleEditColumnData = (field, name, type, dataArray) => {
    let tempRows = extractProperties(rowData, ["id", name]);
    setRows(tempRows);
    setColumns((currentColumns) => {
      currentColumns[0].field = field;
      currentColumns[0].headerName = name;
      currentColumns[0].type = type;
      return currentColumns;
    });
    setTimeout(() => {
      toggleEditPanel(type, true);
    }, 200);
  };

  const handleRenameColumn = (newColumnName) => {
    setColumns((currentColumns) => {
      let tempColumns = [...currentColumns];
      tempColumns[0].headerName = newColumnName;

      setOptions((prevStateOptions) => {
        let tempOptions = {
          ...prevStateOptions,
          headerNameOptions: newColumnName,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        return tempOptions;
      });
      handleAddIndicatorData(null, tempColumns[0], "rename");
      return tempColumns;
    });
  };

  /**
   * This function updates a specific row in an array of rows and returns the updated row.
   * @returns the `updatedRow` object.
   */
  const handleProcessRowUpdate = (updatedRow, originalRow) => {
    if (
      !compareSecondAttribute(updatedRow, originalRow) &&
      originalRow !== null
    ) {
      let tempColumnData = columns[0];
      let iscData = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
      let iscDataRowData = iscData.indicatorData.rowData;
      const rowIndex = iscDataRowData.findIndex(
        (row) => row.id === updatedRow.id,
      );
      const updatedRows = extractProperties(iscDataRowData, [
        "id",
        tempColumnData.field,
      ]);
      updatedRows[rowIndex] = updatedRow;
      setRows(updatedRows);
      const tempArrayRows = dynamicMap(updatedRows);
      const tempColumn = {
        headerName: tempColumnData.headerName,
        sortable: false,
        editable: true,
        type: openEditor.type,
        field: tempColumnData.field,
        width: 120,
      };
      handleAddIndicatorData(tempArrayRows, tempColumn);

      if (openEditor.type === "string") {
        handleSetCategoricalOptions(
          tempColumnData.field,
          tempColumnData.headerName,
          tempArrayRows,
        );
      }
      if (openEditor.type === "number") {
        handleSetNumericalSeries(
          tempColumnData.field,
          tempColumnData.headerName,
          tempArrayRows,
        );
      }
    }
    return updatedRow;
  };

  const handleUpdateData = () => {
    let tempColumnData = columns[0];
    const tempRows = dynamicMap(rows);
    const tempColumn = {
      headerName: tempColumnData.headerName,
      sortable: false,
      editable: true,
      type: tempColumnData.type,
      field: tempColumnData.headerName,
      width: 120,
    };
    handleAddIndicatorData(tempRows, tempColumn);
  };

  // Function to handle the categorical dropdown data
  const handleSetCategoricalOptions = (
    categoricalColumnField,
    categoricalColumnName,
    categoricalColumnDataArray,
    unique = false,
  ) => {
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
    let tempOptions;
    if (sessionOptions.default) {
      setOptions((prevStateOptions) => {
        tempOptions = {
          ...prevStateOptions,
          xaxis: {
            ...prevStateOptions.xaxis,
            name: categoricalColumnField,
            seriesName: "",
            unique,
          },
          labels: categoricalColumnDataArray,
          default: false,
          headerNameOptions: categoricalColumnName,
          headerNameSeries: "",
        };
        setSeries(() => {
          let tempSeries = calculateArray(categoricalColumnDataArray);
          sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
          return tempSeries;
        });
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        return tempOptions;
      });
      return;
    }
    // Unique
    if (unique) {
      setOptions((prevStateOptions) => {
        let tempSeriesArray;
        let tempSeriesNameArray;

        let numericalColumnField = sessionOptions.xaxis.seriesName;
        tempSeriesNameArray = prevStateOptions.headerNameSeries;
        let uniqueNumericalColumnDataArray = sumHeaderValues(
          rowData,
          categoricalColumnField,
          numericalColumnField,
          categoricalColumnDataArray,
        );
        tempSeriesArray = uniqueNumericalColumnDataArray;
        setSeries(uniqueNumericalColumnDataArray);
        sessionStorage.setItem(
          "chart-series",
          JSON.stringify(uniqueNumericalColumnDataArray),
        );

        tempOptions = {
          ...prevStateOptions,
          xaxis: {
            ...prevStateOptions.xaxis,
            name: categoricalColumnField,
            seriesName: numericalColumnField,
            unique,
          },
          labels: categoricalColumnDataArray,
          headerNameOptions: `${categoricalColumnName} (Unique)`,
          default: false,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        return tempOptions;
      });
      return;
    }
    // Normal
    setOptions(() => {
      let tempSeriesArray = [];
      let tempSeriesNameArray;
      let numericalColumnField = sessionOptions.xaxis.seriesName;
      if (numericalColumnField !== "") {
        tempSeriesNameArray = sessionOptions.headerNameSeries;
        if (numericalColumnField !== "Count") {
          const numericalColumnDataArray = rowData.map(
            (row) => row[numericalColumnField] || 1,
          );
          tempSeriesArray = numericalColumnDataArray;
        }
      } else {
        tempSeriesArray = rowData.map((row) => 1);
      }
      setSeries(tempSeriesArray);
      sessionStorage.setItem("chart-series", JSON.stringify(tempSeriesArray));
      tempOptions = {
        ...sessionOptions,
        xaxis: {
          ...sessionOptions.xaxis,
          name: categoricalColumnField,
          seriesName: numericalColumnField,
          unique,
        },
        labels: categoricalColumnDataArray,
        headerNameOptions: categoricalColumnName,
        headerNameSeries: tempSeriesNameArray,
        default: false,
      };
      sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
      return tempOptions;
    });
    return;
  };

  const handleDeleteCategoricalOptions = () => {
    setOptions((prevStateOptions) => {
      let tempOptions = {
        ...prevStateOptions,
        xaxis: {
          ...prevStateOptions.xaxis,
          name: "",
          categories: [],
          unique: false,
        },
        name: "",
      };
      sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
      return tempOptions;
    });
  };

  const handleSetNumericalSeries = (
    numericalColumnField,
    numericalColumnName,
    numericalColumnDataArray,
  ) => {
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
    // Still default state
    if (sessionOptions.default) {
      setOptions((prevState) => {
        let tempOptions = {
          ...prevState,
          xaxis: {
            ...prevState.xaxis,
            name: "",
            seriesName: numericalColumnField,
          },
          headerNameOptions: "",
          headerNameSeries: numericalColumnName,
          labels: numericalColumnDataArray.map(
            (row, index) => `Category ${index + 1}`,
          ),
          default: false,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        return tempOptions;
      });

      setSeries(() => {
        sessionStorage.setItem(
          "chart-series",
          JSON.stringify(numericalColumnDataArray),
        );
        return numericalColumnDataArray;
      });
      return;
    }
    // Unique property passed
    if (sessionOptions.xaxis.unique) {
      let categoricalColumnOptionField = sessionOptions.xaxis.name;
      setSeries(() => {
        let uniqueNumericalColumnDataArray = sumHeaderValues(
          rowData,
          categoricalColumnOptionField,
          numericalColumnField,
          sessionOptions.labels,
        );
        let tempData = uniqueNumericalColumnDataArray;
        let tempSeriesArray = tempData;

        let tempSeriesNameArray;

        if (sessionOptions.xaxis.seriesName === "Count") {
          tempSeriesNameArray = "Count";
        } else {
          let foundHeaderName = columnData.find(
            (item) => item.field === sessionOptions.xaxis.seriesName,
          );
          if (Boolean(foundHeaderName)) {
            tempSeriesNameArray = foundHeaderName.headerName;
          }
        }

        setOptions((prevState) => {
          let tempOptions = {
            ...prevState,
            headerNameSeries: tempSeriesNameArray,
            default: false,
          };
          sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
          return tempOptions;
        });
        sessionStorage.setItem("chart-series", JSON.stringify(tempSeriesArray));
        return tempSeriesArray;
      });
      return;
    }

    // Normal
    setSeries(() => {
      let foundHeaderName = columnData.find(
        (item) => item.field === numericalColumnField,
      );
      setOptions((prevState) => {
        let tempOptions = {
          ...prevState,
          xaxis: {
            ...prevState.xaxis,
            seriesName: numericalColumnField,
          },
          headerNameSeries: foundHeaderName.headerName,
          default: false,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        return tempOptions;
      });
      sessionStorage.setItem(
        "chart-series",
        JSON.stringify(numericalColumnDataArray),
      );
      return numericalColumnDataArray;
    });
  };

  // Utility function to get unique values and counts
  function sumHeaderValues(
    rowData,
    categoricalColumnOptionField,
    numericalColumnName,
    categoricalColumnDataArray,
  ) {
    return categoricalColumnDataArray.map((categoryArray) => {
      const filteredArray = rowData.filter(
        (row) => row[categoricalColumnOptionField] === categoryArray,
      );
      const sum = filteredArray.reduce(
        (total, row) => total + row[numericalColumnName],
        0,
      );
      return Number.isNaN(sum) ? 0 : sum;
    });
  }

  const handleDeleteNumericalSeries = (seriesName) => {
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
    let filterSeries = sessionSeries.filter((ser) => ser.name !== seriesName);
    let filterOptionsHeaderSeries = sessionOptions.headerNameSeries.filter(
      (series) => series !== seriesName,
    );
    let tempOptions = {
      ...sessionOptions,
      headerNameSeries: filterOptionsHeaderSeries,
    };
    setSeries(filterSeries);
    setOptions(tempOptions);
    sessionStorage.setItem("chart-series", JSON.stringify(filterSeries));
    sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
  };

  // Method to count the number of occurrences of each unique value
  const handleSetCountOccurrences = (
    categoricalColumnField,
    categoricalColumnName,
    uniqueColumnDataArray,
    uniqueColumnDataCountArray,
  ) => {
    setOptions((prevState) => {
      let tempOptions = {
        ...prevState,
        xaxis: {
          ...prevState.xaxis,
          name: categoricalColumnField,
          unique: true,
        },
        headerNameOptions: `${categoricalColumnName} (Unique)`,
        headerNameSeries: "Count",
        labels: uniqueColumnDataArray,
        default: false,
      };
      sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
      return tempOptions;
    });
    setSeries(() => {
      let tempSeries = uniqueColumnDataCountArray;
      sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
      return tempSeries;
    });
  };

  return (
    <>
      <Grid container sx={{ minHeight: "45vh" }}>
        <Grid item xs={12} sm={openEditor.open ? 8 : 12}>
          <Grid container justifyContent="center" spacing={2} sx={{ mb: 2 }}>
            <Grid item>
              <CategoricalDropdown
                axisLabel={"Slice titles"}
                series={series}
                options={options}
                dataState={dataState}
                handleSetCategoricalOptions={handleSetCategoricalOptions}
                handleDeleteCategoricalOptions={handleDeleteCategoricalOptions}
                handleSetCountOccurrences={handleSetCountOccurrences}
                handleNameColumn={handleNameColumn}
                handleEditColumnData={handleEditColumnData}
                toggleEditPanel={toggleEditPanel}
              />
            </Grid>
            <Grid item>
              <NumericalDropdown
                axisLabel={"Slice values"}
                series={series}
                options={options}
                dataState={dataState}
                handleSetNumericalSeries={handleSetNumericalSeries}
                handleDeleteNumericalSeries={handleDeleteNumericalSeries}
                openEditor={openEditor}
                handleEditColumnData={handleEditColumnData}
                handleNameColumn={handleNameColumn}
                toggleEditPanel={toggleEditPanel}
              />
            </Grid>
          </Grid>
          <Grid container>
            <Grid container justifyContent="center">
              <Grid item xs={12} sx={{ height: "500px" }}>
                <Chart
                  options={options}
                  series={series}
                  type={chartType}
                  height="100%"
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Fade
            {...(Boolean(open) ? { timeout: 1000 } : {})}
            in={Boolean(open)}
          >
            <Box>
              {openEditor.open && (
                <EditPanel
                  columns={columns}
                  dataState={dataState}
                  rows={rows}
                  toggleEditPanel={toggleEditPanel}
                  handleAddNewRows={handleAddNewRows}
                  handleDeleteIndicatorData={handleDeleteIndicatorData}
                  handleProcessRowUpdate={handleProcessRowUpdate}
                  handleRenameColumn={handleRenameColumn}
                />
              )}
            </Box>
          </Fade>
        </Grid>
      </Grid>
    </>
  );
}
