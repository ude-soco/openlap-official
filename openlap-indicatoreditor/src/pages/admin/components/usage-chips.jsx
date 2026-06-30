import PropTypes from "prop-types";
import { Chip, Skeleton, Stack, Typography } from "@mui/material";

// Compact "Used by N indicators / N users" cell. Driven by useAdminUsage state:
// loading → skeleton, error → "Usage unavailable" (never blocks the page), ready
// → two chips (an item absent from the usage map means 0, shown explicitly).
const UsageChips = ({ status, usage }) => {
  if (status === "loading") {
    return <Skeleton width={140} />;
  }
  if (status === "error") {
    return (
      <Typography variant="caption" color="text.secondary">
        Usage unavailable
      </Typography>
    );
  }
  const indicators = usage?.indicatorCount ?? 0;
  const users = usage?.uniqueUserCount ?? 0;
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap">
      <Chip
        size="small"
        variant="outlined"
        label={`${indicators} ${indicators === 1 ? "indicator" : "indicators"}`}
      />
      <Chip
        size="small"
        variant="outlined"
        label={`${users} ${users === 1 ? "user" : "users"}`}
      />
    </Stack>
  );
};

UsageChips.propTypes = {
  status: PropTypes.oneOf(["loading", "ready", "error"]).isRequired,
  usage: PropTypes.shape({
    indicatorCount: PropTypes.number,
    uniqueUserCount: PropTypes.number,
  }),
};

export default UsageChips;
