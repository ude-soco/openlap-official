import React, { useState, useEffect, useContext } from "react";
import Grid from "@mui/material/Grid2";
import Chart from "react-apexcharts";
import { CustomThemeContext } from "../../../../setup/theme-manager/theme-context-manager";

export default function PreviewChart({ visRef }) {
  const { darkMode } = useContext(CustomThemeContext);
  const [state, setState] = useState({
    series: [],
    options: {
      chart: {
        id: visRef.chart.code,
        type: visRef.chart.code,
        stacked: false,
        width: "100%",
        foreColor: darkMode ? "#ffffff" : "#000000",
        toolbar: {
          show: false,
          autoSelected: "zoom",
        },
        zoom: {
          enabled: true,
        },
      },
      title: {
        text: "",
        align: "left",
        style: {
          fontSize: 18,
          cssClass: "x-y-axis-hide-title",
        },
      },
      subtitle: {
        text: "",
        align: "left",
        margin: 15,
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          horizontal: false,
          grouped: false,
          dataLabels: {
            position: "center",
          },
        },
      },
      dataLabels: {
        enabled: true,
        style: {
          colors: ["#000000"],
          fontWeight: 400,
        },
        background: {
          enabled: false,
          foreColor: "#ffffff",
          padding: 10,
          borderRadius: 2,
          borderWidth: 1,
          borderColor: "#ffffff",
        },
      },
      xaxis: {
        name: "",
        title: {
          text: "",
          style: {
            cssClass: "x-y-axis-show-title",
          },
        },
        categories: [],
        labels: {
          show: true,
        },
      },
      yaxis: {
        title: {
          text: "",
          style: {
            cssClass: "x-y-axis-show-title",
          },
        },
        labels: {
          show: true,
        },
      },
      legend: {
        show: true,
        showForSingleSeries: true,
        position: "bottom",
        horizontalAlign: "center",
        labels: {
          colors: undefined,
          useSeriesColors: false,
        },
        onItemClick: {
          toggleDataSeries: false,
        },
      },
      tooltip: {
        enabled: true,
        followCursor: true,
        theme: darkMode ? "dark" : "light",
        onDatasetHover: {
          highlightDataSeries: true,
        },
      },
    },
  });

  useEffect(() => {
    setState((prevState) => ({
      ...prevState,
      series: visRef.data.series,
      options: {
        ...visRef.data.options,
        chart: {
          ...visRef.data.options.chart,
          foreColor: darkMode ? "#ffffff" : "#000000",
        },
        tooltip: {
          ...visRef.data.options.tooltip,
          theme: darkMode ? "dark" : "light",
        },
      },
      axisOptions: visRef.data.axisOptions,
    }));
  }, [visRef, darkMode]);

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }} sx={{ minHeight: 600 }}>
          <Chart
            options={state.options}
            series={state.series}
            type={visRef.chart.code}
            height="100%"
          />
        </Grid>
      </Grid>
    </>
  );
}
