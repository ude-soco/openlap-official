import { useState } from "react";
import { Box } from "@mui/material";
import Chart from "react-apexcharts";

const Treemap = () => {
  const [options, setOptions] = useState({
    options: {
      legend: {
        show: false,
      },
      title: {
        text: "Basic Treemap",
      },
    },
    series: [
      {
        data: [
          {
            x: "New Delhi",
            y: 218,
          },
          {
            x: "Kolkata",
            y: 149,
          },
          {
            x: "Mumbai",
            y: 184,
          },
          {
            x: "Ahmedabad",
            y: 55,
          },
          {
            x: "Bangaluru",
            y: 84,
          },
          {
            x: "Pune",
            y: 31,
          },
          {
            x: "Chennai",
            y: 70,
          },
          {
            x: "Jaipur",
            y: 30,
          },
          {
            x: "Surat",
            y: 44,
          },
          {
            x: "Hyderabad",
            y: 68,
          },
          {
            x: "Lucknow",
            y: 28,
          },
          {
            x: "Indore",
            y: 19,
          },
          {
            x: "Kanpur",
            y: 29,
          },
        ],
      },
    ],
  });

  return (
    <Box sx={{ px: 1.5, height: "57vh" }}>
      <Chart
        options={options.options}
        series={options.series}
        type="treemap"
        height={"100%"}
      />
    </Box>
  );
};

export default Treemap;
