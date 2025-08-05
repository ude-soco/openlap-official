import { useContext, useEffect } from "react";
import {
  Autocomplete,
  Chip,
  Divider,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import { AuthContext } from "../../../../../../../../setup/auth-context-manager/auth-context-manager.jsx";
import { fetchPlatformList, fetchUserLRSList } from "../utils/dataset-api.js";
import { BasicIndicatorContext } from "../../../../basic-indicator.jsx";

const LRS = ({ state, setState }) => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, setIndicatorQuery } = useContext(
    BasicIndicatorContext
  );

  const handleSelectLrsList = (selectedLrs) => {
    setState((prevState) => ({
      ...prevState,
      lrsList: prevState.lrsList.filter((item) => item.id !== selectedLrs.id),
      selectedLrsList: [...prevState.selectedLrsList, selectedLrs],
      autoCompleteValue: null,
    }));
    const loadPlatformData = async (lrsStores) => {
      try {
        const platformData = await fetchPlatformList(api, lrsStores);

        setState((prevState) => ({
          ...prevState,
          platformList: platformData.filter(
            (platform) => !indicatorQuery.platforms.includes(platform.name)
          ),
        }));
      } catch (e) {
        console.log(e);
      }
    };

    setIndicatorQuery((prevState) => {
      let tempLrsStore = [...prevState.lrsStores, selectedLrs];
      loadPlatformData(tempLrsStore);
      return {
        ...prevState,
        lrsStores: tempLrsStore,
      };
    });
  };

  const handleDeselectLrsList = (selectedLrs) => {
    setState((prevState) => ({
      ...prevState,
      lrsList: [...prevState.lrsList, selectedLrs],
      selectedLrsList: prevState.selectedLrsList.filter(
        (item) => item.id !== selectedLrs.id
      ),
    }));
    setIndicatorQuery((prevState) => ({
      ...prevState,
      lrsStores: prevState.lrsStores.filter(
        (item) => item.id !== selectedLrs.id
      ),
    }));
  };

  useEffect(() => {
    const loadLrsData = async () => {
      try {
        const lrsData = await fetchUserLRSList(api);
        // console.log(lrsData);
        // let filteredLrsData = lrsData.filter(
        //   (lrs) => !indicatorQuery.lrsStores.includes(lrs.lrsTitle)
        // );
        // console.log(filteredLrsData);

        setState((prevState) => ({
          ...prevState,
          lrsList: lrsData.filter(
            (lrs) => !indicatorQuery.lrsStores.includes(lrs.lrsTitle)
          ),
        }));
      } catch (error) {
        console.error("Failed to load Store list", error);
      }
    };

    loadLrsData();
  }, []);

  return (
    <>
      <Grid container spacing={4} >
        <Grid item xs={12} md={4}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Search for Learning Record Stores (LRSs)
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                disabled={indicatorQuery.platforms.length > 0}
                autoFocus
                disablePortal
                disableCloseOnSelect
                id="combo-box-lrs"
                options={state.lrsList}
                fullWidth
                getOptionLabel={(option) => option.lrsTitle}
                value={state.autoCompleteValue}
                renderOption={(props, option) => {
                  const { key, ...restProps } = props;
                  return (
                    <li {...restProps} key={key}>
                      {option.lrsTitle}
                    </li>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="*Learning Record Stores (LRSs)"
                  />
                )}
                onChange={(event, value) => {
                  if (value) handleSelectLrsList(value);
                }}
              />
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12} md={8}>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Selected <b>Learning Record Store(s)</b>
              </Typography>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{ mt: state.selectedLrsList.length > 0 ? 1 : 0 }}
            >
              <Grid container spacing={1}>
                {state.selectedLrsList?.map((lrs) => (
                  <Grid item key={lrs.id}>
                    <Chip
                      color="primary"
                      label={lrs.lrsTitle}
                      onDelete={
                        indicatorQuery.platforms.length
                          ? undefined
                          : () => handleDeselectLrsList(lrs)
                      }
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid
              item
              xs={12}
              sx={{ mt: state.selectedLrsList.length > 0 ? 0.5 : 5.5 }}
            >
              <Divider />
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
              {indicatorQuery.platforms.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  <i>
                    Remove all the <b>Platforms</b> below to add/remove a
                    Learning Record Store (LRS)
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

export default LRS;
