import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  Done as DoneIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import BarChart from "./charts/bar-chart.jsx";
import BoxPlot from "./charts/box-plot.jsx";
import ChartList from "./components/chart-list.jsx";
import DotChart from "./charts/dot-chart.jsx";
import LineChart from "./charts/line-chart.jsx";
import GroupedBarChart from "./charts/grouped-bar-chart.jsx";
import Heatmap from "./charts/heatmap.jsx";
import PieChart from "./charts/pie-chart/pie-chart.jsx";
import PolarAreaChart from "./charts/pie-chart/polar-area-chart.jsx";
import ScatterPl from "./charts/scatter-plot/scatter-plot.jsx";
import StackedBarChart from "./charts/stacked-bar-chart.jsx";
import Treemap from "./charts/treemap.jsx";

export default function VisualizationSelection({
  openEditor,
  toggleEditPanel,
  chartSelected,
  setChartSelected,
  dataState,
  handleAddIndicatorData,
  handleAddNewRows,
  handleDeleteIndicatorData,
}) {
  const [openChart, setOpenChart] = useState({
    open: false,
    archorEl: null,
  });
  const [typeSelected, setTypeSelected] = useState({
    type: { name: "", image: "", description: "" },
    openFilter: false,
  });

  useEffect(() => {
    let currentISC = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
    if (currentISC?.chartType) {
      setChartSelected(currentISC.chartType);
    }
  }, []);

  const handleTypeSelected = useCallback(
    (type) => {
      setTypeSelected((prevState) => ({
        ...prevState,
        type,
      }));
    },
    [setTypeSelected],
  );

  const handleShowDetails = useCallback(() => {
    setChartSelected((prevState) => ({
      ...prevState,
      showDetails: !prevState.showDetails,
    }));
  }, [setChartSelected]);

  const handleOpenCharts = (event) => {
    setOpenChart({
      ...openChart,
      open: !openChart.open,
      anchorEl: Boolean(openChart.archorEl) ? null : event.currentTarget,
    });
  };

  return (
    <>
      <Grid container justifyContent="space-between" spacing={2} sx={{ pb: 4 }}>
        <Grid item>
          {Boolean(chartSelected?.name) && (
            <Grid container alignItems="center" spacing={1}>
              <Grid item>
                <Typography variant="body2">Change chart: </Typography>
              </Grid>
              <Grid item>
                <Chip
                  color="primary"
                  deleteIcon={<EditIcon color="primary" />}
                  label={chartSelected.name}
                  onDelete={handleOpenCharts}
                  onClick={handleOpenCharts}
                  variant="outlined"
                />
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>

      <ChartCanvas
        openEditor={openEditor}
        toggleEditPanel={toggleEditPanel}
        dataState={dataState}
        handleAddIndicatorData={handleAddIndicatorData}
        handleAddNewRows={handleAddNewRows}
        handleDeleteIndicatorData={handleDeleteIndicatorData}
        chartSelected={chartSelected}
        handleOpenCharts={handleOpenCharts}
      />

      {/* // TODO: This has to be a separate component */}
      <Dialog
        open={openChart.open}
        onClose={handleOpenCharts}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Grid container justifyContent="space-between">
            <Grid item xs>
              Charts
              <Typography gutterBottom>
                Select a chart based on the recommendation of possible chart
                types and/or available data
              </Typography>
            </Grid>
            <Grid item>
              <IconButton onClick={handleOpenCharts}>
                <CloseIcon />
              </IconButton>
            </Grid>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <ChartList
            dataState={dataState}
            chartSelected={chartSelected}
            setChartSelected={setChartSelected}
            toggleEditPanel={toggleEditPanel}
          />
        </DialogContent>

        <DialogActions>
          {chartSelected?.name && (
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleOpenCharts}
              startIcon={<DoneIcon />}
            >
              Select
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}

const ChartCanvas = ({
  openEditor,
  toggleEditPanel,
  dataState,
  handleAddIndicatorData,
  handleAddNewRows,
  handleDeleteIndicatorData,
  chartSelected: { code },
  handleOpenCharts,
}) => {
  useEffect(() => {}, [code]);
  return (
    <>
      {code === "bar" ? (
        <BarChart
          openEditor={openEditor}
          toggleEditPanel={toggleEditPanel}
          dataState={dataState}
          handleAddIndicatorData={handleAddIndicatorData}
          handleAddNewRows={handleAddNewRows}
          handleDeleteIndicatorData={handleDeleteIndicatorData}
        />
      ) : code === "box" ? (
        <BoxPlot />
      ) : code === "dot" ? (
        <DotChart
          openEditor={openEditor}
          toggleEditPanel={toggleEditPanel}
          dataState={dataState}
          handleAddIndicatorData={handleAddIndicatorData}
          handleAddNewRows={handleAddNewRows}
          handleDeleteIndicatorData={handleDeleteIndicatorData}
        />
      ) : code === "heatmap" ? (
        <Heatmap />
      ) : code === "histogram" ? (
        <BarChart dataState={dataState} histogram={true} />
      ) : code === "line" ? (
        <LineChart
          openEditor={openEditor}
          toggleEditPanel={toggleEditPanel}
          dataState={dataState}
          handleAddIndicatorData={handleAddIndicatorData}
          handleAddNewRows={handleAddNewRows}
          handleDeleteIndicatorData={handleDeleteIndicatorData}
        />
      ) : code === "pie" ? (
        <PieChart
          openEditor={openEditor}
          toggleEditPanel={toggleEditPanel}
          dataState={dataState}
          handleAddIndicatorData={handleAddIndicatorData}
          handleAddNewRows={handleAddNewRows}
          handleDeleteIndicatorData={handleDeleteIndicatorData}
        />
      ) : code === "polar-area" ? (
        <PolarAreaChart
          openEditor={openEditor}
          toggleEditPanel={toggleEditPanel}
          dataState={dataState}
          handleAddIndicatorData={handleAddIndicatorData}
          handleAddNewRows={handleAddNewRows}
          handleDeleteIndicatorData={handleDeleteIndicatorData}
        />
      ) : code === "scatter-plot" ? (
        <ScatterPl
          openEditor={openEditor}
          toggleEditPanel={toggleEditPanel}
          dataState={dataState}
          handleAddIndicatorData={handleAddIndicatorData}
          handleAddNewRows={handleAddNewRows}
          handleDeleteIndicatorData={handleDeleteIndicatorData}
        />
      ) : code === "stacked-bar" ? (
        <StackedBarChart
          openEditor={openEditor}
          toggleEditPanel={toggleEditPanel}
          dataState={dataState}
          handleAddIndicatorData={handleAddIndicatorData}
          handleAddNewRows={handleAddNewRows}
          handleDeleteIndicatorData={handleDeleteIndicatorData}
        />
      ) : code === "grouped-bar" ? (
        <GroupedBarChart
          openEditor={openEditor}
          toggleEditPanel={toggleEditPanel}
          dataState={dataState}
          handleAddIndicatorData={handleAddIndicatorData}
          handleAddNewRows={handleAddNewRows}
          handleDeleteIndicatorData={handleDeleteIndicatorData}
        />
      ) : code === "treemap" ? (
        <Treemap />
      ) : (
        <Grid
          container
          alignItems="center"
          justifyContent="center"
          direction="column"
        >
          <Grid item>
            <Typography sx={{ mb: 2 }}>Start by selecting a chart</Typography>
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
              onClick={handleOpenCharts}
            >
              <Typography variant="h6" align="center">
                Select Chart
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}
    </>
  );
};
