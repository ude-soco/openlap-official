import { Box, Stack, Typography } from "@mui/material";

// Step 4 introduction (Phase 4A). Read-only guidance only — explains how the
// dataset is built and, importantly, that the columns come from the Step 1 data
// requirements (we surface this coupling rather than hide it). No behavior.
const DatasetIntro = () => (
  <Box component="section" aria-label="About this step">
    <Typography variant="subtitle1" component="h3" fontWeight={600} gutterBottom>
      Build the dataset for your selected visualization.
    </Typography>
    <Typography variant="body2" color="text.secondary" gutterBottom>
      The dataset is the data your indicator is calculated from. You can build it
      here:
    </Typography>
    <Stack component="ul" sx={{ m: 0, pl: 3 }} gap={0.5}>
      <Typography component="li" variant="body2" color="text.secondary">
        <b>Columns</b> come from the data requirements you specified in Step 1.
      </Typography>
      <Typography component="li" variant="body2" color="text.secondary">
        <b>Rows</b> contain the actual values — add them manually or upload a CSV
        to fill the table.
      </Typography>
      <Typography component="li" variant="body2" color="text.secondary">
        The <b>selected visualization</b> determines whether your data is
        compatible.
      </Typography>
    </Stack>
  </Box>
);

export default DatasetIntro;
