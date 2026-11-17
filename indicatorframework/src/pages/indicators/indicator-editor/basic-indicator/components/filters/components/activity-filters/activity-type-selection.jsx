import { useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { BasicContext } from "../../../../basic-indicator";
import { fetchActionOnActivitiesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";

export default function ActivityTypeSelection({ activity }) {
  const { api } = useContext(AuthContext);
  const { dataset, filters, setFilters, setAnalysis } = useContext(BasicContext);
  const generation = useRef(0);
  const scope = JSON.stringify([activity.id, dataset.selectedLRSList]);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [request, setRequest] = useState(null);
  useEffect(() => () => { generation.current += 1; }, [scope]);
  const sameSelection = request?.scope === scope && request.typeId === activity.selectedActivityType.id;
  const loading = sameSelection && request.loading;
  const failed = sameSelection && request.failed;

  const handleSelectActivityType = async (value, retry = false) => {
    if (!retry && value.id === activity.selectedActivityType.id) return;
    const run = ++generation.current;
    const isCurrent = () => run === generation.current && scope === currentScope.current;
    // Clear descendants immediately; an in-flight action lookup must not
    // repopulate activities belonging to the previous activity type.
    setFilters((p) => ({ ...p, selectedActivities: p.selectedActivities.map((a) =>
      a.id === activity.id ? { ...a, selectedActivityType: value, actionList: [],
        selectedActionList: [], activityList: [], selectedActivityList: [] } : a) }));
    setAnalysis((p) => ({ ...p, analyzedData: {} }));
    setRequest({ scope, typeId: value.id, loading: true, failed: false });
    try {
      const actionList = await fetchActionOnActivitiesList(api, dataset.selectedLRSList, value.id);
      if (!isCurrent()) return;
      setFilters((p) => {
        if (!isCurrent() || !p.selectedActivities.some((a) => a.id === activity.id && a.selectedActivityType.id === value.id)) return p;
        return { ...p, selectedActivities: p.selectedActivities.map((a) =>
          a.id === activity.id ? { ...a, actionList } : a) };
      });
      setRequest({ scope, typeId: value.id, loading: false, failed: false });
    } catch {
      if (isCurrent()) setRequest({ scope, typeId: value.id, loading: false, failed: true });
    }
  };

  const isSelected = activity.selectedActivityType.name !== "";

  return (
    <Stack sx={{ gap: 0.75 }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        Activity type{" "}
        <Box component="span" sx={{ color: "error.main" }} aria-hidden>
          *
        </Box>
      </Typography>
      <Autocomplete
        disableClearable
        disablePortal
        fullWidth
        loading={loading}
        options={filters.activityTypesList}
        getOptionKey={(option) => option.id}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        value={activity.selectedActivityType || null}
        onChange={(event, value) => {
          if (value) handleSelectActivityType(value);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            error={Boolean(failed)}
            placeholder="Search for an activity type"
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...params.slotProps.htmlInput,
                "aria-label": "Activity type",
              },
              input: {
                ...params.slotProps.input,
                endAdornment: (
                  <>
                    {loading ? (
                      <CircularProgress color="inherit" size={18} />
                    ) : null}
                    {params.slotProps.input.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        renderOption={(optionProps, option) => {
          const { key, ...restProps } = optionProps;
          return (
            <li {...restProps} key={key}>
              <Grid container sx={{ py: 0.5 }}>
                <Grid size={{ xs: 12 }}>
                  <Typography>{option.name}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="textSecondary">
                    {option.id}
                  </Typography>
                </Grid>
              </Grid>
            </li>
          );
        }}
      />
      {failed ? <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
        <Typography variant="caption" color="error" role="alert">Could not load actions. Try again.</Typography>
        <Button size="small" onClick={() => handleSelectActivityType(activity.selectedActivityType, true)}>Retry</Button>
      </Stack> : <Typography variant="caption" color="text.secondary" aria-live="polite">
        {loading ? "Loading actions for the selected activity type…" : isSelected
          ? "Changing the type resets Action and Activities below."
          : "Choose the type of activity to filter by, e.g. materials or videos."}
      </Typography>}
    </Stack>
  );
}

ActivityTypeSelection.propTypes = {
  activity: PropTypes.object.isRequired,
};
