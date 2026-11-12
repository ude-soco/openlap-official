import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import RecommendRoundedIcon from "@mui/icons-material/RecommendRounded";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import { getChartCompatibility } from "../utils/chart-compatibility";

// One reason line: an icon (not colour-only) + readable text. Matches the ISC
// Creator's "Why this chart?" rows.
const ReasonRow = ({ ok, children }) => (
  <Stack direction="row" gap={1} alignItems="flex-start">
    {ok ? (
      <CheckCircleRoundedIcon
        fontSize="small"
        color="success"
        sx={{ mt: "2px" }}
      />
    ) : (
      <ReportProblemOutlinedIcon
        fontSize="small"
        color="warning"
        sx={{ mt: "2px" }}
      />
    )}
    <Typography variant="body2">{children}</Typography>
  </Stack>
);
ReasonRow.propTypes = { ok: PropTypes.bool, children: PropTypes.node };

// Tinted "callout" card — same tones as the ISC Creator's Why/Compatibility blocks.
const tintedCardSx = (tone) => (theme) => ({
  p: 2.5,
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

const CALLOUT = {
  recommended: { Icon: RecommendRoundedIcon, iconColor: "success", tone: "success" },
  compatible: { Icon: InsightsOutlinedIcon, iconColor: "action", tone: "neutral" },
  "needs-data": {
    Icon: ReportProblemOutlinedIcon,
    iconColor: "warning",
    tone: "warning",
  },
};

/**
 * Visible "Why this chart?" callout for the selected chart — styled to match the
 * ISC Creator block. Reuses the (unchanged) compatibility derivation.
 */
const ChartWhy = ({ chartType, analyzedData }) => {
  if (!chartType?.id) return null;
  const { status, conditions, hasRequired } = getChartCompatibility(
    chartType,
    analyzedData
  );
  const callout = CALLOUT[status] || CALLOUT.compatible;
  const Icon = callout.Icon;

  return (
    <Box component="section" aria-label="Why this chart" sx={tintedCardSx(callout.tone)}>
      <Stack direction="row" gap={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Icon color={callout.iconColor} />
        <Typography variant="subtitle2" component="h4" fontWeight={600}>
          Why this chart?
        </Typography>
      </Stack>
      <Stack gap={0.75}>
        {!hasRequired && (
          <ReasonRow ok>
            This chart has no strict data requirements and works with your
            analysed data.
          </ReasonRow>
        )}
        {conditions.map((c) => (
          <ReasonRow key={c.type} ok={c.satisfied}>
            {c.satisfied
              ? `Your current indicator contains ${c.available} ${c.label.toLowerCase()} variable${
                  c.available === 1 ? "" : "s"
                }.`
              : `Requires ${c.required} ${c.label.toLowerCase()} variable${
                  c.required === 1 ? "" : "s"
                } — you have ${c.available}.`}
          </ReasonRow>
        ))}
      </Stack>
    </Box>
  );
};

ChartWhy.propTypes = {
  chartType: PropTypes.object,
  analyzedData: PropTypes.object,
};

export default ChartWhy;
