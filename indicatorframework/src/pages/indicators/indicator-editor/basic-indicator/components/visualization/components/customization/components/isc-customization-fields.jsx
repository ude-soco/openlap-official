import { useId, useState } from "react";
import PropTypes from "prop-types";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion, AccordionDetails, AccordionSummary, Box, Button, Checkbox,
  FormControl, FormControlLabel, FormGroup, FormLabel, Radio, RadioGroup, Stack,
  Switch, TextField, Typography,
} from "@mui/material";
import { getCustomizationErrors, getCustomizationFields, uniqueCustomizationLabels } from "../../../utils/visualization-descriptor";
import { CategoryFilterField } from "./data-customization-fields";
import DescriptorFields from "./descriptor-fields";

const fieldsByGroup = {
  elements: ["showLegend", "legendPosition", "showYAxis", "showXAxis", "showYAxisTitle", "showXAxisTitle",
    "chartTitle", "chartSubtitle", "titlePosition", "showValues", "showValuesBackground", "valuesPosition"],
  styles: ["seriesColor", "seriesColors", "useSeriesColors", "dataLabelsColor", "dataLabelsForeColor"],
  filters: ["hiddenCategories", "sortingOrder"],
};
const isHexColor = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const colorPageSize = 24;

function ColorSwatch({ label, color, onChange }) {
  return (
    <Box
      component="input"
      type="color"
      aria-label={label}
      value={color}
      onChange={(event) => onChange(event.target.value)}
      sx={{ width: 30, height: 30, flexShrink: 0, p: 0.5, border: 0, cursor: "pointer", bgcolor: "action.selected",
        "&::-webkit-color-swatch-wrapper": { p: 0 },
        "&::-webkit-color-swatch": { border: "1px solid #888", borderRadius: 0 },
        "&::-moz-color-swatch": { border: "1px solid #888", borderRadius: 0 },
      }}
    />
  );
}

ColorSwatch.propTypes = { label: PropTypes.string.isRequired, color: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };

function DataColors({ labels, entries, primaryColor, seriesPalette, seriesName, setPrimary, setEntries }) {
  const groupId = useId();
  const [visibleCount, setVisibleCount] = useState(colorPageSize);
  const automaticColors = [primaryColor, ...(seriesPalette || []).filter(isHexColor)
    .filter((color) => color.toLowerCase() !== primaryColor.toLowerCase())];
  const colors = new Map(entries.filter((entry) => isHexColor(entry?.color)).map(({ key, color }) => [key, color]));

  return (
    <FormControl role="group" aria-labelledby={groupId}>
      <FormLabel sx={{ mb: 1 }} id={groupId}>Data Colors</FormLabel>
      {labels.length ? (
        <Stack sx={{ gap: 1 }}>
          {labels.slice(0, visibleCount).map((label, index) => (
            <Stack key={label} direction="row" sx={{ gap: 1, alignItems: "center", minWidth: 0 }}>
              <ColorSwatch label={`Color for ${label}`}
                color={colors.get(label) || automaticColors[index % automaticColors.length]}
                onChange={(color) => setEntries([...entries.filter((entry) => entry?.key !== label), { key: label, color }])} />
              <Typography sx={{ overflowWrap: "anywhere", minWidth: 0 }}>{label}</Typography>
            </Stack>
          ))}
          {visibleCount < labels.length && (
            <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => setVisibleCount((count) => count + colorPageSize)}>
              Show more colors
            </Button>
          )}
          {entries.length > 0 && (
            <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => setEntries([])}>
              Reset colors
            </Button>
          )}
        </Stack>
      ) : (
        <>
          <ColorSwatch label={`Color for ${seriesName}`} color={primaryColor} onChange={setPrimary} />
          <Typography sx={{ overflowWrap: "anywhere" }}>{seriesName}</Typography>
        </>
      )}
    </FormControl>
  );
}

