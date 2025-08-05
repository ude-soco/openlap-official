import { useContext } from "react";
import {
  Chip,
  Grid,
  Typography,
  TextField,
  Autocomplete,
  Divider,
  Tooltip,
} from "@mui/material";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const Platform = ({ state, setState }) => {
  const { indicatorQuery, setIndicatorQuery } = useContext(
    BasicIndicatorContext
  );

  const handleSelectPlatformList = (selectedPlatform) => {
    setState((prevState) => ({
      ...prevState,
      platformList: prevState.platformList.filter(
        (item) => item.name !== selectedPlatform.name
      ),
      selectedPlatformList: [
        ...prevState.selectedPlatformList,
        selectedPlatform,
      ],
      autoCompleteValue: null,
    }));

    setIndicatorQuery((prevState) => {
      let tempPlatforms = [...prevState.platforms, selectedPlatform.name];
      return {
        ...prevState,
        platforms: tempPlatforms,
      };
    });
  };

  const handleDeselectPlatformList = (selectedPlatform) => {
    setState((prevState) => {
      return {
        ...prevState,
        platformList: [...prevState.platformList, selectedPlatform],
        selectedPlatformList: prevState.selectedPlatformList.filter(
          (item) => item.name !== selectedPlatform.name
        ),
        autoCompleteValue: null,
      };
    });

    setIndicatorQuery((prevState) => {
      return {
        ...prevState,
        platforms: prevState.platforms.filter(
          (item) => item !== selectedPlatform.name
        ),
      };
    });
  };

  return (
    <>
      <Grid container spacing={4} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Search for Platforms
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Tooltip
                arrow
                title={
                  state.selectedLrsList.length === 0 ? (
                    <Typography variant="body2">
                      Select at least one Learning Record Store (LRS) from above
                      to view the list of Platforms.
                    </Typography>
                  ) : indicatorQuery.activityTypes.length ? (
                    <Typography variant="body2">
                      Deselect the Activity types(s) from filters below in order
                      to remove a platform.
                    </Typography>
                  ) : undefined
                }
              >
                <Autocomplete
                  disablePortal
                  disableCloseOnSelect
                  disabled={
                    state.selectedLrsList.length === 0 ||
                    indicatorQuery.activityTypes.length > 0
                  }
                  id="combo-box-lrs"
                  options={state.platformList}
                  fullWidth
                  getOptionLabel={(option) => option.name}
                  value={state.autoCompleteValue}
                  renderOption={(props, option) => {
                    const { key, ...restProps } = props;
                    return (
                      <li {...restProps} key={key}>
                        {option.name}
                      </li>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="*Platforms" />
                  )}
                  onChange={(event, value) => {
                    if (value) handleSelectPlatformList(value);
                  }}
                />
              </Tooltip>
            </Grid>
          </Grid>
        </Grid>

        <Grid item xs={12} md={8}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Selected <b>Platform(s)</b>
              </Typography>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{ mt: state.selectedPlatformList.length > 0 ? 1 : 0 }}
            >
              <Grid container spacing={1}>
                {state.selectedPlatformList?.map((platform, index) => (
                  <Grid item key={index}>
                    <Chip
                      color="primary"
                      label={platform.name}
                      onDelete={
                        indicatorQuery.activityTypes.length
                          ? undefined
                          : () => handleDeselectPlatformList(platform)
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{ mt: state.selectedPlatformList.length > 0 ? 0.5 : 5.5 }}
            >
              <Divider />
            </Grid>
            <Grid item xs={12}>
              {indicatorQuery.activityTypes.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  <i>
                    Remove all the <b>Activity types</b> from filters below to
                    add/remove a platform
                  </i>
                </Typography>
              )}
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </>
  );
};

export default Platform;
