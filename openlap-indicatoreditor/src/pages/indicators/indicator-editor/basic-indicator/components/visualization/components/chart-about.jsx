import PropTypes from "prop-types";
import { Box, Stack, Typography } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SectionCard from "../../../../../../../common/components/section-card/section-card";
import { getChartMetadata } from "../utils/visualization-data";

const FieldLabel = ({ children }) => (
  <Typography
    variant="overline"
    color="text.secondary"
    component="h5"
    sx={{ lineHeight: 1.6 }}
  >
    {children}
  </Typography>
);
FieldLabel.propTypes = { children: PropTypes.node };

/**
 * "About {chart}" — static, local documentation for the selected chart: what it
 * is, what it is best for, and where to use it with care. No backend calls.
 */
const ChartAbout = ({ chartType }) => {
  if (!chartType?.id) return null;
  const meta = getChartMetadata(chartType.imageCode);

  return (
    <SectionCard title={`About ${chartType.name}`}>
      <Stack gap={2}>
        <Typography variant="body2">{meta.summary}</Typography>

        {meta.bestFor && (
          <Box>
            <FieldLabel>Best for</FieldLabel>
            <Typography variant="body2" color="text.secondary">
              {meta.bestFor}
            </Typography>
          </Box>
        )}

        {meta.caution && (
          <Box>
            <FieldLabel>Use with care</FieldLabel>
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
          </Box>
        )}

        {meta.alternative && (
          <Box>
            <FieldLabel>Optional</FieldLabel>
            <Typography variant="body2" color="text.secondary">
              {meta.alternative}
            </Typography>
          </Box>
        )}
      </Stack>
    </SectionCard>
  );
};

ChartAbout.propTypes = {
  chartType: PropTypes.object,
};

export default ChartAbout;
