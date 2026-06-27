import { useContext, useState } from "react";
import PropTypes from "prop-types";
import { Box, Button, Chip, Collapse, Link, Grid, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import RecommendRoundedIcon from "@mui/icons-material/RecommendRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import { ISCContext } from "../../../../isc-context.js";
import { getChartCompatibility } from "../../utils/chart-compatibility.js";
import { CHART_GUIDANCE } from "../../utils/visualization-copy.js";
import VisualizationLivePreview from "../visualization-live-preview/visualization-live-preview.jsx";

const lowerFirst = (text = "") =>
  text ? text.charAt(0).toLowerCase() + text.slice(1) : text;

// One line: an icon (not color-only) + readable text.
const ReasonRow = ({ ok, children }) => (
  <Stack direction="row" gap={1} alignItems="flex-start">
    {ok ? (
      <CheckCircleRoundedIcon fontSize="small" color="success" sx={{ mt: "2px" }} />
    ) : (
      <ReportProblemOutlinedIcon fontSize="small" color="warning" sx={{ mt: "2px" }} />
    )}
    <Typography variant="body2">{children}</Typography>
  </Stack>
);
ReasonRow.propTypes = { ok: PropTypes.bool, children: PropTypes.node };

const VisualizationDescription = () => {
  const { visRef, dataset } = useContext(ISCContext);
  const chart = visRef.chart;
  const guidance = CHART_GUIDANCE[chart.type];

  const [showReqDetails, setShowReqDetails] = useState(false);

  const compatibility = getChartCompatibility(chart, dataset.columns);
  const matchesTask =
    Boolean(visRef.filter.type) &&
    (chart.filters || []).includes(visRef.filter.type);
  const recommended =
    compatibility.compatible && (matchesTask || !visRef.filter.type);
  const status = !compatibility.compatible
    ? "incompatible"
    : recommended
      ? "recommended"
      : "alternative";

  const statusChip = {
    recommended: { label: "Recommended", color: "success", variant: "filled" },
    alternative: { label: "Alternative", color: "default", variant: "outlined" },
    incompatible: { label: "Requires more data", color: "warning", variant: "outlined" },
  }[status];

  // 2. Why this chart? — recommendation reasoning ONLY (no educational copy).
  // Shown for recommended/alternative; incompatible is explained in Compatibility.
  const showWhy = status !== "incompatible";
  const whyCallout =
    status === "recommended"
      ? { Icon: RecommendRoundedIcon, iconColor: "success", tone: "success" }
      : { Icon: InsightsOutlinedIcon, iconColor: "action", tone: "neutral" };

  const whyReasons = [];
  if (showWhy) {
    if (matchesTask) {
      whyReasons.push(
        <>
          You selected the <b>{visRef.filter.type}</b> analytical task.
        </>
      );
    }
    compatibility.matched.forEach((m) => {
      whyReasons.push(
        <>
          Your current indicator contains {m.available} {m.type.toLowerCase()}{" "}
          variable{m.available > 1 ? "s" : ""}.
        </>
      );
    });
  }

  const tintedCardSx = (tone) => (theme) => ({
    p: 2,
    borderRadius: `${theme.custom.radii.card}px`,
    border: `1px solid ${
      tone === "success"
        ? alpha(theme.palette.success.main, 0.3)
        : tone === "warning"
          ? alpha(theme.palette.warning.main, 0.3)
          : theme.palette.divider
    }`,
    backgroundColor:
      tone === "success"
        ? alpha(theme.palette.success.main, 0.08)
        : tone === "warning"
          ? alpha(theme.palette.warning.main, 0.08)
          : alpha(theme.palette.text.primary, 0.03),
  });

  const WhyIcon = whyCallout.Icon;
  const aboutLead = guidance?.whenToUse
    ? `Use it to ${lowerFirst(guidance.whenToUse)}`
    : chart.description;

  return (
    <Stack gap={3}>
      {/* 1. Title + recommendation status */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="h6" component="h3">
          {chart.type}
        </Typography>
        <Chip
          size="small"
          color={statusChip.color}
          variant={statusChip.variant}
          label={statusChip.label}
        />
      </Stack>

      {/* 2. Why this chart? (recommendation reasoning only) */}
      {showWhy && whyReasons.length > 0 && (
        <Box component="section" aria-label="Why this chart" sx={tintedCardSx(whyCallout.tone)}>
          <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1.5 }}>
            <WhyIcon color={whyCallout.iconColor} />
            <Typography variant="subtitle1" component="h4" fontWeight={600}>
              Why this chart?
            </Typography>
          </Stack>
          <Stack gap={0.75}>
            {whyReasons.map((node, index) => (
              <ReasonRow key={index} ok>
                {node}
              </ReasonRow>
            ))}
          </Stack>
        </Box>
      )}

      <Grid container spacing={4}>
        {/* 3. Preview (the component shows its own Live/Sample/Static label) */}
        <Grid size={{ xs: 12, md: 6 }}>
          <VisualizationLivePreview
            chart={chart}
            compatible={compatibility.compatible}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Stack gap={3}>
            {/* 4. About this visualization (one educational block) */}
            <Box>
              <Typography variant="subtitle2" component="h4" gutterBottom>
                About this visualization
              </Typography>
              <Stack gap={1}>
                <Typography variant="body2">{aboutLead}</Typography>
                {guidance?.question && (
                  <Typography variant="body2" color="text.secondary">
                    <b>Best for answering:</b> {guidance.question}
                  </Typography>
                )}
                {guidance?.alternative && (
                  <Typography variant="body2" color="text.secondary">
                    <b>Consider another chart:</b> {guidance.alternative}
                  </Typography>
                )}
                <Link
                  variant="body2"
                  underline="hover"
                  sx={{ cursor: "pointer" }}
                  onClick={() => window.open(chart.link, "_blank")}
                >
                  Learn more on the Data Visualization Catalogue
                </Link>
              </Stack>
            </Box>

            {/* 5. Compatibility (single source — no repeated requirement blocks) */}
            <Box>
              <Typography variant="subtitle2" component="h4" gutterBottom>
                Compatibility
              </Typography>
              {compatibility.compatible ? (
                <Box>
                  <ReasonRow ok>All data requirements satisfied</ReasonRow>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setShowReqDetails((s) => !s)}
                    aria-expanded={showReqDetails}
                    sx={{ textTransform: "none", pl: 0, mt: 0.5 }}
                  >
                    {showReqDetails ? "Hide details" : "Show details"}
                  </Button>
                  <Collapse in={showReqDetails} unmountOnExit>
                    <Stack gap={0.75} sx={{ pt: 0.5 }}>
                      {compatibility.requirements.map((r) => (
                        <ReasonRow key={r.type} ok={r.satisfied}>
                          {r.required} {r.type.toLowerCase()} variable
                          {r.required > 1 ? "s" : ""}
                        </ReasonRow>
                      ))}
                    </Stack>
                  </Collapse>
                </Box>
              ) : (
                <Box sx={tintedCardSx("warning")}>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    To use this chart, add:
                  </Typography>
                  <Stack gap={0.75}>
                    {compatibility.missing.map((m) => (
                      <ReasonRow key={m.type} ok={false}>
                        {m.required} {m.type.toLowerCase()} variable
                        {m.required > 1 ? "s" : ""} — you have {m.available}
                      </ReasonRow>
                    ))}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    Add the missing data in the <b>Specify requirements</b> step,
                    or add the column(s) in the <b>Dataset</b> step.
                  </Typography>
                </Box>
              )}
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default VisualizationDescription;
