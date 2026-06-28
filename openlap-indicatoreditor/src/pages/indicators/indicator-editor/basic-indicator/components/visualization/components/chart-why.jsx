import PropTypes from "prop-types";
import { Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import SectionCard from "../../../../../../../common/components/section-card/section-card";
import { getChartCompatibility } from "../utils/chart-compatibility";

const ConditionRow = ({ ok, children }) => (
  <Stack direction="row" gap={1} alignItems="flex-start">
    {ok ? (
      <CheckCircleRoundedIcon color="success" fontSize="small" sx={{ mt: "1px" }} />
    ) : (
      <ReportProblemOutlinedIcon
        color="warning"
        fontSize="small"
        sx={{ mt: "1px" }}
      />
    )}
    <Typography variant="body2">{children}</Typography>
  </Stack>
);
ConditionRow.propTypes = { ok: PropTypes.bool, children: PropTypes.node };

const STATUS_HEADLINE = {
  recommended: "Recommended — it matches the data types from your analysis.",
  compatible: "Compatible — it works with your analysed data.",
  "needs-data": "Needs more data — some required columns are missing.",
};

/**
 * Visible "Why this chart?" panel for the currently selected chart. Reuses the
 * (unchanged) compatibility derivation and lists each data condition with a
 * green check (satisfied) or a warning (missing).
 */
const ChartWhy = ({ chartType, analyzedData }) => {
  if (!chartType?.id) return null;
  const { status, conditions, hasRequired } = getChartCompatibility(
    chartType,
    analyzedData
  );

  return (
    <SectionCard title="Why this chart?">
      <Stack gap={1}>
        <Typography variant="body2" color="text.secondary">
          {STATUS_HEADLINE[status]}
        </Typography>

        {!hasRequired && (
          <ConditionRow ok>
            This chart has no strict data requirements and works with your
            analysed data.
          </ConditionRow>
        )}

        {conditions.map((c) => (
          <ConditionRow key={c.type} ok={c.satisfied}>
            {c.satisfied
              ? `Your analysed data provides ${c.available} ${c.label} column${
                  c.available === 1 ? "" : "s"
                } (needs ${c.required}).`
              : `Requires ${c.required} ${c.label} column${
                  c.required === 1 ? "" : "s"
                }, but your data has ${c.available}.`}
          </ConditionRow>
        ))}
      </Stack>
    </SectionCard>
  );
};

ChartWhy.propTypes = {
  chartType: PropTypes.object,
  analyzedData: PropTypes.object,
};

export default ChartWhy;
