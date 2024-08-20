import React, { useState } from "react";
import {
  Button,
  ButtonGroup,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add as AddIcon, MoreVert as MoreVertIcon } from "@mui/icons-material";
import ImportDialog from "../../components/import-dialog.jsx";
import TableMenu from "./table-menu.jsx";
import AddColumnDialog from "../../components/add-column-dialog.jsx";
import AddRowDialog from "../../components/add-row-dialog.jsx";

const TableHeaderBar = () => {
  const [state, setState] = useState({
    openCsvImport: false,
    openAddColumn: false,
    openAddRow: false,
  });

  const handleOpenImportDataset = () => {
    setState((prevState) => ({
      ...prevState,
      openCsvImport: !prevState.openCsvImport,
    }));
  };

  const handleOpenAddColumn = () => {
    setState((prevState) => ({
      ...prevState,
      openAddColumn: !prevState.openAddColumn,
    }));
  };

  const handleOpenAddRow = () => {
    setState((prevState) => ({
      ...prevState,
      openAddRow: !prevState.openAddRow,
    }));
  };

  return (
    <>
      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item xs>
          <ButtonGroup variant="contained" disableElevation>
            <Button startIcon={<AddIcon />} onClick={handleOpenAddColumn}>
              Column
            </Button>
            <Button startIcon={<AddIcon />} onClick={handleOpenAddRow}>
              Rows
            </Button>
          </ButtonGroup>
        </Grid>
        <Grid item>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Button variant="contained" onClick={handleOpenImportDataset}>
                Upload CSV
              </Button>
            </Grid>
            <Grid item>
              <Tooltip
                arrow
                title={
                  <Typography variant="body2" sx={{ p: 1 }}>
                    More options
                  </Typography>
                }
              >
                <IconButton
                  color="primary"
                  onClick={(event) =>
                    setState((prevState) => ({
                      ...prevState,
                      anchorEl: event.currentTarget,
                    }))
                  }
                >
                  <MoreVertIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Grid>
        <ImportDialog
          open={state.openCsvImport}
          toggleOpen={handleOpenImportDataset}
        />
        <AddColumnDialog
          open={state.openAddColumn}
          toggleOpen={handleOpenAddColumn}
        />
        <AddRowDialog open={state.openAddRow} toggleOpen={handleOpenAddRow} />
        <TableMenu state={state} setState={setState} />
      </Grid>
    </>
  );
};

export default TableHeaderBar;
