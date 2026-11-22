import { useId } from "react";
import PropTypes from "prop-types";
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip,
  Divider, List, ListItem, Stack, Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SectionCard from "../../../common/components/section-card/section-card";

const GROUP_NAMES = { elements: "Elements", styles: "Styles", filters: "Filters" };
const TYPE_NAMES = {
  text: "Text", number: "Number", boolean: "On/off", select: "Choice", color: "Color",
  categoryFilter: "Category selector", seriesColors: "Individual colors",
};
const display = (value) => value === true ? "On" : value === false ? "Off"
  : value === "" ? "Empty text" : value == null ? "Not specified" : String(value);
const defaultDisplay = ({ type, defaultValue }) => {
  if (!Array.isArray(defaultValue)) return display(defaultValue);
  if (type === "categoryFilter") return defaultValue.length ? `${defaultValue.length} hidden` : "All categories visible";
  return defaultValue.length ? `${defaultValue.length} custom colors` : "Automatic colors";
};

/** A readable summary of approved manifest metadata, never executable plugin UI. */
export default function PluginRuntimeReview({ manifest, entries = [] }) {
  const prefix = useId();
  if (!manifest) return (
    <Alert severity="warning">
      This JAR has no browser runtime manifest. Chart previews are available only
      for supported legacy plugins. New visualization plugins should include
      their browser resources and customization contract.
    </Alert>
  );
  const assets = new Map((manifest.assets || []).map((asset) => [asset.id, asset]));
  const names = new Map(entries.map((entry) => [entry.implementingClass, entry.name]));
  return (
    <SectionCard title="Browser runtime and customizations" helper="Review the packaged libraries and chart options before activation.">
      <Stack sx={{ gap: 2, minWidth: 0, "& .MuiTypography-root": { overflowWrap: "anywhere" } }}>
      <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>{manifest.pluginId}</Typography>
        <Chip size="small" variant="outlined" label={`Version ${manifest.pluginVersion}`} />
        <Chip size="small" variant="outlined" label={`${assets.size} packaged ${assets.size === 1 ? "asset" : "assets"}`} />
      </Stack>
      <Stack sx={{ gap: 2 }}>
        {(manifest.runtimes || []).map((runtime) => (
          <Box key={runtime.id}>
            <Typography variant="subtitle2" component="h3">{runtime.id} · {runtime.version}</Typography>
            <Typography variant="caption" color="text.secondary">Resources load in this order from the installed JAR:</Typography>
            <Stack component="ol" sx={{ mt: 0.75, mb: 0, pl: 3, gap: 0.75 }}>
              {(runtime.assets || []).map((id) => {
                const asset = assets.get(id);
                return (
                  <Box component="li" key={id} sx={{ overflowWrap: "anywhere" }}>
                    <Typography variant="body2">{asset?.path || id}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {asset?.kind === "style" ? "CSS stylesheet" : "JavaScript"}
                      {asset?.sha256 ? ` · SHA-256 ${asset.sha256}` : ""}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
      <Divider />
      <Stack sx={{ gap: 1.5 }}>
        {(manifest.charts || []).map((chart, index) => {
          const fields = chart.customizations || [];
          return (
            <Accordion key={chart.id} defaultExpanded={index === 0} disableGutters elevation={0}
              sx={{ border: 1, borderColor: "divider", borderRadius: 1, "&:before": { display: "none" } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls={`${prefix}-${chart.id}-details`} id={`${prefix}-${chart.id}-summary`}>
                <Stack sx={{ gap: 0.25, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ overflowWrap: "anywhere" }}>{names.get(chart.implementingClass) || chart.id}</Typography>
                  <Typography variant="caption" color="text.secondary">Runtime: {chart.runtimeId} · {fields.length} customization {fields.length === 1 ? "control" : "controls"}</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack sx={{ gap: 1.5 }}>
                  {chart.description && <Typography variant="body2">{chart.description}</Typography>}
                  {chart.iconAssetId && <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>Packaged icon: {assets.get(chart.iconAssetId)?.path || chart.iconAssetId}</Typography>}
                  {!fields.length && <Typography variant="body2" color="text.secondary">This chart declares no customization controls.</Typography>}
                  {Object.entries(GROUP_NAMES).map(([group, label]) => {
                    const grouped = fields.filter((field) => field.group === group);
                    return grouped.length ? (
                      <Box key={group}>
                        <Typography variant="overline" component="h4">{label}</Typography>
                        <List dense disablePadding>
                          {grouped.map((field) => {
                            const dependent = fields.find((other) => other.id === field.visibleWhen?.id);
                            return (
                              <ListItem key={field.id} disableGutters sx={{ display: "block" }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{field.label || field.id} · {TYPE_NAMES[field.type] || field.type}</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>
                                  Default: {defaultDisplay(field)}
                                  {field.min != null ? ` · Minimum: ${field.min}` : ""}
                                  {field.max != null ? ` · Maximum: ${field.max}` : ""}
                                  {field.step != null ? ` · Step: ${field.step}` : ""}
                                </Typography>
                                {field.options?.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflowWrap: "anywhere" }}>Choices: {field.options.map((option) => option.label || display(option.value)).join(", ")}</Typography>}
                                {field.visibleWhen && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>Shown when {dependent?.label || field.visibleWhen.id} is {display(field.visibleWhen.equals)}.</Typography>}
                                {field.help && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{field.help}</Typography>}
                              </ListItem>
                            );
                          })}
                        </List>
                      </Box>
                    ) : null;
                  })}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
      </Stack>
    </SectionCard>
  );
}

PluginRuntimeReview.propTypes = { manifest: PropTypes.object, entries: PropTypes.array };
