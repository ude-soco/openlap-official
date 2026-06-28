import { useContext, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  ButtonBase,
  Chip,
  Collapse,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import RecommendRoundedIcon from "@mui/icons-material/RecommendRounded";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { BasicContext } from "../../../basic-indicator";
import { visualizationImages, defaultParams } from "../utils/visualization-data";
import SectionCard from "../../../../../../../common/components/section-card/section-card";
import {
  buildRequirementText,
  categorizeCharts,
} from "../utils/chart-compatibility";

const STATUS_ARIA = {
  recommended: "recommended for your data",
  compatible: "compatible with your data",
  "needs-data": "requires additional data",
};

const StatusChip = ({ status }) => {
  if (status === "recommended") {
    return (
      <Chip
        size="small"
        color="success"
        icon={<RecommendRoundedIcon />}
        label="Recommended"
      />
    );
  }
  if (status === "compatible") {
    return <Chip size="small" variant="outlined" label="Compatible" />;
  }
  return (
    <Chip
      size="small"
      variant="outlined"
      color="warning"
      label="Requires additional data"
    />
  );
};
StatusChip.propTypes = { status: PropTypes.string };

const TypeSelection = () => {
  const { analysis, visualization, setVisualization } =
    useContext(BasicContext);
  // "Requires additional data" is collapsed by default, but the header + a short
  // explanation stay visible so it's discoverable.
  const [showNeedsData, setShowNeedsData] = useState(false);

  const handleSelectVisualizationType = async (typeSelected) => {
    setVisualization((p) => ({
      ...p,
      selectedType: typeSelected,
      inputs: [...typeSelected.chartInputs],
      params: { ...defaultParams },
      mapping: { mapping: [] },
      previewData: { displayCode: [], scriptData: {} },
    }));
  };

  const groups = categorizeCharts(
    visualization.typeList,
    analysis.analyzedData
  );

  const renderChartCard = ({ type, compat }) => {
    const svg = visualizationImages[type.imageCode];
    if (!svg) return null;
    const selected = visualization.selectedType.id === type.id;
    const incompatible = compat.status === "needs-data";
    const requirementText = incompatible
      ? buildRequirementText(compat.conditions)
      : "";

    return (
      <Grid
        key={type.id ?? type.imageCode}
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
        <ButtonBase
          onClick={() => handleSelectVisualizationType(type)}
          aria-pressed={selected}
          aria-label={`${type.name}. ${STATUS_ARIA[compat.status]}.`}
          sx={{ width: "100%", height: "100%", p: 2 }}
        >
          <Stack
            gap={1}
            alignItems="center"
            sx={{ height: "100%", width: "100%" }}
          >
            <Box
              aria-hidden
              sx={{ "& svg": { width: 56, height: 56 } }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
            {/* Reserve ~2 lines so icons stay aligned regardless of name length. */}
            <Typography
              variant="body2"
              align="center"
              fontWeight={600}
              sx={{
                minHeight: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {type.name}
            </Typography>
            {/* mt:auto pins the badge to the same vertical position on every card. */}
            <Stack
              alignItems="center"
              gap={0.5}
              sx={{ mt: "auto", width: "100%" }}
            >
              <StatusChip status={compat.status} />
              {incompatible && requirementText && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  align="center"
                >
                  {requirementText}
                </Typography>
              )}
            </Stack>
          </Stack>
        </ButtonBase>
      </Grid>
    );
  };

  const renderGroup = (title, entries) =>
    entries.length > 0 ? (
      <Stack gap={1.5} key={title}>
        <Typography variant="subtitle2" component="h4">
          {title}
        </Typography>
        <Grid container spacing={2.5}>
          {entries.map(renderChartCard)}
        </Grid>
      </Stack>
    ) : null;

  return (
    <SectionCard
      title="Recommended visualizations"
      helper="Charts are grouped by how well they fit your analysed data."
    >
      <Stack gap={4}>
        {renderGroup("Recommended for your data", groups.recommended)}
        {renderGroup("Alternative visualizations", groups.compatible)}

        {groups.needsData.length > 0 && (
          <Stack gap={1}>
            <ButtonBase
              onClick={() => setShowNeedsData((s) => !s)}
              aria-expanded={showNeedsData}
              sx={{
                alignSelf: "flex-start",
                justifyContent: "flex-start",
                gap: 0.5,
                px: 1,
                py: 0.5,
                borderRadius: 1,
                "&:hover": { bgcolor: "action.hover" },
              }}
            >
              {showNeedsData ? (
                <ExpandLessIcon fontSize="small" />
              ) : (
                <ExpandMoreIcon fontSize="small" />
              )}
              <Typography variant="subtitle2" component="h4">
                Requires additional data ({groups.needsData.length})
              </Typography>
            </ButtonBase>
            <Typography variant="body2" color="text.secondary">
              These charts need data types your current analysis doesn’t
              produce.
              {showNeedsData ? "" : " Expand to see what each one needs."}
            </Typography>
            <Collapse in={showNeedsData} unmountOnExit>
              <Grid container spacing={2.5} sx={{ pt: 1 }}>
                {groups.needsData.map(renderChartCard)}
              </Grid>
            </Collapse>
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
};

export default TypeSelection;
