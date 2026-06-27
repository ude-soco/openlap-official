import { useContext, useState } from "react";
import { Box, Button, Stack } from "@mui/material";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import ViewColumnRoundedIcon from "@mui/icons-material/ViewColumnRounded";
import UploadRoundedIcon from "@mui/icons-material/UploadRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import { ISCContext } from "../../../../isc-context.js";
import AddColumnDialog from "../../components/add-column-dialog.jsx";
import AddRowDialog from "../../components/add-row-dialog.jsx";
import ImportDialog from "../../components/import-dialog.jsx";
import ResetDatasetDialog from "../../components/reset-dataset-dialog.jsx";

// Dataset Builder toolbar (Phase 4E).
//
// Replaces the old vertical action rail with a compact horizontal toolbar above
// the table. Pure relocation/redesign of the actions — it opens the SAME
// dialogs (Add row / Add column / Import / Reset) with the SAME handlers, so no
// behavior changes. Toolbar concerns live here, not in DataTableManager.
const DatasetToolbar = () => {
  const { setDataset, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    openCsvImport: false,
    openAddColumn: false,
    openAddRow: false,
    deleteDialog: false,
  });

  const handleOpenImportDataset = () =>
    setState((p) => ({ ...p, openCsvImport: !p.openCsvImport }));
  const handleOpenAddColumn = () =>
    setState((p) => ({ ...p, openAddColumn: !p.openAddColumn }));
  const handleOpenAddRow = () =>
    setState((p) => ({ ...p, openAddRow: !p.openAddRow }));
  const handleOpenDeleteDialog = () =>
    setState((p) => ({ ...p, deleteDialog: !p.deleteDialog }));

  // Unchanged from the previous rail: reset clears rows, columns, file, and the
  // Step 1 data requirements those columns are derived from.
  const handleDeleteDataset = () => {
    setDataset((p) => ({ ...p, rows: [], columns: [], file: { name: "" } }));
    setRequirements((p) => ({ ...p, data: [] }));
  };

  return (
    <>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Button
            variant="contained"
            startIcon={<TableRowsRoundedIcon />}
            onClick={handleOpenAddRow}
          >
            Add row
          </Button>
          <Button
            variant="outlined"
            startIcon={<ViewColumnRoundedIcon />}
            onClick={handleOpenAddColumn}
          >
            Add column
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadRoundedIcon />}
            onClick={handleOpenImportDataset}
          >
            Import dataset
          </Button>
        </Stack>
        <Box>
          <Button
            variant="text"
            color="error"
            startIcon={<RestartAltRoundedIcon />}
            onClick={handleOpenDeleteDialog}
          >
            Reset
          </Button>
        </Box>
      </Stack>

      <ImportDialog
        open={state.openCsvImport}
        toggleOpen={handleOpenImportDataset}
      />
      <AddColumnDialog
        open={state.openAddColumn}
        toggleOpen={handleOpenAddColumn}
      />
      <AddRowDialog open={state.openAddRow} toggleOpen={handleOpenAddRow} />
      <ResetDatasetDialog
        open={state.deleteDialog}
        onCancel={handleOpenDeleteDialog}
        onConfirm={() => {
          handleDeleteDataset();
          handleOpenDeleteDialog();
        }}
      />
    </>
  );
};

export default DatasetToolbar;
