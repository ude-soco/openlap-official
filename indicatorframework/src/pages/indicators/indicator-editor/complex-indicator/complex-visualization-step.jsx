import PropTypes from "prop-types";
import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SectionCard from "../../../../common/components/section-card/section-card";
import ChartPreview from "../components/chart-preview";
import {
  defaultParams,
  visualizationImages,
} from "../basic-indicator/components/visualization/utils/visualization-data";
import { getChartCompatibility } from "../basic-indicator/components/visualization/utils/chart-compatibility";
import {
  datasetColumns,
  defaultMappings,
  mappingsReady,
} from "./complex-model";
import {
  ChartCustomization,
  ColumnMappings,
  Failure,
} from "./complex-controls";

export default function ComplexVisualizationStep({
  libraryId,
  change,
  libraries,
  isMulti,
  configuration,
  chartLoading,
  types,
  chartDataset,
  supportsSeries,
  selectedType,
  operationError,
  setCatalogRetry,
  busy,
  previewChart,
  previewCurrent,
  preview,
  setSaveOpen,
  id,
}) {
  const [showAllCharts, setShowAllCharts] = useState(false);
  const chartOptions = types.map((chart) => ({
    chart,
    disabled:
      getChartCompatibility(chart, chartDataset?.columns || {}).status ===
        "needs-data" || !supportsSeries(chart),
  }));
  const unavailableCount = chartOptions.filter(
    (option) => option.disabled,
  ).length;
  return (
    <>
      <SectionCard
        title="Visualization library"
        helper="Choose an installed chart library, then a chart suited to the resulting data."
      >
        <TextField
          fullWidth
          select
          label="Library"
          value={libraryId}
          onChange={(event) =>
            change((previous) => ({
              ...previous,
              visualization: {
                ...previous.visualization,
                libraryId: event.target.value,
                typeId: "",
                mapping: { mapping: [] },
              },
            }))
          }
        >
          {libraries.map((library) => (
            <MenuItem key={library.id} value={library.id}>
              {library.name}
            </MenuItem>
          ))}
        </TextField>
      </SectionCard>
      {!isMulti && (
        <TextField
          select
          label="Compare measures"
          value={configuration.visualization.dataMode}
          onChange={(event) =>
            change((previous) => ({
              ...previous,
              visualization: {
                ...previous.visualization,
                dataMode: event.target.value,
                typeId: "",
                mapping: { mapping: [] },
              },
            }))
          }
          helperText="Compare all measures uses a series label for each source. Individual columns support charts such as scatter plots."
        >
          <MenuItem value="combined">All measures by source</MenuItem>
          <MenuItem value="individual">Individual measure columns</MenuItem>
        </TextField>
      )}
      {chartLoading && <LinearProgress aria-label="Loading chart types" />}
      {libraryId && !chartLoading && (
        <SectionCard
          title="Chart"
          helper="Compatibility checks column types. Choose a chart that answers your question."
          action={
            unavailableCount > 0 && (
              <Button
                size="small"
                onClick={() => setShowAllCharts((value) => !value)}
              >
                {showAllCharts ? "Show compatible charts" : "Show all charts"}
              </Button>
            )
          }
        >
          {unavailableCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              {unavailableCount} charts need other columns or mappings.
              Comparing all measures requires a chart with separate category and
              series inputs.
            </Typography>
          )}
          <Grid container spacing={2}>
            {chartOptions
              .filter((option) => showAllCharts || !option.disabled)
              .map(({ chart, disabled }) => {
                return (
                  <Grid size={{ xs: 6, sm: 4, lg: 3 }} key={chart.id}>
                    <Paper
                      variant="outlined"
                      sx={{
                        borderColor:
                          chart.id === selectedType?.id
                            ? "primary.main"
                            : "divider",
                        borderWidth: chart.id === selectedType?.id ? 2 : 1,
                        height: "100%",
                      }}
                    >
                      <ButtonBase
                        disabled={disabled}
                        onClick={() =>
                          change((previous) => ({
                            ...previous,
                            visualization: {
                              ...previous.visualization,
                              typeId: chart.id,
                              mapping: defaultMappings(
                                chart.chartInputs,
                                chartDataset,
                              ),
                              params: {
                                ...defaultParams,
                                ...previous.visualization.params,
                              },
                            },
                          }))
                        }
                        aria-pressed={chart.id === selectedType?.id}
                        aria-label={`Select ${chart.name}`}
                        sx={{
                          p: 2,
                          width: "100%",
                          minHeight: 176,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        {visualizationImages[chart.imageCode] && (
                          <Box
                            aria-hidden
                            sx={{ "& svg": { width: 48, height: 48 } }}
                            dangerouslySetInnerHTML={{
                              __html: visualizationImages[chart.imageCode],
                            }}
                          />
                        )}
                        <Typography
                          align="center"
                          sx={{
                            minHeight: 40,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {chart.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={disabled ? "Needs other data" : "Compatible"}
                          color={disabled ? "default" : "success"}
                        />
                      </ButtonBase>
                    </Paper>
                  </Grid>
                );
              })}
          </Grid>
          {!chartOptions.some((option) => !option.disabled) &&
            types.length > 0 && (
              <Alert severity="info">
                No chart has the required inputs for this data view. Choose
                another library or use individual measure columns.
              </Alert>
            )}
          {!types.length && (
            <Alert severity="info">
              No chart types are available in this library.
            </Alert>
          )}
        </SectionCard>
      )}
      {selectedType && (
        <>
          {!isMulti &&
            configuration.visualization.dataMode === "combined" &&
            (selectedType.chartInputs || []).filter(
              (input) => input.type === "Text",
            ).length < 2 && (
              <Alert severity="warning">
                This chart has no separate series input. For comparing all
                sources, choose a grouped chart with a series/group field.
              </Alert>
            )}
          <ColumnMappings
            inputs={selectedType.chartInputs || []}
            dataset={chartDataset}
            mapping={configuration.visualization.mapping}
            onChange={(mapping) =>
              change((previous) => ({
                ...previous,
                visualization: { ...previous.visualization, mapping },
              }))
            }
            title="Configure chart"
            helper="Review the suggested columns. Mapping labels identify their source."
          />
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Customize chart</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ChartCustomization
                params={{
                  ...defaultParams,
                  ...configuration.visualization.params,
                }}
                onChange={(params) =>
                  change((previous) => ({
                    ...previous,
                    visualization: { ...previous.visualization, params },
                  }))
                }
                chartConfiguration={selectedType.chartConfiguration || {}}
                categories={
                  datasetColumns(chartDataset).find(
                    (column) => column.configurationData.type === "Text",
                  )?.data || []
                }
              />
            </AccordionDetails>
          </Accordion>
        </>
      )}
      <Failure
        message={
          operationError.step === "visualization" ? operationError.message : ""
        }
        retry={
          operationError.step === "visualization" && !selectedType
            ? () => setCatalogRetry((value) => value + 1)
            : undefined
        }
      />
      <Button
        variant="outlined"
        disabled={
          !selectedType ||
          !supportsSeries(selectedType) ||
          !mappingsReady(
            selectedType.chartInputs,
            configuration.visualization.mapping,
            chartDataset,
          ) ||
          Boolean(busy)
        }
        onClick={previewChart}
      >
        {busy === "visualization" ? (
          <CircularProgress size={20} />
        ) : (
          "Generate chart preview"
        )}
      </Button>
      {previewCurrent && (
        <SectionCard
          title="Chart preview"
          helper="This preview uses the current sources and configuration."
        >
          <ChartPreview previewData={preview} responsive />
        </SectionCard>
      )}
      <Alert severity={previewCurrent ? "success" : "info"}>
        {previewCurrent
          ? "Chart preview is ready. Review your indicator and save it."
          : "Generate a chart preview before saving. Changes to earlier steps require a new preview."}
      </Alert>
      <Button
        variant="contained"
        disabled={!previewCurrent || Boolean(busy)}
        onClick={() => setSaveOpen(true)}
      >
        {id ? "Review changes" : "Save indicator"}
      </Button>
    </>
  );
}
ComplexVisualizationStep.propTypes = {
  libraryId: PropTypes.string,
  change: PropTypes.func,
  libraries: PropTypes.array,
  isMulti: PropTypes.bool,
  configuration: PropTypes.object,
  chartLoading: PropTypes.bool,
  types: PropTypes.array,
  chartDataset: PropTypes.object,
  supportsSeries: PropTypes.func,
  selectedType: PropTypes.object,
  operationError: PropTypes.object,
  setCatalogRetry: PropTypes.func,
  busy: PropTypes.string,
  previewChart: PropTypes.func,
  previewCurrent: PropTypes.bool,
  preview: PropTypes.object,
  setSaveOpen: PropTypes.func,
  id: PropTypes.string,
};
