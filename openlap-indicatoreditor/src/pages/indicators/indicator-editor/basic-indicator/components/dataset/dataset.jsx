import {
  Autocomplete,
  Button,
  Collapse,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import DatasetSummary from "./dataset-summary";
import { useContext, useEffect, useState } from "react";
import { BasicContext } from "../../basic-indicator";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import { fetchUserLRSList } from "./utils/dataset-api";
import CustomTooltip from "../../../../../../common/components/custom-tooltip/custom-tooltip";

export default function Dataset() {
  const { api } = useContext(AuthContext);
  const { lockedStep, setLockedStep, dataset, setDataset } =
    useContext(BasicContext);
  const [state, setState] = useState({
    tipAnchor: null,
    tipDescription: `
      <b>Tip!</b><br/>
      To be decided!
    `,
  });

  useEffect(() => {
    const loadMyLearningRecordStores = async () => {
      try {
        const myLRSList = await fetchUserLRSList(api);
        setDataset((p) => ({ ...p, myLRSList: myLRSList }));
      } catch (error) {
        console.error(`Failed to load LRS data`, error);
      }
    };
    loadMyLearningRecordStores();
  }, []);

  const handleDatasetPopoverAnchor = (param) => {
    setState((p) => ({ ...p, tipAnchor: param }));
  };

  const handleShowOptions = () => {
    return dataset.myLRSList.filter(
      (item) =>
        !dataset.selectedLRSList.some((selected) => selected.id === item.id)
    );
  };

  const handleSelectLRS = (selectedLRSList) => {
    setDataset((p) => ({ ...p, selectedLRSList: selectedLRSList }));
  };

  const handleCheckDisabled = () => {
    return dataset.selectedLRSList.length === 0;
  };

  const handleUnlockPath = () => {
    setLockedStep((p) => ({
      ...p,
      dataset: { ...p.dataset, openPanel: !p.dataset.openPanel },
      filters: { ...p.filters, locked: false, openPanel: true },
    }));
  };

  return (
    <>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container>
          <Grid size={{ xs: 12 }}>
            <DatasetSummary />
            <Collapse
              in={lockedStep.dataset.openPanel}
              timeout={{ enter: 500, exit: 250 }}
              unmountOnExit
            >
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Grid container spacing={2} justifyContent="center">
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Grid container spacing={1}>
                        <Grid size="grow">
                          <Typography>Source of data</Typography>
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid size="grow">
                              <Autocomplete
                                autoFocus
                                disablePortal
                                disableCloseOnSelect
                                fullWidth
                                getOptionLabel={(option) => option.lrsTitle}
                                value={dataset.selectedLRSList}
                                multiple
                                options={handleShowOptions()}
                                renderInput={(params) => (
                                  <TextField
                                    {...params}
                                    placeholder="Learning Record Stores"
                                  />
                                )}
                                renderOption={(props, option) => {
                                  const { key, ...restProps } = props;
                                  return (
                                    <li {...restProps} key={key}>
                                      {option.lrsTitle}
                                    </li>
                                  );
                                }}
                                onChange={(event, value) => {
                                  if (value) handleSelectLRS(value);
                                }}
                              />
                            </Grid>
                            <CustomTooltip
                              type="description"
                              message={`To be decided!`}
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid size={{ xs: 12 }} sx={{ pt: 2 }}>
                      <Divider />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <Grid container justifyContent="center">
                        <Grid size={{ xs: 12, sm: 6 }}>
                          <Button
                            fullWidth
                            variant="contained"
                            disabled={handleCheckDisabled()}
                            onClick={handleUnlockPath}
                          >
                            Next
                          </Button>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Collapse>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
}
