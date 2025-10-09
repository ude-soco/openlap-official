import {
  Autocomplete,
  Button,
  Collapse,
  Divider,
  TextField,
  Typography,
  Stack,
  Container,
} from "@mui/material";
import DatasetSummary from "./dataset-summary";
import { useContext, useEffect, useState } from "react";
import { BasicContext } from "../../basic-indicator";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import { fetchActivityTypesList, fetchUserLRSList } from "./utils/dataset-api";
import CustomTooltip from "../../../../../../common/components/custom-tooltip/custom-tooltip";
import CustomDialog from "../../../../../../common/components/custom-dialog/custom-dialog";
import CustomPaper from "../../../../../../common/components/custom-paper/custom-paper";

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
      // TODO: Ideally, if user decides to remove it, it should analyze and visualize with the remaining filters
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
      <CustomPaper sx={{ p: 2 }}>
        <Stack gap={2}>
          <DatasetSummary />
          <Collapse
            in={lockedStep.dataset.openPanel}
            timeout={{ enter: 500, exit: 250 }}
            unmountOnExit
          >
            <Stack gap={2}>
              <Container maxWidth="lg">
                <Stack gap={2}>
                  <Typography>Source of data</Typography>
                  <Stack gap={2} direction="row" alignItems="center">
                    <Autocomplete
                      autoFocus
                      disablePortal
                      disableClearable
                      disableCloseOnSelect
                      fullWidth
                      getOptionLabel={(option) => option.lrsTitle}
                      value={dataset.selectedLRSList}
                      multiple
                      options={handleShowOptions()}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Search for Learning Record Stores (LRS)"
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
                    <CustomTooltip
                      type="description"
                      message={`To be decided!`}
                    />
                  </Stack>
                </Stack>
              </Container>
              <Divider />
              <Container maxWidth="sm">
                <Button
                  fullWidth
                  variant="contained"
                  disabled={handleCheckDisabled()}
                  onClick={handleUnlockPath}
                >
                  Next
                </Button>
              </Container>
              <CustomDialog
                type="delete"
                open={state.lrsDialog.openDialogLRS}
                toggleOpen={handleToggleDialogOpen}
                content={state.lrsDialog.content}
                handler={handleConfirmRemoveLRS}
              />
            </Stack>
          </Collapse>
        </Stack>
      </CustomPaper>
    </>
  );
}
