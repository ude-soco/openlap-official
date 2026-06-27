import { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Chip,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import ExampleDatasetTable from "./example-dataset-table.jsx";
import ImportDialog from "../../components/import-dialog.jsx";

// Prototype dataset onboarding (Phase 4D).
//
// Product direction from the user study: ISC Creator is a prototyping /
// educational tool, not a BI import tool. The first question is "How would you
// like to prototype this indicator?" — not "Where is your CSV?". So the options
// are prioritized: Generate (recommended) → Start empty → Import (advanced).
//
// Two distinct concepts are kept explicit here:
//   • Generate an example dataset → REAL editable rows (user-triggered, saved).
//   • Example format preview       → read-only illustration, never saved.
//
// CTAs reuse existing flows: Generate/Start-empty call parent handlers that
// mutate dataset.rows; Import opens the same ImportDialog the toolbar uses.

const OptionCard = ({ title, badge, description, bestFor, action }) => (
  <Grid size={{ xs: 12, md: 4 }} sx={{ display: "flex" }}>
    <Paper
      variant="outlined"
      component="section"
      aria-label={title}
      sx={(t) => ({
        p: 2,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: `${t.custom.radii.card}px`,
        ...(badge && {
          borderColor: "primary.main",
        }),
      })}
    >
      <Stack gap={1} sx={{ flexGrow: 1 }}>
        <Stack
          direction="row"
          gap={1}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="subtitle1" component="h4" fontWeight={600}>
            {title}
          </Typography>
          {badge && (
            <Chip size="small" color="primary" label={badge} />
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {bestFor && (
          <Typography variant="caption" color="text.secondary">
            <b>Best for:</b> {bestFor}
          </Typography>
        )}
      </Stack>
      <Box sx={{ pt: 2 }}>{action}</Box>
    </Paper>
  </Grid>
);
OptionCard.propTypes = {
  title: PropTypes.string.isRequired,
  badge: PropTypes.string,
  description: PropTypes.node,
  bestFor: PropTypes.node,
  action: PropTypes.node.isRequired,
};

const ExampleDatasetOnboarding = ({ columns, onGenerate, onStartEmpty }) => {
  const [csvOpen, setCsvOpen] = useState(false);
  const toggleCsv = () => setCsvOpen((o) => !o);

  return (
    <Box component="section" aria-label="Build your first dataset">
      <Stack gap={0.5} sx={{ mb: 2 }}>
        <Typography variant="h6" component="h3">
          Build your first dataset
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose how you would like to prototype this indicator.
        </Typography>
      </Stack>

      <Grid container spacing={2} alignItems="stretch">
        <OptionCard
          title="Generate an example dataset"
          badge="Recommended"
          description="OpenLAP creates realistic, editable example data based on the columns you defined in Step 1."
          bestFor="Prototyping and learning how the indicator works."
          action={
            <Button
              fullWidth
              variant="contained"
              startIcon={<AutoAwesomeRoundedIcon />}
              onClick={onGenerate}
            >
              Generate dataset
            </Button>
          }
        />
        <OptionCard
          title="Start with an empty dataset"
          description="Begin with blank rows and enter your own values manually."
          action={
            <Button
              fullWidth
              variant="outlined"
              startIcon={<TableChartOutlinedIcon />}
              onClick={onStartEmpty}
            >
              Start empty
            </Button>
          }
        />
        <OptionCard
          title="Import existing dataset"
          description="Already have your data? Upload a CSV file."
          action={
            <Button
              fullWidth
              variant="text"
              startIcon={<UploadRoundedIcon />}
              onClick={toggleCsv}
            >
              Import dataset
            </Button>
          }
        />
      </Grid>

      {/* Secondary, read-only illustration of the expected format. This is NOT
          the generated dataset — it is never saved or edited. */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" component="h4" gutterBottom>
          Example format
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          A read-only illustration of the expected data. It is not added to your
          dataset.
        </Typography>
        <ExampleDatasetTable columns={columns} />
      </Box>

      {/* CSV flow reused verbatim — same component the toolbar opens. */}
      <ImportDialog open={csvOpen} toggleOpen={toggleCsv} />
    </Box>
  );
};

ExampleDatasetOnboarding.propTypes = {
  columns: PropTypes.array.isRequired,
  onGenerate: PropTypes.func.isRequired,
  onStartEmpty: PropTypes.func.isRequired,
};

export default ExampleDatasetOnboarding;
