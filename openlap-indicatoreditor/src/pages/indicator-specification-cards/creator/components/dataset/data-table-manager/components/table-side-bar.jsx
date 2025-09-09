import { useContext, useState } from "react";
import {
  Button,
  ButtonGroup,
  Divider,
  Stack,
  Grid,
  Tooltip,
  Typography,
} from "@mui/material";
import { ISCContext } from "../../../../indicator-specification-card.jsx";
import DeleteDialog from "../../../../../../../common/components/delete-dialog/delete-dialog.jsx";
import AddColumnDialog from "../../components/add-column-dialog.jsx";
import AddRowDialog from "../../components/add-row-dialog.jsx";
import ImportDialog from "../../components/import-dialog.jsx";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import TableRowsIcon from "@mui/icons-material/TableRows";
import UploadIcon from "@mui/icons-material/Upload";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

const TableSideBar = () => {
  const { setDataset, setRequirements } = useContext(ISCContext);
  const [state, setState] = useState({
    openCsvImport: false,
    openAddColumn: false,
    openAddRow: false,
    deleteDialog: false,
  });

  const handleOpenImportDataset = () => {
    setState((p) => ({ ...p, openCsvImport: !p.openCsvImport }));
  };

  const handleOpenAddColumn = () => {
    setState((p) => ({ ...p, openAddColumn: !p.openAddColumn }));
  };

  const handleOpenAddRow = () => {
    setState((p) => ({ ...p, openAddRow: !p.openAddRow }));
  };

  const handleOpenDeleteDialog = () => {
    setState((p) => ({ ...p, deleteDialog: !p.deleteDialog }));
  };

  const handleDeleteDataset = () => {
    setDataset((p) => ({ ...p, rows: [], columns: [], file: { name: "" } }));
    setRequirements((p) => ({ ...p, data: [] }));
  };

  return (
    <>
      <Stack spacing={1} sx={{ width: "90px" }}>
        <ButtonGroup
          variant="outlined"
          color="primary"
          disableElevation
          orientation="vertical"
        >
          <Tooltip
            arrow
            placement="right"
            title={<Typography>Add a new column to the dataset</Typography>}
          >
            <Button onClick={handleOpenAddColumn}>
              <Grid container sx={{ py: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <ViewColumnIcon />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography
                    variant="body2"
                    dangerouslySetInnerHTML={{
                      __html: `Insert<br />
                        Column`,
                    }}
                  />
                </Grid>
              </Grid>
            </Button>
          </Tooltip>
          <Tooltip
            arrow
            placement="right"
            title={<Typography>Add a new row(s) to the dataset</Typography>}
          >
            <Button onClick={handleOpenAddRow}>
              <Grid container sx={{ py: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <TableRowsIcon />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography
                    variant="body2"
                    dangerouslySetInnerHTML={{
                      __html: `Insert<br />
                        Rows`,
                    }}
                  />
                </Grid>
              </Grid>
            </Button>
          </Tooltip>
        </ButtonGroup>

        <Divider />
        <ButtonGroup
          variant="outlined"
          color="primary"
          disableElevation
          orientation="vertical"
        >
          <Tooltip
            arrow
            placement="right"
            title={<Typography>Upload your CSV file</Typography>}
          >
            <Button onClick={handleOpenImportDataset}>
              <Grid container sx={{ py: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <UploadIcon />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography
                    variant="body2"
                    dangerouslySetInnerHTML={{
                      __html: `Upload<br />
                        CSV`,
                    }}
                  />
                </Grid>
              </Grid>
            </Button>
          </Tooltip>
        </ButtonGroup>
        <Divider />
        <ButtonGroup
          variant="outlined"
          color="primary"
          disableElevation
          orientation="vertical"
        >
          <Tooltip
            arrow
            placement="right"
            title={<Typography>Clear the dataset table</Typography>}
          >
            <Button onClick={handleOpenDeleteDialog}>
              <Grid container sx={{ py: 1 }}>
                <Grid size={{ xs: 12 }}>
                  <RestartAltIcon />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography
                    variant="body2"
                    dangerouslySetInnerHTML={{
                      __html: `Reset`,
                    }}
                  />
                </Grid>
              </Grid>
            </Button>
          </Tooltip>
        </ButtonGroup>
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
      <DeleteDialog
        reset
        open={state.deleteDialog}
        toggleOpen={handleOpenDeleteDialog}
        handleDelete={handleDeleteDataset}
        message={
          <>
            <Typography gutterBottom>
              Resetting this dataset will permanently remove all associated data
              and cannot be undone. Please consider the following before
              proceeding:
            </Typography>
            <Typography gutterBottom>
              <li>All data contained within this dataset will be lost.</li>
              <li>
                Any analyses or reports dependent on this dataset may be
                affected.
              </li>
              <li>
                There is no way to recover this dataset once it is deleted.
              </li>
            </Typography>
            <Typography gutterBottom>
              If you are certain about deleting this dataset, please click the
              "Reset" button below. Otherwise, click "Cancel" to keep the
              dataset intact.
            </Typography>
          </>
        }
      />
    </>
  );
};

export default TableSideBar;
