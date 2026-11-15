import PropTypes from "prop-types";
import { useRef, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import PaletteIcon from "@mui/icons-material/Palette";
import SectionCard from "../../../../common/components/section-card/section-card";
import CustomTooltip from "../../../../common/components/custom-tooltip/custom-tooltip";
import ChartPreview from "../components/chart-preview";
import { defaultParams } from "../basic-indicator/components/visualization/utils/visualization-data";
import {
  getMappedCategoryValues,
  getVisualizationDefaults,
  getVisualizationDescriptor,
} from "../basic-indicator/components/visualization/utils/visualization-descriptor";
import { getChartCompatibility } from "../basic-indicator/components/visualization/utils/chart-compatibility";
import ChartTypeOptions from "../basic-indicator/components/visualization/components/chart-type-options";
import ChartGuidance from "../basic-indicator/components/visualization/components/chart-guidance";
import ReadinessSummary from "../basic-indicator/components/visualization/components/readiness-summary";
import ChartCustomizationControls from "../basic-indicator/components/visualization/components/customization/chart-customization-controls";
import {
  datasetRows,
  defaultMappings,
  mappingsReady,
  sourcesReady,
} from "./complex-model";
import { ColumnMappings, Failure } from "./complex-controls";

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
  previewError = "",
  setCatalogRetry,
  busy,
  previewChart,
  previewCurrent,
  rendererReady,
  saveBlocked = false,
  onRendererStatus,
  preview,
  setSaveOpen,
  id,
}) {
  const [customize, setCustomize] = useState(false);
  const customizeButton = useRef(null);
  const params = getVisualizationDefaults(selectedType, defaultParams, configuration.visualization.params);
  const canPreview = Boolean(
    datasetRows(chartDataset) > 0 &&
      selectedType?.chartInputs?.length &&
      supportsSeries(selectedType) &&
      mappingsReady(
        selectedType.chartInputs,
        configuration.visualization.mapping,
        chartDataset,
      ),
  );
  const hasCompatibleChart = types.some(
    (chart) =>
      supportsSeries(chart) &&
      getChartCompatibility(chart, chartDataset?.columns || {}).status !==
        "needs-data",
  );
  const updateParams = (updater) => {
    const next = typeof updater === "function" ? updater(params) : updater;
    // The shared Basic controls mark local edits; only chart options belong in
    // the complex indicator's persisted visualization parameters.
    const chartParams = { ...next };
    delete chartParams.edited;
    change((previous) => ({
      ...previous,
      visualization: { ...previous.visualization, params: chartParams },
    }));
  };
  const closeCustomization = () => {
    setCustomize(false);
    requestAnimationFrame(() => customizeButton.current?.focus());
  };
  const readinessItems = [
    {
      label: "Basic indicators selected",
      done: configuration.sources.length >= 2,
    },
    {
      label: "Matching columns and measures configured",
      done: sourcesReady(configuration.sources),
    },
    {
      label: isMulti ? "Analysis preview generated" : "Combined data preview generated",
      done: datasetRows(chartDataset) > 0,
    },
    {
      label: "Chart selected and configured",
      done: previewCurrent && rendererReady,
    },
  ];

  return (
    <>
      <SectionCard
        title="Visualization library"
        helper="The library that renders your chart. The default works for most indicators."
      >
        <Stack sx={{ gap: 0.75 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Library
          </Typography>
          <Autocomplete
            disableClearable
            disablePortal
            fullWidth
            options={libraries}
            getOptionLabel={(library) => library.name || ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={libraries.find((library) => library.id === libraryId) || null}
            onChange={(_, library) => {
              if (!library) return;
              change((previous) => ({
                ...previous,
                visualization: {
                  ...previous.visualization,
                  libraryId: library.id,
                  typeId: "",
                  mapping: { mapping: [] },
                },
              }));
            }}
            renderInput={(inputParams) => (
              <TextField
                {...inputParams}
                placeholder="Search for a visualization library"
                slotProps={{
                  ...inputParams.slotProps,
                  htmlInput: {
                    ...inputParams.slotProps.htmlInput,
                    "aria-label": "Visualization library",
                  },
                }}
              />
            )}
            renderOption={(optionProps, library) => {
              const { key, ...restProps } = optionProps;
              return (
                <li key={key} {...restProps}>
                  <Stack sx={{ py: 0.5 }}>
                    <Typography>{library.name}</Typography>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ fontStyle: "italic" }}
                    >
                      {library.description}
                    </Typography>
                  </Stack>
                </li>
              );
            }}
          />
        </Stack>
      </SectionCard>
      {!isMulti && (
        <SectionCard
          title="Comparison data"
          helper="Choose whether to compare all source measures or map individual columns."
        >
          <TextField
            fullWidth
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
            helperText="All measures uses a separate series label for each source. Individual columns support charts such as scatter plots."
          >
            <MenuItem value="combined">All measures by source</MenuItem>
            <MenuItem value="individual">Individual measure columns</MenuItem>
          </TextField>
        </SectionCard>
      )}
      {operationError.step === "visualization" && (
        <Failure message={operationError.message} retry={() => setCatalogRetry((value) => value + 1)} />
      )}
      {chartLoading && (
        <SectionCard title="Chart" helper="Loading available charts…">
          <LinearProgress aria-label="Loading chart types" />
        </SectionCard>
      )}
      {libraryId && !chartLoading && (
        <>
          <ChartTypeOptions
            types={types}
            analyzedData={chartDataset?.columns || {}}
            selectedTypeId={selectedType?.id}
            disableUnavailable
            getUnavailableReason={(chart) =>
              supportsSeries(chart)
                ? ""
                : "Requires separate category and series inputs to compare all sources."
            }
            requirementsHelper={
              !isMulti && configuration.visualization.dataMode === "combined"
                ? "These charts need other columns or separate category and series inputs. Use individual measure columns when a chart has no series input."
                : undefined
            }
            onSelect={(chart) =>
              change((previous) => ({
                ...previous,
                visualization: {
                  ...previous.visualization,
                  typeId: chart.id,
                  mapping: defaultMappings(chart.chartInputs, chartDataset),
                  params: getVisualizationDefaults(chart, defaultParams,
                    previous.visualization.typeId === chart.id ? previous.visualization.params : {}),
                },
              }))
            }
          />
          {!hasCompatibleChart && types.length > 0 && (
            <Alert severity="info">
              No chart has the required inputs for this data view. Choose another
              library
              {isMulti
                ? " or review the analysis output columns."
                : configuration.visualization.dataMode === "combined"
                  ? " or use individual measure columns."
                  : " or compare all measures by source."}
            </Alert>
          )}
          {!types.length && (
            <Alert severity="info">No chart types are available in this library.</Alert>
          )}
        </>
      )}
      {selectedType && (
        <>
          <ChartGuidance chartType={selectedType} analyzedData={chartDataset?.columns || {}} />
          {!supportsSeries(selectedType) && (
            <Alert severity="warning">
              This chart has no separate series input. For comparing all sources,
              choose a grouped chart with a series/group field.
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
            columns={2}
            title="Configure chart"
            helper={`Map each input of ${selectedType.name} to a column from your analysed data.`}
          />
          <Grid container spacing={3} sx={{ alignItems: "flex-start" }}>
            <Grid size={{ xs: 12, lg: customize ? "grow" : 12 }} sx={{ minWidth: 0 }}>
              <SectionCard
                title="Live preview"
                helper="Updates live as you adjust the chart inputs and options."
                action={!customize && (
                  <Button
                    ref={customizeButton}
                    startIcon={<PaletteIcon />}
                    variant="contained"
                    onClick={() => setCustomize(true)}
                  >
                    Customize chart
                  </Button>
                )}
              >
                {busy === "visualization" ? (
                  <Stack sx={{ gap: 1.5, alignItems: "center", justifyContent: "center", minHeight: 360 }}>
                    <CircularProgress aria-label="Generating chart preview" />
                    <Typography variant="body2" color="text.secondary">Generating preview…</Typography>
                  </Stack>
                ) : previewError ? (
                  <Stack sx={{ gap: 2 }}>
                    <Failure message={previewError} />
                    <Stack sx={{ alignItems: "center" }}>
                      <Button
                        variant="contained"
                        disabled={!canPreview || Boolean(busy)}
                        onClick={previewChart}
                      >
                        Retry preview
                      </Button>
                    </Stack>
                  </Stack>
                ) : previewCurrent ? (
                  <ChartPreview previewData={preview} visualizationTypeId={configuration.visualization.typeId} onStatusChange={onRendererStatus} responsive />
                ) : (
                  <Stack sx={{ gap: 2, alignItems: "center", justifyContent: "center", minHeight: 360 }}>
                    {canPreview && <CircularProgress aria-label="Generating chart preview" />}
                    <Typography variant="body2" color="text.secondary" align="center">
                      {canPreview ? "Generating preview…"
                        : "Map each required chart input to a compatible column to generate the preview automatically."}
                    </Typography>
                  </Stack>
                )}
              </SectionCard>
            </Grid>
            {customize && (
              <Grid size={{ xs: 12, lg: "auto" }}>
                <Box component="section" aria-label="Chart customization" sx={{ width: { xs: "100%", lg: 340 } }}>
                  <ChartCustomizationControls
                    state={params}
                    setState={updateParams}
                    chartId={selectedType.id}
                    chartConfiguration={selectedType.chartConfiguration || {}}
                    visualizationDescriptor={getVisualizationDescriptor(selectedType)}
                    categories={getMappedCategoryValues(selectedType, configuration.visualization.mapping, chartDataset)}
                    onClose={closeCustomization}
                  />
                </Box>
              </Grid>
            )}
          </Grid>
        </>
      )}
      <ReadinessSummary items={readinessItems} />
      <Divider sx={{ mt: 1 }} />
      <Grid container spacing={1} sx={{ justifyContent: "center", alignItems: "center", pt: 2 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Button
            fullWidth
            size="large"
            variant="contained"
            aria-label={id ? "Review changes" : "Save indicator"}
            disabled={!previewCurrent || !rendererReady || saveBlocked || Boolean(busy)}
            onClick={() => setSaveOpen(true)}
          >
            {id ? "Review changes" : "Save Indicator"}
          </Button>
        </Grid>
        {!previewCurrent && (
          <Grid size="auto">
            <CustomTooltip type="help" message="The Save button is disabled until:<br/>● Every required chart input is mapped.<br/>● A preview has been generated successfully." />
          </Grid>
        )}
      </Grid>
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
  previewError: PropTypes.string,
  setCatalogRetry: PropTypes.func,
  busy: PropTypes.string,
  previewChart: PropTypes.func,
  previewCurrent: PropTypes.bool,
  rendererReady: PropTypes.bool,
  saveBlocked: PropTypes.bool,
  onRendererStatus: PropTypes.func,
  preview: PropTypes.object,
  setSaveOpen: PropTypes.func,
  id: PropTypes.string,
};
