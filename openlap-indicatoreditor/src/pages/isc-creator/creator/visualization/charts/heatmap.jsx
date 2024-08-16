import { useState } from "react";
import { Box } from "@mui/material";
import Chart from "react-apexcharts";

const Heatmap = () => {
  const [options, setOptions] = useState({
    options: {
      dataLabels: {
        enabled: false,
      },
      colors: ["#008FFB"],
      title: {
        text: "HeatMap Chart (Single color)",
      },
    },
    series: [
      {
        name: "Metric1",
        data: generateData(18, {
          min: 0,
          max: 90,
        }),
      },
      {
        name: "Metric2",
        data: generateData(18, {
          min: 0,
          max: 90,
        }),
      },
      {
        name: "Metric3",
        data: generateData(18, {
          min: 0,
          max: 90,
        }),
      },
      {
        name: "Metric4",
        data: generateData(18, {
          min: 0,
          max: 90,
        }),
      },
      {
        name: "Metric5",
        data: generateData(18, {
          min: 0,
          max: 90,
        }),
      },
      {
        name: "Metric6",
        data: generateData(18, {
          min: 0,
          max: 90,
        }),
      },
      {
        name: "Metric7",
        data: generateData(18, {
          min: 0,
          max: 90,
        }),
      },
      {
        name: "Metric8",
        data: generateData(18, {
          min: 0,
          max: 90,
        }),
      },
      {
        name: "Metric9",
        data: generateData(18, {
          min: 0,
          max: 90,
        }),
      },
    ],
  });

  function generateData(count, yrange) {
    let i = 0;
    let series = [];
    while (i < count) {
      let x = (i + 1).toString();
      let y =
        Math.floor(Math.random() * (yrange.max - yrange.min + 1)) + yrange.min;

      series.push({
        x: x,
        y: y,
      });
      i++;
    }
    return series;
  }

  return (
    <Box sx={{ px: 1.5, height: "57vh" }}>
      <Chart
        options={options.options}
        series={options.series}
        type="heatmap"
        height={"100%"}
      />
    </Box>
  );
};

export default Heatmap;
