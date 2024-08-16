import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Collapse,
  Grid,
  Grow,
  IconButton,
  Link,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from "@mui/icons-material";
import availableFilters from "../../../utils/data/filterTypesList.js";
import availableCharts from "../../../utils/data/chartTypes.js";
import recommendChart from "../../../../../assets/images/others/recommend.svg";

export default function ChartList({
  chartSelected,
  setChartSelected,
  dataState: { rowData, columnData },
  toggleEditPanel,
}) {
  const [dataTypes, setDataTypes] = useState({
    categorical: 0,
    numerical: 0,
    categoricalOrdinal: 0,
  });
  const [typeSelected, setTypeSelected] = useState({
    type: { name: "", image: "", description: "" },
    openFilter: true,
  });

  useEffect(() => {
    const updateDataTypes = () => {
      let categorical = 0;
      let numerical = 0;
      let categoricalOrdinal = 0;
      columnData.forEach((column) => {
        if (column.type === "string") {
          categorical += 1;
        } else if (column.type === "number") {
          numerical += 1;
        }
        // else if (column.headerName === "Categorical (ordinal)") {
        //   categoricalOrdinal += 1;
        // }
      });
      setDataTypes({
        categorical,
        numerical,
        categoricalOrdinal,
      });
    };
    updateDataTypes();
  }, [columnData]);

  const handleTypeSelected = useCallback(
    (type) => {
      setTypeSelected((prevState) => ({
        ...prevState,
        type,
      }));
      toggleEditPanel("", false);
    },
    [setTypeSelected],
  );

  const handleTypeOpenFilter = useCallback(() => {
    setTypeSelected((prevState) => ({
      ...prevState,
      openFilter: !prevState.openFilter,
    }));
  }, [setTypeSelected]);

  const handleChartSelected = useCallback(
    (chart) => {
      let currentISC = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
      toggleEditPanel("", false);
      let tempCurrentISC = {
        ...currentISC,
        chartType: chart,
      };
      sessionStorage.setItem(
        "openlap-isc-data",
        JSON.stringify(tempCurrentISC),
      );

      setChartSelected((prevState) => ({
        ...prevState,
        ...chart,
      }));
      sessionStorage.removeItem("chart-options");
      sessionStorage.removeItem("chart-series");
    },
    [setChartSelected],
  );

  const handleShowDetails = useCallback(() => {
    setChartSelected((prevState) => ({
      ...prevState,
      showDetails: !prevState.showDetails,
    }));
  }, [setChartSelected]);

  function countTypes(columnData) {
    let numberCount = 0;
    let stringCount = 0;

    for (const column of columnData) {
      if (column.type === "number") {
        numberCount++;
      } else if (column.type === "string") {
        stringCount++;
      }
    }

    return { numberCount, stringCount };
  }

  return (
    <>
      <Grid container>
        <Grid
          item
          xs={12}
          sx={{ borderRadius: 1, mb: 1, border: "1px solid #C4C4C4" }}
        >
          <Grid
            container
            justifyContent="space-between"
            alignItems="center"
            sx={{ p: 1 }}
          >
            {typeSelected.type.name ? (
              <>
                <Grid item xs sx={{ pl: 1 }}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item>
                      <Typography variant="body2">Type selected:</Typography>
                    </Grid>
                    <Grid item>
                      <Chip
                        label={typeSelected.type.name}
                        onDelete={() =>
                          handleTypeSelected({
                            type: { name: "", image: "", description: "" },
                          })
                        }
                      />
                    </Grid>
                  </Grid>
                </Grid>
              </>
            ) : (
              <Grid item xs sx={{ pl: 1 }}>
                <Typography variant="body2" sx={{ pl: 1, fontWeight: "bold" }}>
                  Filter charts by types
                </Typography>
              </Grid>
            )}

            <Grid item>
              <Grid container alignItems="center">
                <Typography variant="body2">
                  {typeSelected.openFilter ? "Hide" : "Show types"}
                </Typography>
                <IconButton size="small" onClick={handleTypeOpenFilter}>
                  {!typeSelected.openFilter ? (
                    <KeyboardArrowDownIcon />
                  ) : (
                    <KeyboardArrowUpIcon />
                  )}
                </IconButton>
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs>
            <Collapse in={typeSelected.openFilter}>
              <Grid container sx={{ pb: 1, px: 0.25 }} justifyContent="center">
                {availableFilters?.map((type, index) => {
                  return (
                    <Tooltip
                      arrow
                      key={index}
                      title={
                        <Typography
                          variant="body2"
                          sx={{ p: 1, whiteSpace: "pre-line" }}
                        >
                          {type.description}
                        </Typography>
                      }
                    >
                      <Grid
                        component={Paper}
                        item
                        sx={{
                          zIndex: 10,
                          cursor: "pointer",
                          p: 1.25,
                          m: 0.5,
                          borderRadius: 1.5,
                          "&:hover": {
                            boxShadow: 5,
                            backgroundColor: "openlapTheme.light",
                          },
                          border:
                            typeSelected.type.name === type.name
                              ? "2px solid #F57C00"
                              : "",
                        }}
                        onClick={() => handleTypeSelected(type)}
                      >
                        <Grid
                          container
                          justifyContent="center"
                          sx={{ width: 70, m: 1 }}
                        >
                          <Box
                            component="img"
                            sx={{ height: 60 }}
                            src={type.image}
                            alt={type.name}
                          />
                          <Typography
                            align="center"
                            variant="body2"
                            sx={{ mt: 0.5 }}
                          >
                            {type.name}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Tooltip>
                  );
                })}
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
        {/* Charts */}
        <Grid
          container
          sx={{ borderRadius: 1, px: 3, py: 2, border: "1px solid #C4C4C4" }}
        >
          <Grid container>
            <Typography
              sx={{ fontWeight: "bold" }}
              variant="body2"
              gutterBottom
            >
              Available charts
            </Typography>
          </Grid>
          {typeSelected.type.name && (
            <Grid container justifyContent="center" sx={{ pb: 2 }}>
              <Typography variant="body2">
                Charts recommended based on chart type:{" "}
                <b>{typeSelected.type.name}</b>
              </Typography>
            </Grid>
          )}
          <Grid container justifyContent="center">
            {availableCharts.map((chart, index) => {
              let validate = Boolean(chart.code === chartSelected.code);
              if (typeSelected.type.name) {
                let found = chart.types.some(
                  (ta) => ta === typeSelected.type.name,
                );
                if (!found) return;
              }
              let matchedDataType =
                chart.Categorical <= dataTypes.categorical &&
                chart.Numerical <= dataTypes.numerical &&
                chart["Categorical (ordinal)"] <= dataTypes.categoricalOrdinal;

              return (
                <Tooltip
                  arrow
                  key={index}
                  title={
                    <Typography
                      variant="body2"
                      sx={{ p: 1, whiteSpace: "pre-line" }}
                    >
                      {chart.shortDesc}
                    </Typography>
                  }
                >
                  <Grid
                    item
                    sx={{
                      cursor: "pointer",
                      p: 1,
                      my: 0.5,
                      borderRadius: 1.5,
                      border: validate ? "2px solid" : "",
                      borderColor: validate ? "openlapTheme.secondary" : "",
                    }}
                    onClick={() => handleChartSelected(chart)}
                  >
                    <Grid container justifyContent="center" sx={{ width: 70 }}>
                      <Box sx={{ position: "relative" }}>
                        <Box
                          component="img"
                          sx={{ height: 60 }}
                          src={chart.image}
                          alt={chart.name}
                        />
                        {matchedDataType && (
                          <Box
                            component="img"
                            sx={{
                              height: 30,
                              top: 0,
                              right: -10,
                              position: "absolute",
                            }}
                            src={recommendChart}
                            alt="recommended chart"
                          />
                        )}
                      </Box>
                      <Typography
                        align="center"
                        variant="body2"
                        sx={{ mt: 0.5 }}
                      >
                        {chart.name}
                      </Typography>
                    </Grid>
                  </Grid>
                </Tooltip>
              );
            })}
          </Grid>
          <Grid container alignItems="center" justifyContent="center">
            {Boolean(rowData.length) && (
              <Grid item sx={{ pt: 2 }}>
                <Grid container justifyContent="space-between" spacing={1}>
                  <Grid item>
                    <Box
                      component="img"
                      sx={{ height: 20 }}
                      src={recommendChart}
                      alt="recommended chart"
                    />
                  </Grid>
                  <Grid item xs>
                    <Typography variant="body2" gutterBottom>
                      Charts recommended based on your dataset
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            )}
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Grow
            {...(Boolean(chartSelected.description) ? { timeout: 1000 } : {})}
            in={Boolean(chartSelected.description)}
          >
            <Grid container sx={{ py: 3 }} spacing={3}>
              <Grid item xs={12} md={6}>
                <Grid container sx={{ pb: 2 }}>
                  <Typography
                    sx={{ fontWeight: "bold" }}
                    variant="body2"
                    gutterBottom
                  >
                    Example preview
                  </Typography>
                  <Grid container justifyContent="center">
                    <Grid
                      item
                      component="img"
                      sx={{
                        width: "100%",
                        alignItems: "center",
                        borderRadius: 2,
                      }}
                      src={chartSelected.descImg1}
                      alt={chartSelected.name}
                    />
                  </Grid>
                </Grid>
              </Grid>
              <Grid item xs={12} md={6}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Grid container>
                      <Typography
                        sx={{ fontWeight: "bold" }}
                        variant="body2"
                        gutterBottom
                      >
                        Short description
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: "pre-line" }}
                        gutterBottom
                      >
                        {chartSelected.shortDesc}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography
                      sx={{ fontWeight: "bold" }}
                      variant="body2"
                      gutterBottom
                    >
                      Data type(s) required
                    </Typography>
                    <Grid container spacing={1}>
                      {chartSelected.Categorical ? (
                        <Grid item>
                          <Chip
                            label={`Categorical: ${chartSelected.Categorical}`}
                          />
                        </Grid>
                      ) : (
                        <></>
                      )}
                      {chartSelected.Numerical ? (
                        <Grid item>
                          <Chip
                            label={`Numerical: ${chartSelected.Numerical}`}
                          />
                        </Grid>
                      ) : (
                        <></>
                      )}
                      {chartSelected["Categorical (ordinal)"] ? (
                        <Grid item>
                          <Chip
                            label={`Categorical (ordinal): ${chartSelected["Categorical (ordinal)"]}`}
                          />
                        </Grid>
                      ) : (
                        <></>
                      )}
                    </Grid>
                  </Grid>

                  <Grid item xs={12}>
                    <Grid item>
                      <Typography
                        gutterBottom
                        sx={{ fontWeight: "bold" }}
                        variant="body2"
                      >
                        Type(s)
                      </Typography>
                      <Grid container spacing={1}>
                        {chartSelected.types?.map((type, index) => (
                          <Grid item key={index}>
                            <Chip label={type} />
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>

              <Grid item xs={12}>
                <Grid container justifyContent="center">
                  <Button
                    onClick={handleShowDetails}
                    endIcon={
                      chartSelected.showDetails ? (
                        <ExpandLessIcon />
                      ) : (
                        <ExpandMoreIcon />
                      )
                    }
                  >
                    {chartSelected.showDetails ? "Hide details" : "Learn more"}
                  </Button>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Collapse in={chartSelected.showDetails}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography
                        sx={{ fontWeight: "bold", pt: 2 }}
                        gutterBottom
                        variant="body2"
                      >
                        Anatomy
                      </Typography>
                      <Box
                        component="img"
                        sx={{ width: "100%" }}
                        src={chartSelected.descImg2}
                        alt={chartSelected.name}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography
                        sx={{ fontWeight: "bold", pt: 2 }}
                        gutterBottom
                        variant="body2"
                      >
                        Description
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ whiteSpace: "pre-line" }}
                        gutterBottom
                      >
                        {chartSelected.description}
                      </Typography>
                      <Typography variant="body2" align="right" sx={{ pt: 4 }}>
                        Source:{" "}
                        <Link href={chartSelected.link} target="_blank">
                          Data Visualization Catalogue
                        </Link>
                      </Typography>
                    </Grid>
                  </Grid>
                </Collapse>
              </Grid>
            </Grid>
          </Grow>
        </Grid>
      </Grid>
    </>
  );
}
