import { useEffect, useState } from "react";
import { Grid, IconButton, Tooltip, Typography } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import Chart from "react-apexcharts";
import { v4 as uuidv4 } from "uuid";

import EditPanel from "../../components/edit-panel.jsx";
import YAxisDropdown from "./y-axis-dropdown.jsx";
import XAxisDropdown from "./x-axis-dropdown.jsx";

export default function ScatterPl({
  dataState: { rowData, columnData },
  dataState,
  handleAddIndicatorData,
}) {
  let chartType = "scatter";
  const [openEditor, setOpenEditor] = useState({ type: "", open: false });

  const toggleEditPanel = (type = "", axis) => {
    setOpenEditor((prevState) => ({
      type,
      open: !prevState.open,
      name: type === "string" ? "categorical" : "numerical",
      axis,
    }));
  };

  const [series, setSeries] = useState([
    {
      name: "Grades (Sample)",
      data: [
        [5, 85],
        [8, 92],
        [4, 78],
        [6, 88],
        [7, 90],
        [3, 70],
        [9, 95],
        [7, 87],
        [5, 82],
        [6, 89],
      ],
    },
  ]);
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
      name: "Hours (Sample)",
      convertedCatToNumeric: true,
    },
    name: "Hours (Sample)",
    seriesName: "Grades (Sample)",
    default: true,
    legend: {
      position: "top",
      horizontalAlign: "center",
    },
  });

  const [xAxis, setXAxis] = useState([]);
  const [yAxis, setYAxis] = useState([]);

  const defaultColumn = [
    {
      field: "column",
      headerName: "Rename data column",
      sortable: false,
      editable: true,
      type: openEditor.type,
      flex: 1,
    },
    {
      field: "Delete",
      headerName: "",
      sortable: false,
      width: 65,
      disableColumnMenu: true,
      renderCell: (params) => (
        <Tooltip
          title={
            <Typography variant="body2" sx={{ p: 1 }}>
              Delete row
            </Typography>
          }
          arrow
        >
          <IconButton
            // disabled={Boolean(rowData.length)}
            color="error"
            onClick={() => {
              handleDeleteRow(params.row);
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      ),
    },
  ];
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState(defaultColumn);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
    if (sessionOptions && sessionSeries) {
      if (sessionOptions.chart.type === chartType) {
        setOptions(() => sessionOptions);
        setSeries(() => sessionSeries);
      }
    } else {
      sessionStorage.setItem("chart-options", JSON.stringify(options));
      sessionStorage.setItem("chart-series", JSON.stringify(series));
    }
  }, [dataState]);

  /**
   * This function updates the header name of the first column in a set of columns.
   */
  const handleNameColumn = (columnName, columnType = "string") => {
    setColumns((currentColumns) => {
      // if (Boolean(rowData.length)) {
      //   let tempColumns = [...currentColumns];
      //   tempColumns[0].headerName = columnName;
      //   tempColumns[0].type = columnType;
      //   let tempColumnArray = [];
      //   tempColumnArray.push(tempColumns[0]);
      //   return tempColumnArray;
      // } else {
      let tempColumns = [...currentColumns];
      tempColumns[0].headerName = columnName;
      tempColumns[0].type = columnType;
      return tempColumns;
      // }
    });
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    if (columnType === "string") {
      setOptions(() => {
        let tempOptions = {
          ...sessionOptions,
          xaxis: {
            ...sessionOptions.xaxis,
            name: columnName,
          },
          name: columnName,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        return tempOptions;
      });
      return;
    }
    if (columnType === "number") {
      if (options.default) {
        let tempOptions = {
          ...sessionOptions,
          xaxis: {
            ...sessionOptions.xaxis,
            name: "",
            categories: [],
          },
          name: "",
          default: false,
        };
        sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
        setOptions(tempOptions);

        setSeries(() => {
          let tempSeries = [{ name: columnName, data: [] }];
          sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
          return tempSeries;
        });
        return;
      }

      // Normal
      let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
      setSeries(() => {
        let tempSeries = [...sessionSeries];
        let filteredTempSeries = tempSeries.filter(
          (ser) => ser.name !== columns[0].headerName
        );
        if (!Boolean(columnName)) {
          sessionStorage.setItem(
            "chart-series",
            JSON.stringify(filteredTempSeries)
          );
          return filteredTempSeries;
        } else {
          tempSeries.push({ name: columnName, data: [] });
          sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
          return tempSeries;
        }
      });
    }
  };

  /**
   * The function adds a specified number of rows to an array of rows.
   */
  const handleAddRows = (numberOfRows, columnType) => {
    let tempRows = [...rows];
    let column = columnType === "string" ? "" : 0;
    for (let i = 0; i < numberOfRows; i++) {
      tempRows.push({ id: uuidv4(), column: "" });
    }
    setRows(tempRows);
  };

  const handleEditColumnData = (field, name, type, dataArray) => {
    let tempRows = [];
    for (let i = 0; i < dataArray.length; i++) {
      tempRows.push({ id: uuidv4(), [field]: dataArray[i] });
    }
    setRows(tempRows);
    setColumns((currentColumns) => {
      let tempColumns = [...currentColumns];
      tempColumns[0].field = field;
      tempColumns[0].headerName = name;
      tempColumns[0].type = type;
      return tempColumns;
    });
    setEditMode(true);
  };

  const handleUpdateData = () => {
    setEditMode(false);
    const tempRows = dynamicMap(rows);
    const tempColumn = {
      headerName: columns[0].headerName,
      sortable: false,
      editable: true,
      type: columns[0].type,
      field: columns[0].headerName,
      width: 120,
    };
    handleAddIndicatorData(tempRows, tempColumn);
  };

  function dynamicMap(data) {
    const dynamicKey = Object.keys(data[0]).find((key) => key !== "id");
    const tempArray = data.map((row) => row[dynamicKey]);
    return tempArray;
  }

  /**
   * The function `handleDeleteRow` filters out a row from an array of rows based on its ID and updates the
   * state with the new array.
   */
  const handleDeleteRow = (row, allRows = false) => {
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    if (allRows) {
      setRows(() => {
        setOptions(() => {
          let tempOptions = {
            ...sessionOptions,
            xaxis: {
              ...sessionOptions.xaxis,
              categories: [],
            },
          };
          sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
          return tempOptions;
        });
        return [];
      });
      return;
    } else {
      setRows((currentRows) => {
        const tempRows = currentRows.filter((r) => r.id !== row.id);
        let tempCategories = [];
        tempRows.map((row) => tempCategories.push(row.column));
        setOptions(() => {
          let tempOptions = {
            ...sessionOptions,
            xaxis: {
              ...sessionOptions.xaxis,
              categories: tempCategories,
            },
          };
          sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
          return tempOptions;
        });
        return tempRows;
      });
    }
  };

  /**
   * This function updates a specific row in an array of rows and returns the updated row.
   * @returns the `updatedRow` object.
   */
  const handleProcessRowUpdate = (updatedRow, originalRow) => {
    const rowIndex = rows.findIndex((row) => row.id === updatedRow.id);
    const updatedRows = [...rows];
    updatedRows[rowIndex] = updatedRow;
    setRows(updatedRows);
    const tempArray = dynamicMap(updatedRows);

    if (openEditor.axis === "xaxis") {
      handleSetXAxisOptions(columns[0].headerName, tempArray);
    }
    if (openEditor.axis === "yaxis") {
      handleSetYAxisSeries(columns[0].headerName, tempArray);
    }
    return updatedRow;
  };

  const handleCofirmAddData = () => {
    const tempRows = rows.map((row) => row.column);
    const tempColumn = {
      headerName: columns[0].headerName,
      sortable: false,
      editable: true,
      type: columns[0].type,
      field: columns[0].headerName,
      width: 120,
    };
    handleAddIndicatorData(tempRows, tempColumn);
    setColumns(defaultColumn);
    setRows([]);
  };

  const handleSetXAxisOptions = (
    categoricalColumnName,
    categoricalColumnDataArray
  ) => {
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
    setOptions(() => {
      let tempOptions = {
        ...sessionOptions,
        xaxis: {
          ...sessionOptions.xaxis,
          name: categoricalColumnName,
        },
        name: categoricalColumnName,
      };
      sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
      return tempOptions;
    });

    let tempSeries = [];
    setXAxis(categoricalColumnDataArray);
    if (Boolean(yAxis.length)) {
      yAxis.forEach((y, index) =>
        tempSeries.push([categoricalColumnDataArray[index], y])
      );
      setSeries(() => {
        sessionStorage.setItem(
          "chart-series",
          JSON.stringify([{ name: sessionSeries[0].name, data: tempSeries }])
        );
        return [{ name: sessionSeries[0].name, data: tempSeries }];
      });
      return;
    }
    categoricalColumnDataArray.forEach((temp) => {
      tempSeries.push([0, temp]);
    });
    setSeries(() => {
      sessionStorage.setItem(
        "chart-series",
        JSON.stringify([{ name: sessionSeries[0].name, data: tempSeries }])
      );
      return [{ name: sessionSeries[0].name, data: tempSeries }];
    });
  };

  const handleDeleteCategoricalOptions = () => {
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    setOptions(() => {
      let tempOptions = {
        ...sessionOptions,
        xaxis: {
          ...sessionOptions.xaxis,
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

  const handleSetYAxisSeries = (
    numericalColumnName,
    numericalColumnDataArray
  ) => {
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    setOptions(() => {
      let tempOptions = {
        ...sessionOptions,
        seriesName: numericalColumnName,
      };
      sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
      return tempOptions;
    });

    let tempSeries = [];
    if (Boolean(xAxis.length)) {
      xAxis.forEach((x, index) =>
        tempSeries.push([x, numericalColumnDataArray[index]])
      );
      setSeries(() => {
        sessionStorage.setItem(
          "chart-series",
          JSON.stringify([{ name: numericalColumnName, data: tempSeries }])
        );
        return [{ name: numericalColumnName, data: tempSeries }];
      });
      setYAxis(numericalColumnDataArray);
      return;
    }
    numericalColumnDataArray.forEach((temp) => {
      tempSeries.push([temp, 0]);
    });
    setYAxis(numericalColumnDataArray);
    setSeries(() => {
      sessionStorage.setItem(
        "chart-series",
        JSON.stringify([{ name: numericalColumnName, data: tempSeries }])
      );
      return [{ name: numericalColumnName, data: tempSeries }];
    });
  };

  const handleDeleteNumericalSeries = (seriesName) => {
    let filterSeries = series.filter((ser) => ser.name !== seriesName);
    setSeries(filterSeries);
  };

  // Method to count the number of occurrences of each unique value
  const handleSetCountOccurrences = (
    categoricalColumnName,
    uniqueColumnDataArray,
    uniqueColumnDataCountArray
  ) => {
    let sessionOptions = JSON.parse(sessionStorage.getItem("chart-options"));
    let sessionSeries = JSON.parse(sessionStorage.getItem("chart-series"));
    setOptions(() => {
      let tempOptions = {
        ...sessionOptions,
        xaxis: {
          ...sessionOptions.xaxis,
          name: `${categoricalColumnName} (Unique)`,
          categories: uniqueColumnDataArray,
          unique: true,
        },
        name: categoricalColumnName,
      };
      sessionStorage.setItem("chart-options", JSON.stringify(tempOptions));
      return tempOptions;
    });
    setSeries(() => {
      let tempSeries = [...sessionSeries];
      tempSeries.push({
        name: "Count",
        data: uniqueColumnDataCountArray,
      });
      sessionStorage.setItem("chart-series", JSON.stringify(tempSeries));
      return tempSeries;
    });
  };

  return (
    <>
      <Grid container sx={{ minHeight: "45vh" }}>
        <Grid item xs={openEditor.open ? 8 : 12}>
          <Grid container alignItems="center">
            <Grid item xs={12} md={2}>
              <YAxisDropdown
                axisLabel={"Y-Axis: Numerical Title"}
                series={series}
                dataState={dataState}
                handleSetYAxisSeries={handleSetYAxisSeries}
                handleDeleteNumericalSeries={handleDeleteNumericalSeries}
                openEditor={openEditor}
                handleAddRows={handleAddRows}
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
                <Grid item xs={12} sx={{ minHeight: "37vh" }}>
                  <Chart
                    options={options}
                    series={series}
                    type={chartType}
                    height="100%"
                  />
                </Grid>
                <Grid item sx={{ mt: 2 }}>
                  <XAxisDropdown
                    axisLabel={"X-Axis: Numerical Title"}
                    series={series}
                    options={options}
                    dataState={dataState}
                    handleSetXAxisOptions={handleSetXAxisOptions}
                    handleDeleteCategoricalOptions={
                      handleDeleteCategoricalOptions
                    }
                    handleSetCountOccurrences={handleSetCountOccurrences}
                    openEditor={openEditor}
                    handleAddRows={handleAddRows}
                    handleNameColumn={handleNameColumn}
                    handleEditColumnData={handleEditColumnData}
                    toggleEditPanel={toggleEditPanel}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {openEditor.open && (
          <Grid item xs={4}>
            <EditPanel
              columns={columns}
              dataState={dataState}
              editMode={editMode}
              rows={rows}
              openEditor={openEditor}
              toggleEditPanel={toggleEditPanel}
              handleAddRows={handleAddRows}
              handleCofirmAddData={handleCofirmAddData}
              handleDeleteRow={handleDeleteRow}
              handleNameColumn={handleNameColumn}
              handleProcessRowUpdate={handleProcessRowUpdate}
              handleUpdateData={handleUpdateData}
            />
          </Grid>
        )}
      </Grid>
    </>
  );
}
