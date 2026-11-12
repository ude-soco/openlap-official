import PropTypes from "prop-types";
import { Chip, Stack, Typography } from "@mui/material";

/**
 * A labelled metadata row: a fixed-width label column, the value (rendered as
 * an outlined chip by default), and an optional trailing action (e.g. an edit
 * or copy icon button). Wraps gracefully on narrow screens.
 */
const MetadataChip = ({ label, value, action = null }) => (
  <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ minWidth: { xs: "auto", sm: 150 } }}
    >
      {label}
    </Typography>
    <Chip size="small" variant="outlined" label={value} />
    {action}
  </Stack>
);

MetadataChip.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  action: PropTypes.node,
};

export default MetadataChip;
