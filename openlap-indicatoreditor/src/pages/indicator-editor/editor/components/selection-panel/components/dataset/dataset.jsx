import { useEffect, useState, useContext } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionActions,
  Chip,
  Button,
  AccordionDetails,
  Grid,
  Typography,
  TextField,
  Autocomplete,
  Divider,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { AuthContext } from "../../../../../../../setup/auth-context-manager/auth-context-manager";
import { fetchPlatformList, fetchUserLRSList } from "./utils/dataset-api";
import { SelectionContext } from "../../selection-panel";

const Dataset = () => {
  const { api } = useContext(AuthContext);
  const { indicatorQuery, setIndicatorQuery, setLockedStep } =
    useContext(SelectionContext);
  const [state, setState] = useState({
    openPanel: true,
    lrsList: [],
    platformList: [],
    autoCompleteValue: null,
  });

  const handleTogglePanel = () => {
    setState((prevState) => ({
      ...prevState,
      openPanel: !prevState.openPanel,
    }));
  };

  const handleUnlockFilters = () => {
    handleTogglePanel();
    setLockedStep((prevState) => ({
      ...prevState,
      filters: false,
    }));
  };

  const handleSelectLrsList = (selectedLrs) => {
    setState((prevState) => ({
      ...prevState,
      lrsList: prevState.lrsList.filter((item) => item.id !== selectedLrs.id),
      autoCompleteValue: null,
    }));
    setIndicatorQuery((prevState) => {
      let tempLrsStore = [...prevState.lrsStores, selectedLrs];
      loadPlatformData(tempLrsStore);
      return {
        ...prevState,
        lrsStores: tempLrsStore,
      };
    });
  };

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

  const handleDeselectLrsList = (selectedLrs) => {
    setState((prevState) => ({
      ...prevState,
      lrsList: [...prevState.lrsList, selectedLrs],
    }));
    setIndicatorQuery((prevState) => ({
      ...prevState,
      lrsStores: prevState.lrsStores.filter(
        (item) => item.id !== selectedLrs.id
      ),
    }));
  };

  const handleSelectPlatformList = (selectedPlatform) => {
    setState((prevState) => ({
      ...prevState,
      platformList: prevState.platformList.filter(
        (item) => item.name !== selectedPlatform.name
      ),
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
      let tempPlatform = {
        id: selectedPlatform,
        name: selectedPlatform,
      };
      return {
        ...prevState,
        platformList: [...prevState.platformList, tempPlatform],
        autoCompleteValue: null,
      };
    });

    setIndicatorQuery((prevState) => {
      return {
        ...prevState,
        platforms: prevState.platforms.filter(
          (item) => item !== selectedPlatform
        ),
      };
    });
  };

  useEffect(() => {
    const loadLrsData = async () => {
      try {
        const lrsData = await fetchUserLRSList(api);
        setState((prevState) => ({
          ...prevState,
          lrsList: lrsData,
        }));
      } catch (error) {
        console.error("Failed to load LRS list", error);
      }
    };

    loadLrsData();
  }, []);

  return (
    <>
      <Accordion
        sx={{ mb: 1 }}
        expanded={state.openPanel}
        onChange={handleTogglePanel}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="panel1-content"
          id="panel1-header"
        >
          <Grid container spacing={1}>
            {/* Label */}
            <Grid item xs={12}>
              <Grid container alignItems="center" spacing={1}>
                <Grid item>
                  <Chip label="1" color="primary" />
                </Grid>
                <Grid item>
                  <Typography>Dataset</Typography>
                </Grid>

                {!state.openPanel && (
                  <>
                    {/* LRS */}
                    {indicatorQuery.lrsStores.length !== 0 && (
                      <Grid item xs={12}>
                        <Grid container alignItems="center" spacing={1}>
                          <Grid item>
                            <Typography>LRS(s):</Typography>
                          </Grid>
                          <Grid item>
                            <Grid container spacing={1}>
                              {indicatorQuery.lrsStores?.map((lrs) => (
                                <Grid item key={lrs.id}>
                                  <Chip label={lrs.lrsTitle} />
                                </Grid>
                              ))}
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>
                    )}

                    {/* Platform */}
                    {indicatorQuery.platforms.length !== 0 && (
                      <Grid item xs={12}>
                        <Grid container alignItems="center" spacing={1}>
                          <Grid item>
                            <Typography>Platform(s):</Typography>
                          </Grid>
                          <Grid item>
                            <Grid container spacing={1}>
                              {indicatorQuery.platforms?.map(
                                (platform, index) => (
                                  <Grid item key={index}>
                                    <Chip label={platform} />
                                  </Grid>
                                )
                              )}
                            </Grid>
                          </Grid>
                        </Grid>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
            </Grid>
          </Grid>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Autocomplete
                autoFocus
                disablePortal
                id="combo-box-lrs"
                options={state.lrsList}
                fullWidth
                getOptionLabel={(option) => option.lrsTitle}
                value={state.autoCompleteValue}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    {option.lrsTitle}
                  </li>
                )}
                renderInput={(params) => (
                  <TextField {...params} placeholder="*Search for LRSs" />
                )}
                onChange={(event, value) => {
                  if (value) handleSelectLrsList(value);
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Typography>Selected LRS(s)</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Grid container spacing={1}>
                    {indicatorQuery.lrsStores?.map((lrs) => (
                      <Grid item key={lrs.id}>
                        <Tooltip
                          arrow
                          title={
                            indicatorQuery.platforms.length ? (
                              <Typography variant="body2">
                                Deselect the platform(s) below in order to
                                remove a LRS.
                              </Typography>
                            ) : undefined
                          }
                        >
                          <Chip
                            label={lrs.lrsTitle}
                            onDelete={
                              indicatorQuery.platforms.length
                                ? undefined
                                : () => handleDeselectLrsList(lrs)
                            }
                          />
                        </Tooltip>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} sx={{ mb: 2 }}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Tooltip
                arrow
                title={
                  indicatorQuery.lrsStores.length === 0 ? (
                    <Typography variant="body2">
                      Select at least one LRS from above to view the list of
                      Platforms.
                    </Typography>
                  ) : undefined
                }
              >
                <Autocomplete
                  disablePortal
                  disabled={indicatorQuery.lrsStores.length === 0}
                  id="combo-box-lrs"
                  options={state.platformList}
                  fullWidth
                  getOptionLabel={(option) => option.name}
                  value={state.autoCompleteValue}
                  renderOption={(props, option) => (
                    <li {...props} key={option.id}>
                      {option.name}
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="*Search for platforms"
                    />
                  )}
                  onChange={(event, value) => {
                    if (value) handleSelectPlatformList(value);
                  }}
                />
              </Tooltip>
            </Grid>

            <Grid item xs={12}>
              <Grid container spacing={1}>
                <Grid item xs={12}>
                  <Typography>Selected Platform(s)</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Grid container spacing={1}>
                    {indicatorQuery.platforms?.map((platformName, index) => (
                      <Grid item key={index}>
                        <Tooltip
                          arrow
                          title={
                            indicatorQuery.activityTypes.length ? (
                              <Typography variant="body2">
                                Deselect the Activity types(s) from filters
                                below in order to remove a platform.
                              </Typography>
                            ) : undefined
                          }
                        >
                          <Chip
                            label={platformName}
                            onDelete={
                              indicatorQuery.activityTypes.length
                                ? undefined
                                : () => handleDeselectPlatformList(platformName)
                            }
                          />
                        </Tooltip>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <Divider />
            </Grid>
          </Grid>
        </AccordionDetails>
        <AccordionActions>
          <Grid container>
            <Button
              variant="contained"
              fullWidth
              disabled={
                !indicatorQuery.lrsStores.length ||
                !indicatorQuery.platforms.length
              }
              onClick={handleUnlockFilters}
            >
              Next
            </Button>
          </Grid>
        </AccordionActions>
      </Accordion>
    </>
  );
};

export default Dataset;
