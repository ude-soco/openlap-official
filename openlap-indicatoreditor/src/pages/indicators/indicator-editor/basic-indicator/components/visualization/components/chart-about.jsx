import PropTypes from "prop-types";
import { Stack, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SectionCard from "../../../../../../../common/components/section-card/section-card";
import { getChartMetadata } from "../utils/visualization-data";

/**
 * "About this visualization" — static, local guidance for the selected chart:
 * what it is good for and a simple readability caution. No backend calls.
 */
const ChartAbout = ({ chartType }) => {
  if (!chartType?.id) return null;
  const meta = getChartMetadata(chartType.imageCode);

  return (
    <SectionCard title="About this visualization">
      <Stack gap={1}>
        <Typography variant="body2">{meta.summary}</Typography>
        {meta.bestFor && (
          <Typography variant="body2" color="text.secondary">
            <b>Best for:</b> {meta.bestFor}
          </Typography>
        )}
        {meta.caution && (
          <Stack direction="row" gap={1} alignItems="flex-start">
            <InfoOutlinedIcon
              fontSize="small"
              color="action"
              sx={{ mt: "1px" }}
            />
            <Typography variant="body2" color="text.secondary">
              {meta.caution}
            </Typography>
          </Stack>
        )}
      </Stack>
    </SectionCard>
  );
};

ChartAbout.propTypes = {
  chartType: PropTypes.object,
};

export default ChartAbout;
