import PropTypes from "prop-types";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

/**
 * Calm, centered placeholder for empty or error situations: an optional icon
 * badge, a title, a supporting line, and an optional action (e.g. a CTA button).
 *
 * The title renders as a `<p>` (not a heading) so it never competes with the
 * page's `h1`. Use the `tone` prop to switch the badge tint to an error look.
 */
const EmptyState = ({
  icon: Icon = null,
  title,
  description = null,
  action = null,
  tone = "neutral",
}) => {
  const isError = tone === "error";
  return (
    <Box
      sx={(theme) => ({
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: 1.5,
        py: 6,
        px: 3,
        border: `1px dashed ${theme.palette.divider}`,
        borderRadius: `${theme.custom.radii.card}px`,
        backgroundColor: alpha(theme.palette.text.primary, 0.015),
      })}
    >
      {Icon && (
        <Box
          aria-hidden
          sx={(theme) => ({
            width: 56,
            height: 56,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: isError ? "error.main" : "text.secondary",
            backgroundColor: alpha(
              isError ? theme.palette.error.main : theme.palette.text.primary,
              isError ? 0.1 : 0.06
            ),
          })}
        >
          <Icon />
        </Box>
      )}
      <Typography variant="h6" component="p">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
};

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string.isRequired,
  description: PropTypes.node,
  action: PropTypes.node,
  tone: PropTypes.oneOf(["neutral", "error"]),
};

export default EmptyState;
