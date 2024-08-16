import { useEffect, useState } from "react";
import { Box, Fade, Grid } from "@mui/material";
import Chart from "react-apexcharts";
import { Edit as EditIcon } from "@mui/icons-material";

import EditPanel from "../components/edit-panel.jsx";
import NumericalDropdown from "./components/numerical-dropdown.jsx";
import CategoricalDropdown from "./components/categorical-dropdown.jsx";
import {
  compareSecondAttribute,
  extractProperties,
  getUniqueValuesAndCounts,
} from "./utils/chart-utils.js";
import { v4 as uuidv4 } from "uuid";

export default function GroupedBarChart({
  openEditor,
  toggleEditPanel,
  dataState: { rowData, columnData },
  dataState,
  handleAddIndicatorData,
  handleAddNewRows,
  handleDeleteIndicatorData,
}) {
  let chartType = "bar";
  let allowedMultipleEnties = true;

  const [series, setSeries] = useState([
    {
      name: "", // columnName of DataGrid
      data: [0, 0, 0],
      field: "values", // field of DataGrid
    },
  ]);
  const [options, setOptions] = useState({
    chart: {
      type: chartType,
      stacked: false,
      width: "100%",
      foreColor: JSON.parse(sessionStorage.getItem("openlap-settings"))
        ?.darkMode
        ? "#ffffff"
        : "#000000", // TODO: Need to find a way to change the legend color dynamically
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        horizontal: false,
      },
    },
    xaxis: {
      name: "", // columnName of Datagrid
      categories: ["Category 1", "Category 2", "Category 3"],
      convertedCatToNumeric: true,
      field: "categories", // Custom property, field of DataGrid
      unique: false, // Custom property
    },
    default: true,
    legend: {
      position: "top",
      horizontalAlign: "center",
    },
    tooltip: {
      enabled: true,
      followCursor: true,
      theme: "dark",
      onDatasetHover: {
        highlightDataSeries: true,
      },
    },
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
            // let tempSeriesHeaderName = sessionOptions.headerNameSeries;
            let tempOptionsHeaderName = sessionOptions.xaxis.name;
            let tempOptionsField = sessionOptions.xaxis.field;
            let tempOptionsUnique = sessionOptions.xaxis.unique;
            let tempCategories = rowData.map(
              (row, index) =>
                row[tempOptionsField] ||
                `${tempOptionsHeaderName} ${index + 1}`,
            );
            let foundOptionsField = columnData.find(
              (item) => item.field === tempOptionsField,
            );
            if (foundOptionsField) {
              tempOptionsHeaderName = foundOptionsField.headerName;
            } else {
              tempOptionsHeaderName = "";
            }
            if (tempOptionsUnique) {
              var [uniqueColumnDataArray, uniqueColumnDataCountArray] =
                getUniqueValuesAndCounts(tempCategories);
            }
            let tempOptions = {
              ...prevOptions,
              chart: {
                ...prevOptions.chart,
                foreColor: darkMode,
              },
              xaxis: {
                ...prevOptions.xaxis,
                name: `${tempOptionsHeaderName}${
                  tempOptionsUnique ? " (Unique)" : ""
                }`,
                field: tempOptionsField,
                categories: tempOptionsUnique
                  ? uniqueColumnDataArray
                  : tempCategories,
                unique: tempOptionsUnique,
              },
              // headerNameSeries: tempSeriesHeaderName,
              default: false,
            };
            setSeries(() => {
              let tempSeriesArray = [];
              // let tempSeriesNameArray = [];
              for (let i = 0; i < sessionSeries.length; i++) {
                let numericalColumnName = sessionSeries[i].name;
                let numericalColumnField = sessionSeries[i].field;
                let foundSeriesField = columnData.find(
                  (item) => item.field === numericalColumnField,
                );
                // if (foundSeriesField) {
                //   tempSeriesNameArray.push(foundSeriesField.headerName);
                // }
                let uniqueNumericalColumnDataArray = sumHeaderValues(
                  rowData,
                  tempOptionsField,
                  numericalColumnField,
                  tempOptions.xaxis.categories,
                );
                if (numericalColumnField === "Count") {
                  // Check whether to put tempSeriesArray or tempSeries
                  tempSeriesArray = [
                    {
                      name: numericalColumnName,
                      data: uniqueColumnDataCountArray,
                      field: numericalColumnField,
                    },
                  ];
                } else if (tempOptionsUnique) {
                  tempSeriesArray.push({
                    name: numericalColumnName,
                    data: uniqueNumericalColumnDataArray,
                    field: numericalColumnField,
                  });
                } else {
                  const numericalColumnDataArray = rowData.map(
                    (row) => row[numericalColumnField] || 0,
                  );
                  if (foundSeriesField) {
                    tempSeriesArray.push({
                      name: numericalColumnName,
                      data: numericalColumnDataArray,
                      field: numericalColumnField,
                    });
                  }
                }
              }
              // tempOptions.headerNameSeries = tempSeriesNameArray;
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

  /**
   * This function updates the header name of the first column in a set of columns.
   */
  const handleNameColumn = (
    columnName,
    columnType = "string",
    numberOfRows,
  ) => {
    let tempUUIDField = uuidv4();
    let currentRow = [];
    for (let i = 0; i < numberOfRows; i++) {
      let column = columnType === "string" ? `${columnName} ${i + 1}` : 0;
      currentRow.push(column);
    }
    setColumns((currentColumns) => {
      let tempColumns = [...currentColumns];
      tempColumns[0].field = tempUUIDField;
      tempColumns[0].headerName = columnName;
      tempColumns[0].type = columnType;
      return tempColumns;
    });
    const datastateTempColumn = {
      editable: true,
      field: tempUUIDField,
      headerName: columnName,
      sortable: false,
      type: columnType,
      width: 120,
    };
    let savedData = handleAddIndicatorData(currentRow, datastateTempColumn);
    let tempRows = extractProperties(savedData.rowData, ["id", tempUUIDField]);
    setRows(tempRows);
    if (columnType === "string") {
      if (options.default) {
        setSeries(() => {
          let tempSeries = [{ name: "", data: [], field: "" }];
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
            categories: currentRow,
            field: tempUUIDField,
          },
          // headerNameOptions: columnName,
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
            categories: [],
            field: "",
          },
          // name: "",
          default: false,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        setOptions(tempOptions);

        setSeries(() => {
          let tempSeries = [
            { name: columnName, data: [], field: tempUUIDField },
          ];
          sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
          return tempSeries;
        });
        return;
      }
      // Numerical and Normal
      setSeries(() => {
        let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
        let tempSeries = [];
        if (sessionSeries[0].field === "" || !allowedMultipleEnties) {
          tempSeries.push({
            name: columnName,
            data: rowData.map((row, index) => 0),
            field: tempUUIDField,
          });
        } else {
          tempSeries = [
            ...sessionSeries,
            {
              name: columnName,
              data: rowData.map((row, index) => 0),
              field: tempUUIDField,
            },
          ];
        }
        sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
        return tempSeries;
      });
    }
  };

  const handleEditColumnData = (field, name, type, dataArray) => {
    // TODO: Probably need to use field instead of name
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
          xaxis: {
            ...prevStateOptions.xaxis,
            name: newColumnName,
          },
          // headerNameOptions: newColumnName,
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
   * Notes: the rows needed to compared because the delete functionality was not
   * working properly. Clicking the check button would select the row and the
   * processRowUpdate prop would trigger, which is not the expected behaviour.
   * Needed to check if the row was actually updated or not. Rows are not meant to be updated
   * for such case (delete). However its doing it like this meaning if the compareSecondAttribute
   * function returns true, then the row was not updated.
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
      let updatedRows;
      const rowDataFieldExists = iscDataRowData.some((item) =>
        item.hasOwnProperty(tempColumnData.field),
      );
      if (!rowDataFieldExists) {
        updatedRows = iscDataRowData.map((item) => {
          if (updatedRow.id === item.id) {
            item[tempColumnData.field] = updatedRow[tempColumnData.field];
          } else {
            item[tempColumnData.field] = null;
          }
          return item;
        });
      } else {
        updatedRows = extractProperties(iscDataRowData, [
          "id",
          tempColumnData.field,
        ]);
      }
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
      if (!rowDataFieldExists) {
        handleAddIndicatorData(updatedRows, tempColumn, "coldstart");
      } else {
        handleAddIndicatorData(tempArrayRows, tempColumn);
      }

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
          true,
        );
      }
    }
    return updatedRow;
  };

  // const handleUpdateData = () => {
  //   let tempColumnData = columns[0];
  //   const tempRows = dynamicMap(rows);
  //   const tempColumn = {
  //     headerName: tempColumnData.headerName,
  //     sortable: false,
  //     editable: true,
  //     type: tempColumnData.type,
  //     field: tempColumnData.headerName,
  //     width: 120,
  //   };
  //   handleAddIndicatorData(tempRows, tempColumn);
  // };

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
            name: categoricalColumnName,
            categories: categoricalColumnDataArray,
            field: categoricalColumnField,
            unique,
          },
          default: false,
          // headerNameOptions: categoricalColumnField,
          // headerNameSeries: [""],
        };
        setSeries(() => {
          let tempArray = categoricalColumnDataArray.map((item) => 0);
          let tempSeries = [{ name: "", data: tempArray, field: "" }];
          sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
          return [];
        });
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        return tempOptions;
      });
      return;
    }
    // Unique
    if (unique) {
      setOptions((prevStateOptions) => {
        let tempSeriesArray = [];
        // let tempSeriesNameArray = [];
        for (let i = 0; i < sessionSeries.length; i++) {
          let numericalColumnName = sessionSeries[i].name;
          let numericalColumnField = sessionSeries[i].field;
          // tempSeriesNameArray.push(prevStateOptions.headerNameSeries[i]);
          let uniqueNumericalColumnDataArray = sumHeaderValues(
            rowData,
            categoricalColumnField,
            numericalColumnField,
            categoricalColumnDataArray,
          );

          tempSeriesArray.push({
            name: numericalColumnName,
            data: uniqueNumericalColumnDataArray,
            field: numericalColumnField,
          });
        }
        setSeries(tempSeriesArray);
        sessionStorage.setItem("chart-series", JSON.stringify(tempSeriesArray));
        tempOptions = {
          ...prevStateOptions,
          xaxis: {
            ...prevStateOptions.xaxis,
            name: `${categoricalColumnName} (Unique)`,
            categories: categoricalColumnDataArray,
            field: categoricalColumnField,
            unique,
          },
          default: false,
          // headerNameSeries: tempSeriesNameArray,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        return tempOptions;
      });
      return;
    }
    // Normal
    setOptions((prevStateOptions) => {
      let tempSeriesArray = [];
      // let tempSeriesNameArray = [];
      for (let i = 0; i < sessionSeries.length; i++) {
        let numericalColumnName = sessionSeries[i].name;
        let numericalColumnField = sessionSeries[i].field;
        if (numericalColumnField === "") break;
        if (numericalColumnField !== "Count") {
          // tempSeriesNameArray.push(prevStateOptions.headerNameSeries[i]);
          const numericalColumnDataArray = rowData.map(
            (row) => row[numericalColumnField],
          );
          tempSeriesArray.push({
            name: numericalColumnName,
            data: numericalColumnDataArray,
            field: numericalColumnField,
          });
        }
      }
      setSeries(tempSeriesArray);
      sessionStorage.setItem("chart-series", JSON.stringify(tempSeriesArray));
      tempOptions = {
        ...prevStateOptions,
        xaxis: {
          ...prevStateOptions.xaxis,
          name: categoricalColumnName,
          categories: categoricalColumnDataArray,
          field: categoricalColumnField,
          unique,
        },
        default: false,
        // headerNameSeries: tempSeriesNameArray,
      };
      sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
      return tempOptions;
    });
    return;
  };

  // TODO: Fix this
  const handleDeleteCategoricalOptions = (categoricalField) => {
    let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
    setOptions((prevStateOptions) => {
      let tempOptions = {
        ...prevStateOptions,
        xaxis: {
          ...prevStateOptions.xaxis,
          name: "",
          categories: [],
          field: "",
          unique: false,
        },
      };
      sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
      return tempOptions;
    });
  };

  // Function to handle the numerical dropdown data
  const handleSetNumericalSeries = (
    numericalColumnField,
    numericalColumnName,
    numericalColumnDataArray,
    update,
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
            categories: [],
          },
          headerNameOptions: "",
          // headerNameSeries: [numericalColumnField],
          default: false,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        return tempOptions;
      });

      setSeries(() => {
        let tempSeries = [
          {
            name: numericalColumnName,
            data: numericalColumnDataArray,
            field: numericalColumnField,
          },
        ];
        sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
        return tempSeries;
      });
      return;
    }
    // Unique property passed
    if (sessionOptions.xaxis.unique) {
      let categoricalColumnOptionField = sessionOptions.xaxis.field;
      let uniqueNumericalColumnDataArray = sumHeaderValues(
        rowData,
        categoricalColumnOptionField,
        numericalColumnField,
        sessionOptions.xaxis.categories,
      );
      setSeries(() => {
        let tempData = [
          {
            name: numericalColumnName,
            data: uniqueNumericalColumnDataArray,
            field: numericalColumnField,
          },
        ];
        let tempSeriesArray = [];

        if (allowedMultipleEnties) {
          tempSeriesArray = [...sessionSeries, ...tempData];
        } else tempSeriesArray = [...tempSeriesArray, ...tempData];

        // let tempSeriesNameArray = [];
        let finalSeriesArray = [];

        for (let i = 0; i < tempSeriesArray.length; i++) {
          if (tempSeriesArray[i].field === "Count") {
            // tempSeriesNameArray.push("Count");
            finalSeriesArray.push(tempSeriesArray[i]);
          } else {
            let foundHeaderName = columnData.find(
              (item) => item.field === tempSeriesArray[i].field,
            );
            if (Boolean(foundHeaderName)) {
              // tempSeriesNameArray.push(foundHeaderName.field);
              finalSeriesArray.push(tempSeriesArray[i]);
            }
          }
        }

        // setOptions((prevState) => {
        //   let tempOptions = {
        //     ...prevState,
        //     // headerNameSeries: [numericalColumnName],
        //     headerNameSeries: tempSeriesNameArray,
        //     default: false,
        //   };
        //   sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        //   return tempOptions;
        // });
        sessionStorage.setItem(
          "chart-series",
          JSON.stringify(finalSeriesArray),
        );
        return finalSeriesArray;
      });
      return;
    }
    // To update the current data
    if (update) {
      let tempSeriesArray = [...sessionSeries];
      let findIndexSeries = tempSeriesArray.findIndex(
        (series) => series.field === numericalColumnField,
      );
      tempSeriesArray[findIndexSeries] = {
        name: numericalColumnName,
        data: numericalColumnDataArray,
        field: numericalColumnField,
      };
      sessionStorage.setItem("chart-series", JSON.stringify(tempSeriesArray));
      setSeries(tempSeriesArray);
      return;
    }
    // Normal
    setSeries(() => {
      let tempSeries = [
        {
          name: numericalColumnName,
          data: numericalColumnDataArray,
          field: numericalColumnField,
        },
      ];

      let tempSeriesArray = [];

      if (allowedMultipleEnties) {
        tempSeriesArray = [...sessionSeries, ...tempSeries];
      } else tempSeriesArray = [...tempSeriesArray, ...tempSeries];

      // let tempSeriesNameArray = [];
      let finalSeriesArray = [];

      for (let i = 0; i < tempSeriesArray.length; i++) {
        if (tempSeriesArray[i].name === "Count") {
          // tempSeriesNameArray.push("Count");
          finalSeriesArray.push(tempSeriesArray[i]);
        } else {
          let foundHeaderName = columnData.find(
            (item) => item.field === tempSeriesArray[i].field,
          );
          if (Boolean(foundHeaderName)) {
            // tempSeriesNameArray.push(foundHeaderName.headerName);
            finalSeriesArray.push(tempSeriesArray[i]);
          }
        }
      }
      // setOptions((prevState) => {
      //   let tempOptions = {
      //     ...prevState,
      //     headerNameSeries: tempSeriesNameArray,
      //     default: false,
      //   };
      //   sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
      //   return tempOptions;
      // });
      sessionStorage.setItem("chart-series", JSON.stringify(finalSeriesArray));
      return finalSeriesArray;
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

  const handleDeleteNumericalSeries = (seriesField) => {
    let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
    let filterSeries = sessionSeries.filter((ser) => ser.field !== seriesField);
    setSeries(filterSeries);
    sessionStorage.setItem("chart-series", JSON.stringify(filterSeries));
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
          name: `${categoricalColumnName} (Unique)`,
          categories: uniqueColumnDataArray,
          field: categoricalColumnField,
          unique: true,
        },
        default: false,
      };
      sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
      return tempOptions;
    });
    setSeries(() => {
      let tempSeries = [
        {
          name: "Count",
          data: uniqueColumnDataCountArray,
          field: "Count",
        },
      ];
      sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
      return tempSeries;
    });
  };

  return (
    <>
      <Grid container sx={{ minHeight: "45vh" }}>
        <Grid item xs={12} sm={openEditor.open ? 8 : 12}>
          <Grid container alignItems="center">
            <Grid item xs={12} md={2}>
              <NumericalDropdown
                allowedMultipleEnties={allowedMultipleEnties}
                axisLabel={"Y-Axis: Numerical"}
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
            <Grid item xs={12} md={10}>
              <Grid container justifyContent="center">
                {/* // TODO: Add the switching to horizontal orientation */}
                {/* <Grid container justifyContent="flex-end">
                  <Switch />
                </Grid> */}
                <Grid item xs={12} sx={{ height: "500px", mb: 2 }}>
                  <Chart
                    options={options}
                    series={series}
                    type={chartType}
                    height="100%"
                  />
                </Grid>
                <Grid item>
                  <CategoricalDropdown
                    axisLabel={"X-Axis: Categorical"}
                    series={series}
                    options={options}
                    dataState={dataState}
                    handleSetCategoricalOptions={handleSetCategoricalOptions}
                    handleDeleteCategoricalOptions={
                      handleDeleteCategoricalOptions
                    }
                    handleSetCountOccurrences={handleSetCountOccurrences}
                    handleNameColumn={handleNameColumn}
                    handleEditColumnData={handleEditColumnData}
                    toggleEditPanel={toggleEditPanel}
                  />
                </Grid>
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
