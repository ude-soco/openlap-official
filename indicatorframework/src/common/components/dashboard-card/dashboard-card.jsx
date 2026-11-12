import PropTypes from "prop-types";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";

const actionShape = PropTypes.shape({
  label: PropTypes.string.isRequired,
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
});

/**
 * A dashboard "start here" card: an icon badge, a title and description, an
 * optional status badge, and up to two actions (a primary and a secondary
 * route link). Equal-height, responsive, with a calm hover lift.
 *
 * Actions render as real anchors (react-router `Link`) for proper keyboard /
 * middle-click behaviour. When `locked`, the card is dimmed and its actions
 * are disabled — supported for future role/entitlement states.
 */
const DashboardCard = ({
  title,
  description,
  icon: Icon,
  primaryAction,
  secondaryAction = null,
  badge = null,
  locked = false,
}) => {
  const renderAction = (action, variant) => {
    const ActionIcon = action.icon;
    return (
      <Button
        variant={variant}
        size="medium"
        disabled={locked}
        component={RouterLink}
        to={action.to}
        startIcon={ActionIcon ? <ActionIcon /> : undefined}
        fullWidth
      >
        {action.label}
      </Button>
    );
  };

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: `${theme.custom.radii.card}px`,
        opacity: locked ? 0.6 : 1,
        transition: `box-shadow ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}, border-color ${theme.custom.motion.duration.normal}ms ${theme.custom.motion.easing.standard}`,
        "&:hover": locked
          ? undefined
          : {
              borderColor: alpha(theme.palette.primary.main, 0.4),
              boxShadow: theme.custom.shadows.card,
            },
      })}
    >
      <CardContent sx={{ flexGrow: 1, p: 3 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ mb: 2 }}
        >
          <Box
            aria-hidden
            sx={(theme) => ({
              width: 48,
              height: 48,
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
            <Icon />
          </Box>
          {badge && <Chip label={badge} size="small" color="primary" variant="outlined" />}
        </Stack>
        <Typography variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
      <CardActions sx={{ p: 3, pt: 0, gap: 1.5 }}>
        {renderAction(primaryAction, "contained")}
        {secondaryAction && renderAction(secondaryAction, "outlined")}
      </CardActions>
    </Card>
  );
};

DashboardCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  primaryAction: actionShape.isRequired,
  secondaryAction: actionShape,
  badge: PropTypes.string,
  locked: PropTypes.bool,
};

export default DashboardCard;
