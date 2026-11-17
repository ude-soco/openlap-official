// Geometry fixture imports the actual reference component and its MUI ancestors.
// All form values and references are synthetic; no auth, API or persistence.
import { createRoot } from "react-dom/client";
import PropTypes from "prop-types";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { AppBar, Box, Collapse, Container, CssBaseline, Stack, TextField, ThemeProvider, Toolbar, Typography, createTheme } from "@mui/material";
import CommunityComparison from "/src/common/components/community-adaptation/community-comparison.jsx";
import WorkflowSection from "/src/common/components/workflow-section/workflow-section.jsx";
import SectionCard from "/src/common/components/section-card/section-card.jsx";
import { createAppTheme } from "/src/common/theme/app-theme.js";

const embedded = new URL(location.href).searchParams.has("embedded");
const theme = createAppTheme(createTheme());
const source = { id: "synthetic", name: "Synthetic selection" };
const parameters = Array.from({ length: 30 }, (_, index) => ({
  id: `parameter-${index + 1}`, name: `Reference parameter ${index + 1}`,
  value: `Synthetic reference value ${index + 1}. ` + "This descriptive setting remains available for comparison. ".repeat(3),
}));
const activities = Array.from({ length: 30 }, (_, index) => ({
  id: `activity-${index + 1}`, queryId: "synthetic.label", name: `Reference activity ${index + 1} with a descriptive material label`,
}));
const reference = {
  filters: { activityTypes: [source], actions: [source], activities, scope: "ONLY_ME", timeframe: { from: "2026-01-01", until: "2026-11-17" } },
  analysis: { method: source, params: parameters, mapping: { mapping: [] } },
  visualization: { library: source, chart: source, mapping: { mapping: [] }, params: Object.fromEntries(parameters.map((entry) => [entry.id, entry.value])) },
};
const configuration = {
  filters: { selectedActivities: [{ selectedActivityType: source, selectedActionList: [source], selectedActivityList: activities }] },
  analysis: { methodId: source.id, params: parameters, mapping: { mapping: [] } },
  visualization: { libraryId: source.id, typeId: source.id, mapping: { mapping: [] } },
};

export function Fields({ label }) {
  return <SectionCard title={`${label} selections`} helper="Synthetic editing controls exercise scrolling through a long step.">
    <Stack sx={{ gap: 2 }}>
      {Array.from({ length: 14 }, (_, index) => <TextField key={index} fullWidth label={`${label} selection ${index + 1}`}
        defaultValue={`Synthetic choice ${index + 1}`} helperText="Compare this choice with the community reference." />)}
    </Stack>
  </SectionCard>;
}
Fields.propTypes = { label: PropTypes.string.isRequired };

export function Steps() {
  return <Stack sx={{ gap: 3 }}>
    {[["filters", "Filters"], ["analysis", "Analysis"], ["visualization", "Visualization"]].map(([step, label]) => <WorkflowSection key={step} status="active" ariaLabel={`${label} fixture step`}>
      <Typography component="h2" variant="h6">{label}</Typography>
      <Collapse in timeout={{ enter: 500, exit: 250 }}>
        <Stack sx={{ py: 2 }}>
          <CommunityComparison step={step} reference={reference} configuration={configuration}>
            <Fields label={label} />
            {step === "analysis" && <SectionCard title="Preview results"><Box sx={{ height: 280 }}>Synthetic analysed data preview</Box></SectionCard>}
            {step === "visualization" && <SectionCard title="Live preview"><Box component="svg" viewBox="0 0 600 350" aria-label="Synthetic chart" sx={{ width: "100%", height: 350 }}>
              <rect x="20" y="50" width="100" height="260" fill="#1976d2" /><rect x="160" y="150" width="100" height="160" fill="#1976d2" />
            </Box></SectionCard>}
            <TextField fullWidth label={`${label} final selection`} defaultValue="Final synthetic choice" />
          </CommunityComparison>
        </Stack>
      </Collapse>
    </WorkflowSection>)}
    <Box data-testid="following-section" sx={{ minHeight: 600 }}><Typography>Following workflow content</Typography></Box>
  </Stack>;
}

createRoot(document.getElementById("root")).render(<ThemeProvider theme={theme}><CssBaseline />
  <Box sx={{ display: "flex", minHeight: "100vh" }}>
    <AppBar position="fixed" color="default" elevation={0} sx={{ width: { md: "calc(100% - 280px)" }, ml: { md: "280px" }, borderBottom: 1, borderColor: "divider" }}>
      <Toolbar><Typography>Indicator editor layout fixture</Typography></Toolbar>
    </AppBar>
    <Box sx={{ width: { md: 280 }, flexShrink: 0 }} />
    <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pt: 3 }}>
      <Toolbar />
      <Container maxWidth="xl">
        {embedded ? <Box sx={{ maxWidth: 760 }}><WorkflowSection ariaLabel="Embedded source editor" status="active"><Steps /></WorkflowSection></Box> : <Steps />}
      </Container>
    </Box>
  </Box>
</ThemeProvider>);
