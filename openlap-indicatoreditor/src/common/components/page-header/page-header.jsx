import PropTypes from "prop-types";
import { Box, Breadcrumbs, Divider, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

/**
 * Standard header for authenticated pages.
 *
 * Renders an optional breadcrumb trail (ancestors), an accessible `h1` page
 * title, an optional subtitle, and an optional actions slot (e.g. a primary
 * button), followed by a divider. Introduced in the authenticated-app cleanup
 * so every page has a single, consistent heading with a proper heading level.
 *
 * @param {string} title - The page title; rendered as the page's `h1`.
 * @param {{ label: string, to: string }[]} [breadcrumbs] - Ancestor links only;
 *   the current page (the title) is appended automatically as the last crumb.
 * @param {React.ReactNode} [subtitle] - Optional supporting text below the title.
 * @param {React.ReactNode} [actions] - Optional content aligned to the trailing edge.
 */
const PageHeader = ({ title, breadcrumbs = [], subtitle = null, actions = null }) => (
  <Box component="header">
    {breadcrumbs.length > 0 && (
      <Breadcrumbs sx={{ mb: 1 }} aria-label="Breadcrumb">
        {breadcrumbs.map((crumb) => (
          <Link
            key={crumb.label}
            component={RouterLink}
            to={crumb.to}
            onClick={crumb.onClick}
            underline="hover"
            color="inherit"
          >
            {crumb.label}
          </Link>
        ))}
        <Typography color="text.primary">{title}</Typography>
      </Breadcrumbs>
    )}
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      gap={2}
    >
      <Box>
        <Typography variant="h5" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
    </Stack>
    <Divider sx={{ mt: 2 }} />
  </Box>
);

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string.isRequired,
      // Optional click interceptor (e.g. a leave-edit guard). If it calls
      // event.preventDefault(), RouterLink navigation is suppressed.
      onClick: PropTypes.func,
    })
  ),
  subtitle: PropTypes.node,
  actions: PropTypes.node,
};

export default PageHeader;
