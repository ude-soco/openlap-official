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
import { useContext, useEffect } from "react";
import { BasicContext } from "../../basic-indicator";
import { AuthContext } from "../../../../../../setup/auth-context-manager/auth-context-manager";
import { fetchActivityTypesList, fetchUserLRSList } from "./utils/dataset-api";
import CustomTooltip from "../../../../../../common/components/custom-tooltip/custom-tooltip";
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

  const handleSelectLRS = async (selectedLRSList) => {
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
            </Stack>
          </Collapse>
        </Stack>
      </CustomPaper>
    </>
  );
}