DataColors.propTypes = {
  labels: PropTypes.array.isRequired, entries: PropTypes.array.isRequired,
  primaryColor: PropTypes.string.isRequired, seriesPalette: PropTypes.array, seriesName: PropTypes.string.isRequired,
  setPrimary: PropTypes.func.isRequired, setEntries: PropTypes.func.isRequired,
};

export default function IscCustomizationFields({ descriptor, group, state, setState, categories, series, seriesName }) {
  const prefix = useId();
  const declared = getCustomizationFields(descriptor);
  const fields = new Map(declared.filter((field) => field.group === group).map((field) => [field.id, field]));
  const errors = getCustomizationErrors(descriptor, state);
  const value = (id) => state[id] ?? fields.get(id)?.defaultValue;
  const update = (id, next) => setState((previous) => ({ ...previous, [id]: next, edited: true }));
  const toggle = (id, label, Control = Switch, sx) => fields.has(id) && (
    <FormControlLabel label={label} sx={sx}
      control={<Control checked={value(id) === true} onChange={(_, checked) => update(id, checked)} />} />
  );
  const axes = (label, vertical, horizontal) => (fields.has(vertical) || fields.has(horizontal)) && (
    <FormControl role="group" aria-labelledby={`${prefix}-${vertical}`}>
      <FormLabel id={`${prefix}-${vertical}`}>{label}</FormLabel>
      <FormGroup row>
        {toggle(vertical, "Vertical", Checkbox)}
        {toggle(horizontal, "Horizontal", Checkbox)}
      </FormGroup>
    </FormControl>
  );
  const positions = (id, label, choices) => {
    const available = new Set(fields.get(id)?.options?.map((option) => option.value));
    const options = choices.filter(([choice]) => available.has(choice));
    if (!options.length) return null;
    return (
      <FormControl>
        <FormLabel id={`${prefix}-${id}`}>{label}</FormLabel>
        <RadioGroup row aria-labelledby={`${prefix}-${id}`} value={value(id) ?? ""}
          onChange={(_, selected) => update(id, selected)}>
          {options.map(([choice, name]) => (
            <FormControlLabel key={choice} label={name} control={<Radio value={choice} />} />
          ))}
        </RadioGroup>
      </FormControl>
    );
  };
  const title = (id, label) => fields.has(id) && (
    <TextField size="small" fullWidth label={label} value={value(id) ?? ""}
      error={Boolean(errors[id])} helperText={errors[id]} onChange={(event) => update(id, event.target.value)} />
  );
  const colorInput = (id, label, fallback, note) => fields.has(id) && (
    <Stack direction="row" sx={{ gap: 1, alignItems: "flex-start" }}>
      <ColorSwatch label={label} color={isHexColor(value(id)) ? value(id) : fallback} onChange={(color) => update(id, color)} />
      <Typography sx={{ mt: 0.5 }}>{label}{note && <><br />{note}</>}</Typography>
    </Stack>
  );
  const seriesColors = fields.get("seriesColors");
  const labels = seriesColors ? uniqueCustomizationLabels(seriesColors.source === "category" ? categories : series) : [];
  const extras = [...fields.values()].filter(({ id }) => !fieldsByGroup[group].includes(id) ||
    (id === "seriesColor" && labels.length > 0));
  const primary = value("seriesColor");
  const colorEntries = value("seriesColors");
  const axisLabel = descriptor.id !== "scatter" && typeof state.yAxisLabel === "string" ? state.yAxisLabel.trim() : "";
  const canResetSort = fields.get("sortingOrder")?.options?.some((option) => option.value === "original") &&
    ["asc", "desc"].includes(value("sortingOrder"));

  return (
    <Stack sx={{ gap: group === "filters" ? 1 : 2, minWidth: 0 }}>
      {group === "elements" && (
        <>
          {toggle("showLegend", "Show legend", Switch, { mt: 1 })}
          {positions("legendPosition", "Legend Position", [["top", "Top"], ["right", "Right"], ["bottom", "Bottom"], ["left", "Left"]])}
          {axes("Axes", "showYAxis", "showXAxis")}
          {axes("Axes Titles", "showYAxisTitle", "showXAxisTitle")}
          {title("chartTitle", "Chart title")}
          {title("chartSubtitle", "Chart subtitle")}
          {positions("titlePosition", "Title and Subtitle Position", [["left", "Left"], ["center", "Center"], ["right", "Right"]])}
          {(fields.has("showValues") || fields.has("showValuesBackground")) && (
            <FormControl role="group" aria-labelledby={`${prefix}-data-labels`}>
              <FormLabel id={`${prefix}-data-labels`}>Data Labels</FormLabel>
              <FormGroup>
                {toggle("showValues", "Show labels", Switch, { mt: 1 })}
                {toggle("showValuesBackground", "Show labels background")}
              </FormGroup>
            </FormControl>
          )}
          {positions("valuesPosition", "Labels Position", [["top", "Top"], ["center", "Center"],
            ...(value("valuesPosition") === "bottom" ? [["bottom", "Bottom"]] : [])])}
        </>
      )}
      {group === "styles" && (
        <>
          {(fields.has("seriesColor") || labels.length > 0) && (
            <DataColors labels={labels} entries={Array.isArray(colorEntries) ? colorEntries : []}
              seriesName={axisLabel || seriesName || "Value"}
              seriesPalette={descriptor.seriesPalette}
              primaryColor={isHexColor(primary) ? primary : "#1976d2"}
              setPrimary={(color) => update("seriesColor", color)} setEntries={(entries) => update("seriesColors", entries)} />
          )}
          {fields.has("useSeriesColors") && (
            <FormControl role="group" aria-labelledby={`${prefix}-legend-colors`}>
              <FormLabel id={`${prefix}-legend-colors`}>Legend Text Color</FormLabel>
              {toggle("useSeriesColors", "Use series colors")}
            </FormControl>
          )}
          {(fields.has("dataLabelsColor") || fields.has("dataLabelsForeColor")) && (
            <FormControl role="group" aria-labelledby={`${prefix}-label-colors`}>
              <FormLabel id={`${prefix}-label-colors`} sx={{ mb: 1 }}>Data Labels</FormLabel>
              <Stack sx={{ gap: 1 }}>
                {colorInput("dataLabelsColor", "Data labels color", "#000000")}
                {colorInput("dataLabelsForeColor", "Data labels fore color", "#ffffff", "(when background activated)")}
              </Stack>
            </FormControl>
          )}
        </>
      )}
      {group === "filters" && (
        <>
          {fields.has("hiddenCategories") && (
            <CategoryFilterField showChips field={{ ...fields.get("hiddenCategories"), label: "Categories Filter" }}
              choices={categories} value={value("hiddenCategories")} error={errors.hiddenCategories} update={(next) => update("hiddenCategories", next)} />
          )}
          {positions("sortingOrder", "Data Sorting", [["asc", "Ascending"], ["desc", "Descending"]])}
          {canResetSort && (
            <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => update("sortingOrder", "original")}>
              Reset sort
            </Button>
          )}
        </>
      )}
      {extras.length > 0 && (
        <Accordion disableGutters variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>Additional settings</AccordionSummary>
          <AccordionDetails>
            <DescriptorFields descriptor={{ ...descriptor, customizations: extras }} group={group} state={state}
              setState={setState} categories={categories} series={series} />
          </AccordionDetails>
        </Accordion>
      )}
    </Stack>
  );
}

IscCustomizationFields.propTypes = {
  descriptor: PropTypes.object.isRequired, group: PropTypes.oneOf(["elements", "styles", "filters"]).isRequired,
  state: PropTypes.object.isRequired, setState: PropTypes.func.isRequired, categories: PropTypes.array,
  series: PropTypes.array, seriesName: PropTypes.string,
};
