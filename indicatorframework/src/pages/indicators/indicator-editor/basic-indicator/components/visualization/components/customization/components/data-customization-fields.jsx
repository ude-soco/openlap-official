import { useState } from "react";
import PropTypes from "prop-types";
import {
  Autocomplete, Button, Checkbox, Chip, InputAdornment, Stack, TextField, Typography,
  createFilterOptions,
} from "@mui/material";
import { uniqueCustomizationLabels } from "../../../utils/visualization-descriptor";

const filterOptions = createFilterOptions({ limit: 100 });
const validColor = (value) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);

export function CategoryFilterField({ field, choices, value, error, update, showChips }) {
  const categories = uniqueCustomizationLabels(choices);
  const categoryNames = new Set(categories);
  const hidden = uniqueCustomizationLabels(value);
  const hiddenNames = new Set(hidden);
  const included = categories.filter((category) => !hiddenNames.has(category));

  return (
    <Stack sx={{ gap: 0.5, minWidth: 0 }}>
      <Autocomplete
        size={showChips ? "medium" : "small"}
        multiple
        limitTags={showChips ? 2 : -1}
        disableClearable
        disableCloseOnSelect
        disabled={!categories.length}
        options={categories}
        filterOptions={filterOptions}
        value={included}
        sx={showChips && included.length > 2 ? {
          // Keep the sort controls in place when Autocomplete collapses tags on blur.
          "& .MuiAutocomplete-inputRoot": { height: 94, alignContent: "flex-start", overflowY: "auto" },
        } : undefined}
        getOptionDisabled={(category) => included.length === 1 && category === included[0]}
        onChange={(_, next) => {
          if (!next.length) return;
          const nextNames = new Set(next);
          update([
            ...hidden.filter((category) => !categoryNames.has(category)),
            ...categories.filter((category) => !nextNames.has(category)),
          ]);
        }}
        renderOption={({ key, ...props }, category, { selected }) => (
          <li key={key} {...props} style={{ ...props.style, overflowWrap: "anywhere" }}>
            <Checkbox checked={selected} disabled={props["aria-disabled"]} tabIndex={-1}
              disableRipple aria-hidden="true" size="small" sx={{ flexShrink: 0, mr: 0.5 }} />
            <span>{category}</span>
          </li>
        )}
        renderValue={showChips
          ? (selection, getItemProps) => selection.map((category, index) => {
            const { key, ...itemProps } = getItemProps({ index });
            return <Chip {...itemProps} key={key} label={category} disabled={included.length === 1} />;
          })
          : (selection) => selection.length > 0 && (
            <Chip size="small" label={`${selection.length} of ${categories.length} included`} />
          )}
        renderInput={(params) => (
          <TextField {...params} label={field.label || field.id} error={Boolean(error)}
            placeholder={showChips ? undefined : "Search categories"}
            helperText={error || (!categories.length ? "Map a category column to choose what to show."
              : !included.length ? "Include at least one category to preview the chart."
                : !showChips && (field.help || "Choose which categories appear in the chart."))} />
        )}
      />
      {(!showChips || (categories.length > 0 && !included.length) || error) && (
        <Button size="small" disabled={!hidden.length && !error} sx={{ alignSelf: "flex-start" }} onClick={() => update([])}>
          Show all categories
        </Button>
      )}
    </Stack>
  );
}

export function SeriesColorsField({ field, choices, value, error, update, primaryColor }) {
  const [selection, setSelection] = useState(null);
  const labels = uniqueCustomizationLabels(choices);
  const colors = Array.isArray(value) ? value : [];
  const selected = labels.includes(selection) ? selection : labels[0] ?? null;
  const current = colors.find((entry) => entry?.key === selected)?.color;
  const color = typeof current === "string" ? current : "";
  const setColor = (next) => {
    const others = colors.filter((entry) => entry?.key !== selected);
    update(next ? [...others, { key: selected, color: next }] : others);
  };

  return (
    <Stack sx={{ gap: 1, minWidth: 0 }}>
      <Typography variant="subtitle2">{field.label || field.id}</Typography>
      {field.help && <Typography variant="caption" color="text.secondary">{field.help}</Typography>}
      <Autocomplete
        size="small"
        disableClearable
        disabled={!labels.length}
        options={labels}
        filterOptions={filterOptions}
        value={selected}
        onChange={(_, label) => setSelection(label)}
        renderOption={({ key, ...props }, label) => (
          <li key={key} {...props} style={{ ...props.style, overflowWrap: "anywhere" }}>{label}</li>
        )}
        renderInput={(params) => <TextField {...params} label={field.source === "category" ? "Category" : "Series"}
          helperText={labels.length ? undefined : "Map a column to choose individual colors."} />}
      />
      {selected && (
        <TextField
          label="Color"
          size="small"
          fullWidth
          value={color}
          placeholder="Automatic"
          error={Boolean(error)}
          helperText={error || (!color ? "The chart chooses an automatic color." : undefined)}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { spellCheck: false, maxLength: 7 },
            input: { startAdornment: (
              <InputAdornment position="start">
                <input
                  type="color"
                  aria-label={`Color picker for ${selected}`}
                  value={validColor(color) ? color : validColor(primaryColor) ? primaryColor : "#1976d2"}
                  style={{ width: 28, height: 28, padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
                  onChange={(event) => setColor(event.target.value)}
                />
              </InputAdornment>
            ) },
          }}
          onChange={(event) => setColor(event.target.value)}
        />
      )}
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
        <Button size="small" disabled={!selected || !color} onClick={() => setColor("")}>Reset color</Button>
        <Button size="small" disabled={!colors.length && !error} onClick={() => update([])}>Reset all colors</Button>
      </Stack>
    </Stack>
  );
}

const fieldProps = {
  field: PropTypes.object.isRequired,
  choices: PropTypes.array,
  error: PropTypes.string,
  update: PropTypes.func.isRequired,
};
CategoryFilterField.propTypes = { ...fieldProps, value: PropTypes.array, showChips: PropTypes.bool };
SeriesColorsField.propTypes = { ...fieldProps, value: PropTypes.array, primaryColor: PropTypes.string };
