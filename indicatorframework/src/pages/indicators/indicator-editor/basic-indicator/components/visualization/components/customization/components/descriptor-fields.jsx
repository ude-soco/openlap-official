import PropTypes from "prop-types";
import { Alert, FormControlLabel, InputAdornment, MenuItem, Stack, Switch, TextField, Typography } from "@mui/material";
import {
  customizationVisible,
  getCustomizationErrors,
  getCustomizationFields,
} from "../../../utils/visualization-descriptor";

export default function DescriptorFields({ descriptor, group, state, setState }) {
  const fields = getCustomizationFields(descriptor);
  const unsupported = descriptor.customizations.length - fields.length;
  const visible = fields.filter((field) => field.group === group && customizationVisible(field, state));
  const errors = getCustomizationErrors(descriptor, state);
  const update = (field, value) => setState((previous) => ({ ...previous, [field.id]: value, edited: true }));
  return (
    <Stack sx={{ gap: 2 }}>
      {unsupported > 0 && (
        <Alert severity="info">Some customization controls require a newer OpenLAP version.</Alert>
      )}
      {!visible.length && <Typography variant="body2" color="text.secondary">No options apply to the current settings.</Typography>}
      {visible.map((field) => field.type === "boolean" ? (
        <Stack key={field.id} sx={{ gap: 0.25 }}>
          <FormControlLabel
            control={<Switch checked={state[field.id] === true} onChange={(_, value) => update(field, value)} />}
            label={field.label || field.id}
          />
          {field.help && <Typography variant="caption" color="text.secondary">{field.help}</Typography>}
        </Stack>
      ) : (
        <TextField
          key={field.id}
          fullWidth
          label={field.label || field.id}
          value={state[field.id] ?? ""}
          select={field.type === "select"}
          type={field.type === "number" ? "number" : "text"}
          error={Boolean(errors[field.id])}
          helperText={errors[field.id] || field.help}
          slotProps={{
            input: field.type === "color" ? { startAdornment: (
              <InputAdornment position="start">
                <input
                  type="color"
                  aria-label={`${field.label || field.id} color picker`}
                  value={/^#[0-9a-f]{6}$/i.test(state[field.id] || "") ? state[field.id] : "#1976d2"}
                  style={{ width: 32, height: 32, padding: 0, border: 0, background: "transparent", cursor: "pointer" }}
                  onChange={(event) => update(field, event.target.value)}
                />
              </InputAdornment>
            ) } : undefined,
            htmlInput: {
              ...(field.type === "number" ? { min: field.min, max: field.max, step: field.step ?? "any" } : {}),
              ...(field.type === "color" ? { spellCheck: false, maxLength: 7 } : {}),
            },
          }}
          onChange={(event) => {
            const value = event.target.value;
            update(field, field.type === "number" && value !== "" ? Number(value) : value);
          }}
        >
          {field.type === "select" && (field.options || []).map((option) => (
            <MenuItem key={String(option.value)} value={option.value}>{option.label || String(option.value)}</MenuItem>
          ))}
        </TextField>
      ))}
    </Stack>
  );
}
DescriptorFields.propTypes = {
  descriptor: PropTypes.object.isRequired,
  group: PropTypes.string.isRequired,
  state: PropTypes.object.isRequired,
  setState: PropTypes.func.isRequired,
};
