// Real navigation, sections, comparison rail, fonts and app-header geometry.
// All selections are synthetic; this page has no API, authentication or storage.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import { AppBar, Box, Button, Collapse, Container, CssBaseline, Stack, TextField, ThemeProvider, Toolbar, Typography, createTheme } from "@mui/material";
import EditorWorkflow from "/src/common/components/editor-workflow/editor-workflow.jsx";
import CommunityComparison from "/src/common/components/community-adaptation/community-comparison.jsx";
import WorkflowSection from "/src/common/components/workflow-section/workflow-section.jsx";
import SectionCard from "/src/common/components/section-card/section-card.jsx";
import { createAppTheme } from "/src/common/theme/app-theme.js";

const embedded = new URL(location.href).searchParams.has("embedded");
const short = new URL(location.href).searchParams.has("short");
const theme = createAppTheme(createTheme());
const labels = { dataset: "Dataset", filters: "Filters", analysis: "Analysis", visualization: "Visualization" };
const source = { id: "synthetic", name: "Synthetic selection" };
const params = Array.from({ length: 25 }, (_, index) => ({ id: `parameter-${index}`, name: `Parameter ${index + 1}`, value: "A long synthetic reference choice. ".repeat(5) }));
const reference = {
  filters: { activityTypes: [source], actions: [source], activities: Array.from({ length: 30 }, (_, index) => ({ ...source, id: `activity-${index}`, name: `Synthetic material ${index + 1}` })), scope: "ONLY_ME", timeframe: { from: "2026-01-01", until: "2026-11-17" } },
  analysis: { method: source, params, mapping: { mapping: [] } },
  visualization: { library: source, chart: source, mapping: { mapping: [] }, params: Object.fromEntries(params.map((item) => [item.id, item.value])) },
};
const configuration = {
  filters: { selectedActivities: [{ selectedActivityType: source, selectedActionList: [source], selectedActivityList: [] }] },
  analysis: { methodId: source.id, params, mapping: { mapping: [] } },
  visualization: { libraryId: source.id, typeId: source.id, mapping: { mapping: [] } },
};

export function Fixture() {
  const [current, setCurrent] = useState("dataset");
  const [panels, setPanels] = useState({ dataset: !short, filters: !short, analysis: false, visualization: false });
  const [unlocked, setUnlocked] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [selections, setSelections] = useState({ dataset: "Dataset retained choice", filters: "Filters retained choice", analysis: "Analysis retained choice", visualization: "Visualization retained choice" });
  const [calls, setCalls] = useState([]);
  const steps = Object.keys(labels).map((key) => ({ key, label: labels[key], locked: key === "visualization" && !unlocked,
    completed: key === "dataset", needsReview: key === "analysis", summary: key === "analysis" ? "A deliberately lengthy analytics-method description that must stay out of the compact navigator" : "Selection summary" }));
  const select = (key) => { setCalls((previous) => [...previous, key]); setCurrent(key); setPanels((previous) => ({ ...previous, [key]: true })); };
  window.__editorNavigationFixture = { snapshot: () => ({ selections, calls, panels, current }), setBusy: setDisabled };
  const editor = <EditorWorkflow steps={steps} current={current} onStepSelect={select} disabled={disabled} ariaLabel="Fixture indicator creation progress">
    <Stack sx={{ gap: 3 }}>
      {steps.map((step) => <WorkflowSection key={step.key} stepKey={step.key} status={step.locked ? "locked" : panels[step.key] ? "active" : "available"} ariaLabel={`${step.label} fixture step`}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Typography component="h2" variant="h6">{step.label}</Typography>
          <Button onClick={() => setPanels((previous) => ({ ...previous, [step.key]: !previous[step.key] }))}>{panels[step.key] ? "Close" : "Open"} {step.label}</Button>
        </Stack>
        <Collapse in={!step.locked && panels[step.key]} timeout={{ enter: 500, exit: 250 }}>
          <Stack sx={{ pt: 2 }}>
            <CommunityComparison step={step.key} reference={reference} configuration={configuration}>
              <SectionCard title={`${step.label} selections`}>
                <Stack sx={{ gap: 2 }}>
                  <TextField label={`${step.label} retained choice`} value={selections[step.key]} onChange={(event) => setSelections((previous) => ({ ...previous, [step.key]: event.target.value }))} />
                  {Array.from({ length: 12 }, (_, index) => <TextField key={index} label={`${step.label} option ${index + 1}`} defaultValue={`Synthetic option ${index + 1}`} helperText="A synthetic control keeps the step long enough to exercise scrolling." />)}
                </Stack>
              </SectionCard>
            </CommunityComparison>
          </Stack>
        </Collapse>
      </WorkflowSection>)}
    </Stack>
  </EditorWorkflow>;
  return <ThemeProvider theme={theme}><CssBaseline />
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" color="default" elevation={0} sx={{ width: { md: "calc(100% - 280px)" }, ml: { md: "280px" }, borderBottom: 1, borderColor: "divider" }}>
        <Toolbar><Typography>Indicator editor navigation fixture</Typography></Toolbar>
      </AppBar>
      <Box sx={{ width: { md: 280 }, flexShrink: 0 }} />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, pt: 3 }}><Toolbar />
        <Container maxWidth="xl">
          {!short && <Stack sx={{ minHeight: 300, gap: 2, alignItems: "flex-start" }}>
            <Typography component="h1" variant="h4">Synthetic indicator editor</Typography>
            <Button onClick={() => setUnlocked((value) => !value)}>Toggle visualization prerequisite</Button>
            <Button onClick={() => setDisabled((value) => !value)}>Toggle busy editor</Button>
          </Stack>}
          {embedded ? <Box sx={{ maxWidth: 760 }}><WorkflowSection ariaLabel="Embedded source editor" status="active">{editor}</WorkflowSection></Box> : editor}
          {!short && <Box sx={{ minHeight: 700, py: 4 }}>Following page content</Box>}
        </Container>
      </Box>
    </Box>
  </ThemeProvider>;
}
createRoot(document.getElementById("root")).render(<Fixture />);
