import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  ChevronRight as ChevronRightIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { extractProperties } from "../charts/utils/chart-utils.js";

export default function EditPanel({
  columns,
  dataState,
  dataState: { columnData },
  rows,
  toggleEditPanel,
  handleAddNewRows,
  handleProcessRowUpdate,
  handleRenameColumn,
  handleDeleteIndicatorData,
}) {
  const [rowsDataGrid, setRowsDataGrid] = useState(rows);
  const [newColumnName, setNewColumnName] = useState(columns[0].headerName);
  const [columnNameExists, setColumnNameExist] = useState({
    status: false,
    message: "",
  });
  const [openColumnModal, setOpenColumnModal] = useState(false);
  const [numberOfRows, setNumberOfRows] = useState(0);
  const [openRowModal, setOpenRowModal] = useState(false);
  const [selectionModel, setSelectionModel] = useState([]);

  const apiRef = useGridApiRef();
  const [cellModesModel, setCellModesModel] = useState({});

  useEffect(() => {
    const iscData = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
    let tempColData = iscData.indicatorData.columnData;
    let tempRowData = iscData.indicatorData.rowData;
    if (tempColData.some((column) => column.field === columns[0].field)) {
      let tempRows = extractProperties(tempRowData, ["id", columns[0].field]);
      setRowsDataGrid(tempRows);
    }
  }, [dataState, columns[0].headerName]);

  const handleOnChangeRenameHeader = (event) => {
    let tempName = event.target.value;
    setNewColumnName(tempName);
    if (Boolean(newColumnName)) {
      if (
        columnData.find(
          (col) => col.headerName.toLowerCase() === tempName.toLowerCase()
        )
      ) {
        if (tempName !== columns[0].headerName && tempName !== "") {
          setColumnNameExist({
            status: true,
            message: "Axis title already exists",
          });
        } else {
          // TODO: Check whether this is necessary
          setColumnNameExist({ status: false, message: "" });
        }
      } else {
        setColumnNameExist({ status: false, message: "" });
      }
    }
  };

  const handleOpenRenameColumn = () => {
    setNewColumnName(columns[0].headerName);
    setOpenColumnModal(true);
  };

  // TODO: Fix the rename feature
  const handleConfirmRenameColumn = (event) => {
    event.preventDefault();
    if (newColumnName !== "") {
      setOpenColumnModal(false);
      handleRenameColumn(newColumnName);
    }
  };

  const handleCellClick = useCallback((params) => {
    if (params.field === "Edit" || params.field === "Delete") {
      return;
    }
    setCellModesModel((prevModel) => {
      return {
        // Revert the mode of the other cells from other rows
        ...Object.keys(prevModel).reduce(
          (acc, id) => ({
            ...acc,
            [id]: Object.keys(prevModel[id]).reduce(
              (acc2, field) => ({
                ...acc2,
                [field]: { mode: "view" },
              }),
              {}
            ),
          }),
          {}
        ),
        [params.id]: {
          // Revert the mode of other cells in the same row
          ...Object.keys(prevModel[params.id] || {}).reduce(
            (acc, field) => ({ ...acc, [field]: { mode: "view" } }),
            {}
          ),
          [params.field]: { mode: "edit" },
        },
      };
    });
  }, []);

  const handleCellModesModelChange = useCallback((newModel) => {
    setCellModesModel(newModel);
  }, []);

  const handleDeleteRows = () => {
    // Get the IDs of the selected rows
    const selectedRowIds = [...selectionModel];
    handleDeleteIndicatorData(selectedRowIds);
    setSelectionModel([]);
  };

  return (
    <>
      <Box
        sx={{
          pl: 3,
          position: "relative",
          ml: 2,
          borderLeft: "2px solid #D6D6D6",
        }}
      >
        <Tooltip
          arrow
          placement="right"
          title={
            <Typography variant="body2" sx={{ p: 1 }}>
              Close panel
            </Typography>
          }
        >
          <Paper
            sx={{
              position: "absolute",
              borderRadius: "50%",
              width: 32,
              left: -17,
              top: 60,
              boxShadow: 5,
              cursor: "pointer",
              "&:hover": {
                boxShadow: 10,
              },
            }}
            onClick={() => toggleEditPanel("", false)}
          >
            <Box
              sx={{
                display: "flex",
                minHeight: 32,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ChevronRightIcon color="primary" />
            </Box>
          </Paper>
        </Tooltip>

        {columnData.length === 1 && (
          <Grid container sx={{ pb: 2 }} justifyContent="space-between">
            <Grid item xs>
              {selectionModel.length > 0 ? (
                <Grid container alignItems="center">
                  <Button
                    color="error"
                    variant="outlined"
                    onClick={handleDeleteRows}
                    startIcon={<DeleteIcon />}
                  >
                    Delete {selectionModel.length} row
                    {selectionModel.length > 1 ? "s" : ""}?
                  </Button>
                </Grid>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  // disabled={!Boolean(rowData.length)}
                  onClick={() => setOpenRowModal(true)}
                >
                  Add rows
                </Button>
              )}
            </Grid>
          </Grid>
        )}

        <DataGrid
          apiRef={apiRef}
          checkboxSelection={columnData.length === 1 ? true : false}
          columns={columns}
          cellModesModel={cellModesModel}
          disableRowSelectionOnClick
          hideFooterRowCount
          hideFooterSelectedRowCount
          onCellClick={handleCellClick}
          onCellModesModelChange={handleCellModesModelChange}
          onColumnHeaderClick={(params) => {
            apiRef.current.showColumnMenu(params.field);
          }}
          onRowSelectionModelChange={(newSelectionModel) => {
            setSelectionModel(newSelectionModel);
          }}
          pageSizeOptions={[]}
          processRowUpdate={handleProcessRowUpdate}
          rows={rowsDataGrid}
          selectionModel={selectionModel}
          showCellVerticalBorder
          sx={{
            height: "520px",
            mb: 2,
            "& .MuiDataGrid-columnHeaders": {
              cursor: "pointer",
              fontSize: "17px",
              textDecorationLine: "underline",
            },
            "& .MuiDataGrid-cell:hover": {
              color: "primary.main",
            },
          }}
          slots={{
            columnMenu: (props) => {
              return (
                <>
                  <MenuItem onClick={handleOpenRenameColumn} sx={{ p: 2 }}>
                    <ListItemIcon>
                      <EditIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText>
                      Rename "{props.colDef.headerName}"
                    </ListItemText>
                  </MenuItem>
                </>
              );
            },
          }}
        />
      </Box>

      <Dialog open={openColumnModal} fullWidth maxWidth="xs">
        <DialogTitle>Rename</DialogTitle>
        <form
          onSubmit={(e) => {
            handleConfirmRenameColumn(e);
          }}
        >
          <DialogContent>
            <Typography sx={{ pb: 2, mt: -3 }}>
              How would you like to rename?
            </Typography>
            <TextField
              autoFocus
              error={columnNameExists.status}
              helperText={columnNameExists.message}
              fullWidth
              label="Rename to"
              value={newColumnName}
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(e) => handleOnChangeRenameHeader(e)}
              variant="outlined"
            />
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              fullWidth
              onClick={() => {
                setOpenColumnModal(false);
                setNewColumnName("");
                let iscData = JSON.parse(
                  sessionStorage.getItem("openlap-isc-data")
                );
                let tempISCData = {
                  ...iscData,
                  temp: {
                    ...iscData.temp,
                    newColumnName: "",
                  },
                };
                sessionStorage.setItem(
                  "openlap-isc-data",
                  JSON.stringify(tempISCData)
                );
              }}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              disabled={newColumnName === "" || columnNameExists.status}
              type="submit"
              variant="contained"
            >
              Confirm
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={openRowModal} fullWidth maxWidth="xs">
        <DialogTitle>Add rows</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (numberOfRows !== 0) {
              setOpenRowModal(false);
              handleAddNewRows(numberOfRows);
            }
          }}
        >
          <DialogContent>
            <Typography sx={{ pb: 2, mt: -3 }}>
              How many rows would you like to add?
            </Typography>
            <TextField
              autoFocus
              fullWidth
              id="filled-number"
              label="Number of rows"
              type="number"
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(e) => setNumberOfRows(e.target.value)}
              variant="outlined"
            />
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => {
                setOpenRowModal(false);
                setNumberOfRows(0);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={numberOfRows === 0}
              variant="contained"
            >
              Confirm
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
