import PropTypes from "prop-types";
import { Chip, Stack, Typography } from "@mui/material";
import { useContext } from "react";
import { ISCContext } from "../../../../isc-context.js";
import { isChartCompatible } from "../../utils/chart-compatibility.js";

export default function Summary({ filterType, chartType }) {
  const { lockedStep, visRef, dataset } = useContext(ISCContext);
  const chartCompatible =
    Boolean(visRef.chart?.type) &&
    isChartCompatible(visRef.chart, dataset.columns);
  const handleCheckFilterType = () => {
    return filterType !== "";
  };
  const handleCheckChartType = () => {
    return chartType !== "";
  };
  return (
    <>
      <Stack spacing={1}>
        {handleCheckFilterType() && (
          <Stack direction="row" gap={1} alignItems="center">
            <Typography>Filters applied</Typography>
            <Chip label={filterType} />
          </Stack>
        )}
        {handleCheckChartType() && (
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Typography>Chart selected</Typography>
            <Chip label={chartType} />
            <Chip
              size="small"
              variant="outlined"
              color={chartCompatible ? "success" : "warning"}
              label={chartCompatible ? "Compatible" : "Needs data"}
            />
          </Stack>
        )}
        {!handleCheckChartType() &&
          !handleCheckChartType() &&
          !lockedStep.visualization.step && (
            <Stack direction="row" gap={1} alignItems="center">
              <Typography>
                <em>No visualization selected yet!</em>
              </Typography>
            </Stack>
          )}
      </Stack>
    </>
  );
}

Summary.propTypes = {
  filterType: PropTypes.string,
  chartType: PropTypes.string,
};
