import React from "react";
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

const TableHeaderBar = ({ state, setState }) => {
  const handleOpenImportDataset = () => {
    setState((prevState) => ({
      ...prevState,
      openCsvImport: !prevState.openCsvImport,
    }));
  };

  return (
    <>
      <Grid container spacing={2} justifyContent="center" alignItems="center">
        <Grid item xs>
          <ButtonGroup variant="contained" disableElevation>
            <Button startIcon={<AddIcon />}>Column</Button>
            <Button startIcon={<AddIcon />}>Rows</Button>
          </ButtonGroup>
        </Grid>
        <Grid item>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Button onClick={handleOpenImportDataset}>Upload CSV</Button>
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
        <TableMenu state={state} setState={setState} />
      </Grid>
    </>
  );
};

export default TableHeaderBar;
