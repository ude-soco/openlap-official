import { useContext, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import {
  Autocomplete,
  Button,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { BasicContext } from "../../../../basic-indicator";
import { fetchActivitiesList } from "../../utils/filters-api";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager";

export default function ActionSelection({ activity }) {
  const { api } = useContext(AuthContext);
  const { dataset, setFilters, setAnalysis } = useContext(BasicContext);
  const generation = useRef(0);
  const scope = JSON.stringify([activity.id, activity.selectedActivityType.id, dataset.selectedLRSList]);
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const [request, setRequest] = useState(null);
  useEffect(() => () => { generation.current += 1; }, [scope]);
  const loading = request?.scope === scope && request.loading;
  const failed = request?.scope === scope && request.failed;

  const isDisabled = activity.actionList.length === 0;
  const hasActivities = activity.activityList.length !== 0;

  const handleSelectActions = async (value, retry = false) => {
    if (!retry && activity.selectedActionList.length === 1 && activity.selectedActionList[0].id === value?.id) return;
    const run = ++generation.current;
    const isCurrent = () => run === generation.current && scope === currentScope.current;
    // Each filter has one action. Publish the choice immediately so neither
    // the control nor a draft keeps the previous action while activities load.
    setFilters((p) => {
      const updatedActivities = p.selectedActivities.map((a) =>
        a.id === activity.id
          ? {
              ...a,
              selectedActionList: value?.id ? [value] : [],
              activityList: [],
              selectedActivityList: [],
            }
          : a
      );
      return { ...p, selectedActivities: updatedActivities };
    });
    setAnalysis((p) => ({ ...p, analyzedData: {} }));
    setRequest({ scope, loading: Boolean(value?.id), failed: false });
    if (!value?.id) return;
    try {
      const activityList = await fetchActivitiesList(api, dataset.selectedLRSList,
        activity.selectedActivityType.id, [value.id]);
      if (!isCurrent()) return;
      setFilters((p) => {
        const selected = p.selectedActivities.find((a) => a.id === activity.id);
        if (!isCurrent() || selected?.selectedActivityType.id !== activity.selectedActivityType.id ||
          selected.selectedActionList.length !== 1 || selected.selectedActionList[0].id !== value.id) return p;
        return { ...p, selectedActivities: p.selectedActivities.map((a) =>
          a.id === activity.id ? { ...a, activityList } : a) };
      });
      setRequest({ scope, loading: false, failed: false });
    } catch {
      if (isCurrent()) setRequest({ scope, loading: false, failed: true });
    }
  };

  return (
    <Stack sx={{ gap: 0.75 }}>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500 }}
        color={isDisabled ? "text.disabled" : undefined}
      >
        Action
      </Typography>
      <Autocomplete
        disableClearable
        disablePortal
        fullWidth
        loading={loading}
        disabled={isDisabled}
        options={activity.actionList}
        noOptionsText="No matching actions in your selected data."
        getOptionKey={(option) => option.id}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        value={activity.selectedActionList[0] || null}
        onChange={(event, value) => {
          handleSelectActions(value);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            error={Boolean(failed)}
            placeholder="Search for an action"
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...params.slotProps.htmlInput,
                "aria-label": "Action",
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
        <Typography variant="caption" color="error" role="alert">Could not load activities. Try again.</Typography>
        <Button size="small" onClick={() => handleSelectActions(activity.selectedActionList[0], true)}>Retry</Button>
      </Stack> : <Typography variant="caption" color="text.secondary" aria-live="polite">
        {loading ? "Loading activities for the selected action…" : isDisabled
          ? "Select an activity type first."
          : hasActivities
            ? "Changing the action resets Activities below."
            : "Select an action performed on this activity type, e.g. viewed or edited."}
      </Typography>}
    </Stack>
  );
}

ActionSelection.propTypes = {
  activity: PropTypes.object.isRequired,
};
