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
import { fetchActivityTypesList, fetchUserLRSList } from "./utils/dataset-api";
import CustomTooltip from "../../../../../../common/components/custom-tooltip/custom-tooltip";
import CustomDialog from "../../../../../../common/components/custom-dialog/custom-dialog";

export default function Dataset() {
  const { api } = useContext(AuthContext);
  const {
    lockedStep,
    setLockedStep,
    dataset,
    setDataset,
    setFilters,
    handleResetIfDatasetEmpty,
  } = useContext(BasicContext);
  const [state, setState] = useState({
    lrsDialog: {
      openDialogLRS: false,
      content: `Removing an LRS from the list will have the following effects:<br/>
      • All chosen activity filters in <b>Filters</b> will be removed<br/>
      • Analyzed data in <b>Analysis</b> will be deleted<br/>
      • Chosen visualization and its customizations in <b>Visualization</b> will be lost<br/><br/>
      Please confirm before proceeding.
      `,
      pendingLRSList: null,
    },
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

  const handleShowOptions = () => {
    return dataset.myLRSList.filter(
      (item) =>
        !dataset.selectedLRSList.some((selected) => selected.id === item.id)
    );
  };

  const handleToggleDialogOpen = (pendingLRSList = null) => {
    setState((p) => ({
      ...p,
      lrsDialog: {
        ...p.lrsDialog,
        openDialogLRS: !p.lrsDialog.openDialogLRS,
        pendingLRSList,
      },
    }));
  };

  const handleSelectLRS = async (selectedLRSList) => {
    const isRemoving =
      dataset.selectedLRSList.length > selectedLRSList.length &&
      !lockedStep.filters.locked &&
      !state.lrsDialog.openDialogLRS;
    if (isRemoving) {
      handleToggleDialogOpen(selectedLRSList);
      return;
    }
    setDataset((p) => ({ ...p, selectedLRSList: selectedLRSList }));
    if (selectedLRSList.length !== 0) {
      try {
        const activityTypesList = await fetchActivityTypesList(
          api,
          selectedLRSList
        );
        setFilters((p) => ({ ...p, activityTypesList: activityTypesList }));
      } catch (error) {
        console.error(`Failed to load Activity types list`, error);
      }
    } else {
      handleResetIfDatasetEmpty();
    }
  };

  const handleConfirmRemoveLRS = async () => {
    await handleSelectLRS(state.lrsDialog.pendingLRSList);
    handleToggleDialogOpen();
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
              <CustomDialog
                open={state.lrsDialog.openDialogLRS}
                toggleOpen={handleToggleDialogOpen}
                content={state.lrsDialog.content}
                handler={handleConfirmRemoveLRS}
              />
            </Collapse>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
}
