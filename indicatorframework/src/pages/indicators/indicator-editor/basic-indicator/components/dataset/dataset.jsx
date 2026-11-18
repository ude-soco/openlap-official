import CommunityComparison from "../../../../../../common/components/community-adaptation/community-comparison.jsx";
import {
  Alert,
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
import { useContext, useEffect, useRef, useState } from "react";
import { BasicContext } from "../../basic-indicator";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import { fetchActivityTypesList, fetchUserLRSList } from "./utils/dataset-api";
import CustomTooltip from "../../../../../../common/components/custom-tooltip/custom-tooltip";
import CustomDialog from "../../../../../../common/components/custom-dialog/custom-dialog";
import WorkflowSection from "../../../../../../common/components/workflow-section/workflow-section.jsx";
import { refreshBasicReferences } from "../../utils/basic-draft-model.js";
import { getStepStatus } from "../../utils/basic-workflow-ui.js";

export default function Dataset() {
  const { api } = useContext(AuthContext);
  const {
    comparisonReference, configuration, isCommunityAdaptation,
    lockedStep,
    setLockedStep,
    dataset,
    setDataset,
    setFilters,
    handleResetIfDatasetEmpty,
  } = useContext(BasicContext);
  const selectionRun = useRef(0);
  useEffect(() => () => { selectionRun.current += 1; }, []);
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
    let current = true;
    const loadMyLearningRecordStores = async () => {
      try {
        const myLRSList = await fetchUserLRSList(api);
        if (current) setDataset((p) => ({ ...p, myLRSList: myLRSList }));
      } catch (error) {
        console.error(`Failed to load LRS data`, error);
      }
    };
    loadMyLearningRecordStores();
    return () => { current = false; };
  }, [api, setDataset]);

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
    const run = ++selectionRun.current;
    setDataset((p) => ({ ...p, selectedLRSList: selectedLRSList }));
    if (selectedLRSList.length !== 0) {
      if (isCommunityAdaptation) {
        const refreshed = await refreshBasicReferences(api, { ...configuration, dataset: { selectedLRSList } }, { adaptation: true });
        if (run === selectionRun.current) setFilters((previous) => ({ ...refreshed.state.filters,
          selectedUserFilter: previous.selectedUserFilter }));
        return;
      }
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
      <WorkflowSection
        stepKey="dataset"
        status={getStepStatus(lockedStep, "dataset")}
        ariaLabel="Dataset step"
      >
        <DatasetSummary />
          <Collapse
            in={lockedStep.dataset.openPanel}
            timeout={{ enter: 500, exit: 250 }}
            unmountOnExit
          >
            <Stack sx={{ gap: 2 }}>
              <CommunityComparison step="dataset" reference={comparisonReference} configuration={configuration}>
              <Container maxWidth="lg">
                <Stack sx={{ gap: 2 }}>
                  <Typography>Source of data</Typography>
                  {isCommunityAdaptation && !dataset.myLRSList.length && <Alert severity="info" action={<Button color="inherit" href="/manage-lrs" target="_blank" rel="noopener noreferrer">Manage LRS</Button>}>Connect an LRS to preview your data. This adaptation is kept as a private draft.</Alert>}
                  <Stack sx={{ gap: 2, alignItems: "center", minWidth: 0 }} direction="row">
                    <Autocomplete
                      sx={{ minWidth: 0, flex: 1 }}
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
                      renderOption={(attributes, option) => {
                        const { key, ...restProps } = attributes;
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
              </CommunityComparison>
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
      </WorkflowSection>
    </>
  );
}
