import { Chip, Stack, Typography } from "@mui/material";
import { useContext } from "react";
import { ISCContext } from "../../../../indicator-specification-card";

export default function Summary({ filterType, chartType }) {
  const { lockedStep } = useContext(ISCContext);
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
          <Stack direction="row" gap={1} alignItems="center">
            <Typography>Chart selected</Typography>
            <Chip label={chartType} />
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
