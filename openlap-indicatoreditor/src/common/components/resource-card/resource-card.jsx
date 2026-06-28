import PropTypes from "prop-types";
import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

/**
 * A single resource row presented as a modern outlined card: an optional icon
 * badge, an optional index chip, a title, a trailing actions slot (e.g. a
 * delete button), and a body slot for metadata.
 *
 * Presentational only — the card itself is not clickable; any interactivity
 * lives in the `actions` slot or the body, so it stays accessible.
 */
const ResourceCard = ({
  title,
  index = null,
  icon: Icon = null,
  actions = null,
  children = null,
}) => (
  <Card variant="outlined" sx={(theme) => ({ borderRadius: `${theme.custom.radii.card}px` })}>
    <CardContent sx={{ p: { xs: 2, md: 2.5 }, "&:last-child": { pb: { xs: 2, md: 2.5 } } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
      >
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
          {Icon && (
            <Box
              aria-hidden
              sx={(theme) => ({
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "primary.main",
                backgroundColor: alpha(
                  theme.palette.primary.main,
                  theme.palette.mode === "dark" ? 0.24 : 0.1
                ),
              })}
            >
              <Icon fontSize="small" />
            </Box>
          )}
          {typeof index === "number" && (
            <Chip
              size="small"
              label={`#${index}`}
              sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
            />
          )}
          <Typography variant="subtitle1" fontWeight={600} noWrap title={title}>
            {title}
          </Typography>
        </Stack>
        {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
      </Stack>
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </CardContent>
  </Card>
);

ResourceCard.propTypes = {
  title: PropTypes.string.isRequired,
  index: PropTypes.number,
  icon: PropTypes.elementType,
  actions: PropTypes.node,
  children: PropTypes.node,
};

export default ResourceCard;
