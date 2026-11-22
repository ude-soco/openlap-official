import { useMemo } from "react";
import PropTypes from "prop-types";
import { Autocomplete, createFilterOptions, Stack, TextField, Typography } from "@mui/material";

const alphabetical = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
const methodName = (method) => method.name || "";

function recommendation(method) {
  const basic = method?.recommendedFor?.includes("BASIC");
  const multilevel = method?.recommendedFor?.includes("MULTI_LEVEL");
  if (basic && multilevel) return "Recommended for Basic Indicator and Multilevel analysis";
  if (basic) return "Recommended for Basic Indicator";
  if (multilevel) return "Recommended for Multilevel analysis";
  return "";
}

const filterMethods = createFilterOptions({
  stringify: (method) => [method.name, method.description, recommendation(method)].filter(Boolean).join(" "),
});

function MethodDetails({ method, dataRecommendation }) {
  const recommended = dataRecommendation?.label || recommendation(method);
  return (
    <>
      {recommended && (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {recommended}
        </Typography>
      )}
      {dataRecommendation?.reason && (
        <Typography variant="body2" color="text.secondary">
          {dataRecommendation.reason}
        </Typography>
      )}
      {method.description && (
        <Typography variant="body2" color="text.secondary">
          {method.description}
        </Typography>
      )}
    </>
  );
}

MethodDetails.propTypes = {
  method: PropTypes.object.isRequired,
  dataRecommendation: PropTypes.shape({
    label: PropTypes.string.isRequired,
    reason: PropTypes.string.isRequired,
  }),
};

export default function AnalyticsMethodPicker({ methods, value, onChange, getOptionLabel = methodName, recommendForData }) {
  const options = useMemo(() => [...methods].sort((left, right) =>
    alphabetical.compare(methodName(left), methodName(right)) || alphabetical.compare(left.id, right.id)), [methods]);

  return (
    <Stack sx={{ gap: 0.75 }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        Analytics method
      </Typography>
      <Autocomplete
        disableClearable
        disablePortal
        fullWidth
        options={options}
        filterOptions={filterMethods}
        getOptionLabel={getOptionLabel}
        getOptionKey={(option) => option.id}
        isOptionEqualToValue={(option, selected) => option.id === selected.id}
        value={value}
        onChange={(_, method) => onChange(method)}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search for an analytics method"
            slotProps={{
              ...params.slotProps,
              htmlInput: { ...params.slotProps.htmlInput, "aria-label": "Analytics method" },
            }}
          />
        )}
        renderOption={(attributes, method) => {
          const { key, ...restProps } = attributes;
          return (
            <li key={key} {...restProps}>
              <Stack sx={{ py: 0.5 }}>
                <Typography>{getOptionLabel(method)}</Typography>
                <MethodDetails method={method} dataRecommendation={recommendForData?.(method)} />
              </Stack>
            </li>
          );
        }}
      />
      {value && <MethodDetails method={value} dataRecommendation={recommendForData?.(value)} />}
    </Stack>
  );
}

AnalyticsMethodPicker.propTypes = {
  methods: PropTypes.array.isRequired,
  value: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  getOptionLabel: PropTypes.func,
  recommendForData: PropTypes.func,
};
