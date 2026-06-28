import PropTypes from "prop-types";
import { Stack } from "@mui/material";
import SectionCard from "../../../../../../../common/components/section-card/section-card";
import ChartWhy from "./chart-why";
import ChartAbout from "./chart-about";

/**
 * Unified "Chart guidance" section shown right after the chart grid and before
 * Configure chart — the educational step of the workflow. It combines two
 * complementary subsections:
 *   - "Why this chart?"  — why OpenLAP recommended it for the analysed data
 *     (satisfied/missing data requirements), as a tinted callout.
 *   - "About {chart}"    — when a human should use it (best for / use with care /
 *     optional), from local static metadata.
 * Read-only; no backend calls; recommendation logic unchanged.
 */
const ChartGuidance = ({ chartType, analyzedData }) => {
  if (!chartType?.id) return null;

  return (
    <SectionCard
      title="Chart guidance"
      helper="Why this chart fits your analysed data — and when to use it."
    >
      <Stack gap={2.5}>
        <ChartWhy chartType={chartType} analyzedData={analyzedData} />
        <ChartAbout chartType={chartType} />
      </Stack>
    </SectionCard>
  );
};

ChartGuidance.propTypes = {
  chartType: PropTypes.object,
  analyzedData: PropTypes.object,
};

export default ChartGuidance;
