import PropTypes from "prop-types";
import { Box, Stack } from "@mui/material";
import PageHeader from "../../../../../common/components/page-header/page-header";

/**
 * Layout frame for the ISC Creator workspace. See docs/ISC_ARCHITECTURE.md,
 * "Workflow and source map".
 *
 * Provides the modern editor shell — a PageHeader (h1 + breadcrumbs + optional
 * actions), an optional stepper slot, a main editor column, an optional live
 * preview column, and an optional bottom status/actions slot. It is presentational and
 * does not touch step behavior, state, or persistence.
 */
const ISCWorkspace = ({
  title,
  breadcrumbs = [],
  subtitle = null,
  actions = null,
  stepper = null,
  preview = null,
  status = null,
  children,
}) => (
  <Stack sx={{ gap: 3 }}>
    <PageHeader
      title={title}
      breadcrumbs={breadcrumbs}
      subtitle={subtitle}
      actions={actions}
    />

    {stepper}

    <Stack
      direction={{ xs: "column", lg: preview ? "row" : "column" }}
      sx={{ gap: 3, alignItems: "flex-start" }}
    >
      {/* Main editor column. minWidth:0 prevents flex children (tables/charts)
          from forcing horizontal overflow. */}
      <Box sx={{ flexGrow: 1, width: "100%", minWidth: 0 }}>{children}</Box>

      {preview && (
        <Box
          component="aside"
          aria-label="Indicator preview"
          sx={{
            width: { xs: "100%", lg: 380 },
            flexShrink: 0,
            position: { lg: "sticky" },
            top: { lg: 88 },
          }}
        >
          {preview}
        </Box>
      )}
    </Stack>

    {status}
  </Stack>
);

ISCWorkspace.propTypes = {
  title: PropTypes.string.isRequired,
  breadcrumbs: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      to: PropTypes.string.isRequired,
    })
  ),
  subtitle: PropTypes.node,
  actions: PropTypes.node,
  stepper: PropTypes.node,
  preview: PropTypes.node,
  status: PropTypes.node,
  children: PropTypes.node,
};

export default ISCWorkspace;
