import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import {
  Add as AddIcon,
  ClearAll as ClearAllIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import {
  Button,
  ButtonGroup,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  List,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { isNullOrEmpty } from "../../../../../isc-creator/creator/data/utils/functions.js";
import ImportDialog from "./import-dialog.jsx";
import DeleteDialog from "../../../../../../common/components/delete-dialog/delete-dialog.jsx";

const DataTableManager = () => {
  const { dataset, setDataset } = useContext(ISCContext);
  const [state, setState] = useState({
    openCsvImport: false,
    cellModesModel: {},
    selectionModel: [],
    value: "",
    anchorEl: null,
    page: 1,
    pageSize: 5,
    gridHeight: 450,
  });

  useEffect(() => {
    const calculateGridHeight = () => {
      const rowHeight = 50;
      const footerHeight = 60;
      const padding = 20;

      const numRows = state.pageSize;
      const calculatedHeight = numRows * rowHeight + footerHeight + padding;
      setState((prevState) => ({
        ...prevState,
        gridHeight: calculatedHeight,
      }));
    };
    calculateGridHeight();
  }, [state.pageSize, dataset.rows]);

  const apiRef = useGridApiRef();
  const popperRef = useRef();

  const handleOpenImportDataset = () => {
    setState((prevState) => ({
      ...prevState,
      openCsvImport: !prevState.openCsvImport,
    }));
  };

  const handleCellModesModelChange = useCallback((newModel) => {
    setState((prevState) => ({
      ...prevState,
      cellModesModel: newModel,
    }));
  }, []);

  const handleCellClick = useCallback((params) => {
    setState((prevState) => ({
      ...prevState,
      cellModesModel: {
        // Revert the mode of the other cells from other rows
        ...Object.keys(prevState.cellModesModel).reduce(
          (acc, id) => ({
            ...acc,
            [id]: Object.keys(prevState.cellModesModel[id]).reduce(
              (acc2, field) => ({
                ...acc2,
                [field]: { mode: "view" },
              }),
              {},
            ),
          }),
          {},
        ),
        [params.id]: {
          // Revert the mode of other cells in the same row
          ...Object.keys(prevState.cellModesModel[params.id] || {}).reduce(
            (acc, field) => ({ ...acc, [field]: { mode: "view" } }),
            {},
          ),
          [params.field]: { mode: "edit" },
        },
      },
    }));
  }, []);

  const handleRowSelectionModelChange = (newSelectionModel) => {
    setState((prevState) => ({
      ...prevState,
      selectionModel: newSelectionModel,
    }));
  };

  const handleProcessRowUpdate = (updatedRow) => {
    // toggleEditPanel("", false);
    const rowIndex = dataset.rows.findIndex((row) => row.id === updatedRow.id);
    const updatedRows = [...dataset.rows];
    updatedRows[rowIndex] = updatedRow;
    setDataset((prevState) => ({
      ...prevState,
      rows: updatedRows,
    }));
    return updatedRow;
  };

  const handleColumnHeaderClick = (params) => {
    apiRef.current.showColumnMenu(params.field);
  };

  const handlePopperOpen = (event) => {
    const id = event.currentTarget.dataset.id;
    const row = dataset.rows.find((r) => r.id === id);
    setState((prevState) => ({
      ...prevState,
      value: row,
      anchorEl: event.currentTarget,
    }));
  };

  const handlePopperClose = (event) => {
    if (
      state.anchorEl == null ||
      popperRef.current.contains(event.nativeEvent.relatedTarget)
    ) {
      return;
    }
    setState((prevState) => ({
      ...prevState,
      anchorEl: null,
    }));
  };

  const handleDeleteSelectedRows = () => {
    const updatedRows = dataset.rows.filter(
      (row) => !state.selectionModel.includes(row.id),
    );
    setDataset((prevState) => ({
      ...prevState,
      rows: updatedRows,
    }));
    setState((prevState) => ({
      ...prevState,
      selectionModel: [],
    }));
  };

  const handlePageChange = (event, newPage) => {
    setState((prevState) => ({
      ...prevState,
      page: newPage,
    }));
  };

  const handleRowsPerPageChange = (event) => {
    setState((prevState) => ({
      ...prevState,
      pageSize: parseInt(event.target.value, 10),
      page: 1, // Reset to first page
    }));
  };

  const totalPages = Math.ceil(dataset.rows.length / state.pageSize);
  const paginatedRows = dataset.rows.slice(
    (state.page - 1) * state.pageSize,
    state.page * state.pageSize,
  );

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Grid
            container
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
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
            <Menu
              anchorEl={state.anchorEl}
              open={Boolean(state.anchorEl)}
              onClose={(event) =>
                setState((prevState) => ({
                  ...prevState,
                  anchorEl: null,
                }))
              }
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <MenuItem
                onClick={() =>
                  setState((prevState) => ({
                    ...prevState,
                    deleteDialog: true,
                  }))
                }
              >
                <ListItemIcon>
                  <DeleteIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Delete dataset</ListItemText>
              </MenuItem>
            </Menu>
            <DeleteDialog
              open={state.deleteDialog}
              toggleOpen={() =>
                setState((prevState) => ({
                  ...prevState,
                  deleteDialog: false,
                }))
              }
              message={
                <>
                  <Typography gutterBottom>
                    Deleting this dataset will permanently remove all associated
                    data and cannot be undone. Please consider the following
                    before proceeding:
                  </Typography>
                  <Typography gutterBottom>
                    <li>
                      All data contained within this dataset will be lost.
                    </li>
                    <li>
                      Any analyses or reports dependent on this dataset may be
                      affected.
                    </li>
                    <li>
                      There is no way to recover this dataset once it is
                      deleted.
                    </li>
                  </Typography>
                  <Typography gutterBottom>
                    If you are certain about deleting this dataset, please click
                    the "Delete" button below. Otherwise, click "Cancel" to keep
                    the dataset intact.
                  </Typography>
                </>
              }
              handleDelete={() => {
                setDataset((prevState) => ({
                  ...prevState,
                  rows: [],
                  columns: [],
                }));
              }}
            />
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <DataGrid
            columns={dataset.columns}
            rows={paginatedRows}
            apiRef={apiRef}
            columnMenuClearIcon={<ClearAllIcon />}
            cellModesModel={state.cellModesModel}
            checkboxSelection
            disableRowSelectionOnClick={false}
            disableColumnMenu={false}
            onColumnHeaderClick={(params) => handleColumnHeaderClick(params)}
            onCellModesModelChange={handleCellModesModelChange}
            onCellClick={handleCellClick}
            onRowSelectionModelChange={(newSelectionModel) =>
              handleRowSelectionModelChange(newSelectionModel)
            }
            pageSizeOptions={[5, 10, 25]}
            processRowUpdate={handleProcessRowUpdate}
            rowHeight={40}
            selectionModel={state.selectionModel}
            showCellVerticalBorder
            showFooterRowCount
            showFooterSelectedRowCount
            slots={{
              noRowsOverlay: () => (
                <Grid
                  container
                  justifyContent="center"
                  alignItems="center"
                  sx={{ height: "100%" }}
                >
                  <Grid item>
                    <Typography align="center">No data available.</Typography>
                    <Typography align="center">
                      <b>Create a new column</b> to add data to the table
                    </Typography>
                  </Grid>
                </Grid>
              ),
              columnMenu: (props) => {
                let tempRowData = [...dataset.rows];
                const foundNullEmpty = tempRowData.every((row) =>
                  isNullOrEmpty(row[props.colDef.field]),
                );
                return (
                  <Stack py={0.5}>
                    {/* TODO: Make the rename and add row functionalities */}
                    <List
                      sx={{ width: "100%", mb: -1 }}
                      subheader={
                        <ListSubheader>
                          Column type:{" "}
                          {props.colDef.type === "string"
                            ? "Categorical"
                            : "Numerical"}
                        </ListSubheader>
                      }
                    />
                    <Tooltip
                      arrow
                      placement="right"
                      title={
                        <Typography variant="body2" sx={{ p: 1 }}>
                          {!foundNullEmpty
                            ? "Cannot change column type because the column has values. Please delete all the values in this column and try again."
                            : "Change column type"}
                        </Typography>
                      }
                    >
                      <span>
                        <MenuItem
                          sx={{ py: 1 }}
                          disabled={!foundNullEmpty}
                          // onClick={() => {
                          //   handleOpenChangeColumnType(props.colDef);
                          //   toggleEditPanel("", false);
                          // }}
                        >
                          <ListItemIcon>
                            <EditIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary="Change column type" />
                        </MenuItem>
                      </span>
                    </Tooltip>

                    <MenuItem
                    // onClick={() => {
                    //   toggleEditPanel("", false);
                    //   handleOpenRenameColumn(props.colDef);
                    // }}
                    >
                      <ListItemIcon>
                        <EditIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Rename column" />
                    </MenuItem>
                    <Divider />
                    <MenuItem
                    // onClick={() => {
                    //   setOpenDeleteColumnModal({
                    //     columnToBeDeleted: props.colDef.field,
                    //     open: true,
                    //   });
                    //   toggleEditPanel("", false);
                    // }}
                    >
                      <ListItemIcon>
                        <DeleteIcon fontSize="small" color="error" />
                      </ListItemIcon>
                      <ListItemText primary="Delete column" />
                    </MenuItem>
                  </Stack>
                );
              },
              footer: () => (
                <>
                  <Grid container>
                    <Grid item xs={12}>
                      <Divider />
                    </Grid>
                  </Grid>
                  <Grid
                    container
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                    px={2}
                    py={2}
                  >
                    <Grid item xs>
                      <Grid container spacing={2} alignItems="center">
                        {state.selectionModel.length !== 0 && (
                          <>
                            <Grid item>
                              <Typography variant="body2">
                                {state.selectionModel.length} row(s) selected
                              </Typography>
                            </Grid>
                            <Grid item>
                              <Tooltip
                                arrow
                                title={
                                  <Typography>Delete selected rows</Typography>
                                }
                              >
                                <IconButton
                                  size="small"
                                  onClick={handleDeleteSelectedRows}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Grid>
                          </>
                        )}
                      </Grid>
                    </Grid>

                    <Grid item>
                      <Pagination
                        count={totalPages}
                        page={state.page}
                        onChange={handlePageChange}
                      />
                    </Grid>
                    <Grid item xs={2}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Page</InputLabel>
                        <Select
                          value={state.pageSize}
                          label="Page size"
                          onChange={handleRowsPerPageChange}
                        >
                          {[5, 10, 25].map((size) => (
                            <MenuItem key={size} value={size}>
                              {size} rows per page
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </>
              ),
            }}
            sx={{
              "& .MuiDataGrid-columnHeaders": {
                cursor: "pointer",
                fontSize: "17px",
                textDecorationLine: "underline",
              },
              "& .MuiDataGrid-cell:hover": {
                color: "primary.main",
              },
              height: state.gridHeight,
            }}
            componentsProps={{
              row: {
                onMouseEnter: handlePopperOpen,
                onMouseLeave: handlePopperClose,
              },
            }}
          />
        </Grid>
      </Grid>
    </>
  );
};

export default DataTableManager;
