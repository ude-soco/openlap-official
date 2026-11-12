import PropTypes from "prop-types";
import { Box, Paper, Stack, Typography } from "@mui/material";

/**
 * One grouped section of the Filters step (Timeframe / User scope / Activity
 * filters). A consistent outlined card with a clear heading, optional helper
 * line, and an optional trailing action — matching the ISC Creator's section
 * cards. Presentational only.
 */
const FilterSection = ({ title, helper = null, action = null, children }) => (
  <Paper
    component="section"
    variant="outlined"
    aria-label={title}
    sx={(theme) => ({
      p: 2,
      width: "100%",
      height: "100%",
      borderRadius: `${theme.custom.radii.card}px`,
    })}
  >
    <Stack gap={2}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        gap={1}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {title}
          </Typography>
          {helper && (
            <Typography variant="body2" color="text.secondary">
              {helper}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
      </Stack>
      {children}
    </Stack>
  </Paper>
);

FilterSection.propTypes = {
  title: PropTypes.string.isRequired,
  helper: PropTypes.node,
  action: PropTypes.node,
  children: PropTypes.node,
};

export default FilterSection;
