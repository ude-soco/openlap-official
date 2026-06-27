import { useState, useContext } from "react";
import {
  Box,
  Button,
  ButtonBase,
  Chip,
  Collapse,
  Divider,
  Grow,
  Grid,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import VisualizationDescription from "./visualization-description";
import RecommendIcon from "@mui/icons-material/Recommend";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { visualizations } from "../../../../utils/data/config";
import { ISCContext } from "../../../../isc-context.js";
import { getChartGroups, getMissingSummary } from "../../utils/chart-compatibility.js";

const VisualizationFilter = () => {
  const { dataset, visRef, setVisRef } = useContext(ISCContext);
  // The "Requires additional data" group is collapsed by default — most users
  // only need the recommended or alternative charts.
  const [showIncompatible, setShowIncompatible] = useState(false);

  const handleSelectVisualization = (chart) => {
    // TODO: Recheck this
    localStorage.removeItem("categories");
    localStorage.removeItem("series");
    if (visRef.chart.type !== chart.type) {
      setVisRef((p) => ({ ...p, chart: chart }));
    } else {
      setVisRef((p) => ({ ...p, chart: { type: "" } }));
    }
  };

  const { recommended, otherCompatible, notCompatible } = getChartGroups(
    visualizations,
    dataset.columns,
    visRef.filter.type
  );

  const sortByType = (list) =>
    [...list].sort((a, b) => a.type.localeCompare(b.type));

  const renderChartCard = (chart, status) => {
    const selected = visRef.chart.type === chart.type;
    const incompatible = status === "incompatible";
    const missingSummary = incompatible
      ? getMissingSummary(chart, dataset.columns)
      : "";

    const statusChip =
      status === "recommended" ? (
        <Chip
          size="small"
          color="success"
          icon={<RecommendIcon />}
          label="Recommended"
        />
      ) : status === "compatible" ? (
        <Chip size="small" variant="outlined" label="Compatible" />
      ) : (
        <Chip size="small" variant="outlined" color="warning" label="Needs data" />
      );

    const ariaLabel = `${chart.type}. ${
      status === "recommended"
        ? "Recommended for your data."
        : status === "compatible"
          ? "Compatible with your data."
          : `Requires ${missingSummary}.`
    } ${chart.description}`;

    return (
      <Grid
        key={chart.type}
        component={Paper}
        variant="outlined"
        size={{ xs: 6, sm: 4, lg: 3 }}
        sx={{
          p: 0,
          overflow: "hidden",
          borderRadius: 1,
          opacity: incompatible ? 0.75 : 1,
          borderStyle: incompatible ? "dashed" : "solid",
          "&:hover": { boxShadow: 5 },
          border: selected ? "2px solid #F57C00" : undefined,
        }}
      >
        <Tooltip
          arrow
          title={
            <Typography variant="body2" sx={{ p: 1, whiteSpace: "pre-line" }}>
              {chart.description}
              {incompatible ? `\n\nRequires ${missingSummary}.` : ""}
            </Typography>
          }
        >
          <ButtonBase
            onClick={() => handleSelectVisualization(chart)}
            aria-pressed={selected}
            aria-label={ariaLabel}
            sx={{ width: "100%", height: "100%", p: 2 }}
          >
            <Stack gap={1} alignItems="center" justifyContent="flex-start" sx={{ height: "100%" }}>
              <Box component="img" src={chart.image} height="56px" alt="" />
              <Typography variant="body2" align="center" fontWeight={600}>
                {chart.type}
              </Typography>
              {statusChip}
              {incompatible && missingSummary && (
                <Typography variant="caption" color="text.secondary" align="center">
                  Requires {missingSummary}
                </Typography>
              )}
            </Stack>
          </ButtonBase>
        </Tooltip>
      </Grid>
    );
  };

  const renderGroup = (title, charts, status) =>
    charts.length > 0 ? (
      <Stack gap={1.5} key={title}>
        <Typography variant="subtitle2" component="h4">
          {title}
        </Typography>
        <Grid container spacing={2}>
          {sortByType(charts).map((chart) => renderChartCard(chart, status))}
        </Grid>
      </Stack>
    ) : null;

  return (
    <>
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle1" component="h3" fontWeight={600}>
            Choose a visualization
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Charts are grouped by how well they fit your data
            {visRef.filter.type ? " and selected task" : ""}.
          </Typography>
        </Box>

        <Stack gap={4}>
          {renderGroup("Recommended for your data", recommended, "recommended")}
          {renderGroup("Alternative visualizations", otherCompatible, "compatible")}

          {notCompatible.length > 0 && (
            <Stack gap={1.5}>
              <Button
                variant="text"
                color="inherit"
                onClick={() => setShowIncompatible((s) => !s)}
                aria-expanded={showIncompatible}
                startIcon={
                  showIncompatible ? <ExpandLessIcon /> : <ExpandMoreIcon />
                }
                sx={{ alignSelf: "flex-start", textTransform: "none" }}
              >
                Requires additional data ({notCompatible.length})
              </Button>
              <Collapse in={showIncompatible} unmountOnExit>
                <Grid container spacing={2}>
                  {sortByType(notCompatible).map((chart) =>
                    renderChartCard(chart, "incompatible")
                  )}
                </Grid>
              </Collapse>
            </Stack>
          )}

          <Grow
            in={Boolean(visRef.chart.type)}
            timeout={{ enter: 500, exit: 0 }}
            unmountOnExit
          >
            <Stack gap={4}>
              <Divider />
              <VisualizationDescription />
            </Stack>
          </Grow>
        </Stack>
      </Stack>
    </>
  );
};

export default VisualizationFilter;
