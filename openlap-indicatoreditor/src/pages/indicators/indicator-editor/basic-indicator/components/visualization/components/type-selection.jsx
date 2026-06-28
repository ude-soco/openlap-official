import { useContext, useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  ButtonBase,
  Card,
  CardActionArea,
  Chip,
  Collapse,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RecommendRoundedIcon from "@mui/icons-material/RecommendRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import { BasicContext } from "../../../basic-indicator";
import { visualizationImages, defaultParams } from "../utils/visualization-data";
import SectionCard from "../../../../../../../common/components/section-card/section-card";
import {
  buildRequirementText,
  categorizeCharts,
} from "../utils/chart-compatibility";

const STATUS_ARIA = {
  recommended: "recommended",
  compatible: "compatible",
  "needs-data": "needs more data",
};

const StatusChip = ({ status }) => {
  if (status === "recommended") {
    return (
      <Chip
        size="small"
        color="success"
        variant="outlined"
        icon={<RecommendRoundedIcon />}
        label="Recommended"
      />
    );
  }
  if (status === "compatible") {
    return <Chip size="small" variant="outlined" label="Compatible" />;
  }
  return <Chip size="small" color="warning" variant="outlined" label="Needs data" />;
};

StatusChip.propTypes = { status: PropTypes.string };

const TypeSelection = () => {
  const { analysis, visualization, setVisualization } =
    useContext(BasicContext);
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

  const renderCard = ({ type, compat }) => {
    const svg = visualizationImages[type.imageCode];
    if (!svg) return null;
    const selected = visualization.selectedType.id === type.id;
    const requirementText =
      compat.status === "needs-data"
        ? buildRequirementText(compat.conditions)
        : "";

    return (
      <Grid
        key={type.id ?? type.imageCode}
        size={{ xs: 6, sm: 4, md: 3, lg: 2 }}
        sx={{ display: "flex" }}
      >
        <Card
          variant="outlined"
          sx={(theme) => ({
            width: "100%",
            position: "relative",
            borderRadius: `${theme.custom.radii.card}px`,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? "primary.main" : undefined,
            backgroundColor: selected
              ? alpha(theme.palette.primary.main, 0.06)
              : undefined,
            transition: `border-color ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}`,
          })}
        >
          <CardActionArea
            onClick={() => handleSelectVisualizationType(type)}
            aria-label={`Select ${type.name} chart (${STATUS_ARIA[compat.status]})`}
            aria-pressed={selected}
            sx={{ p: 2, height: "100%" }}
          >
            {selected && (
              <CheckCircleRoundedIcon
                color="primary"
                sx={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  fontSize: 20,
                  bgcolor: "background.paper",
                  borderRadius: "50%",
                }}
              />
            )}
            <Stack
              gap={1}
              alignItems="center"
              justifyContent="space-between"
              sx={{ height: "100%" }}
            >
              <StatusChip status={compat.status} />
              <Box aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />
              <Typography variant="body2" align="center">
                {type.name}
              </Typography>
              {requirementText && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  align="center"
                >
                  {requirementText}
                </Typography>
              )}
            </Stack>
          </CardActionArea>
        </Card>
      </Grid>
    );
  };

  return (
    <SectionCard
      title="Chart"
      helper="Charts are grouped by how well they fit your analysed data."
    >
      {groups.recommended.length > 0 && (
        <Box>
          <Typography
            variant="subtitle2"
            sx={{ color: "success.main", fontWeight: 600, mb: 1 }}
          >
            Recommended
          </Typography>
          <Grid container spacing={2}>
            {groups.recommended.map(renderCard)}
          </Grid>
        </Box>
      )}

      {groups.compatible.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Compatible
          </Typography>
          <Grid container spacing={2}>
            {groups.compatible.map(renderCard)}
          </Grid>
        </Box>
      )}

      {groups.needsData.length > 0 && (
        <Box>
          <ButtonBase
            onClick={() => setShowNeedsData((s) => !s)}
            aria-expanded={showNeedsData}
            sx={{
              width: "100%",
              justifyContent: "flex-start",
              gap: 0.5,
              mb: 1,
              borderRadius: 1,
            }}
          >
            <ExpandMoreRoundedIcon
              fontSize="small"
              sx={{
                transform: showNeedsData ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease",
              }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Requires additional data ({groups.needsData.length})
            </Typography>
          </ButtonBase>
          <Collapse in={showNeedsData} unmountOnExit>
            <Grid container spacing={2}>
              {groups.needsData.map(renderCard)}
            </Grid>
          </Collapse>
        </Box>
      )}

      <Stack
        direction="row"
        gap={1}
        alignItems="center"
        sx={{ color: "text.secondary" }}
      >
        <RecommendRoundedIcon color="success" fontSize="small" />
        <Typography variant="body2">
          Recommendations are based on your analysed data.
        </Typography>
      </Stack>
    </SectionCard>
  );
};

export default TypeSelection;
