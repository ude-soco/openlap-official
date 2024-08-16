import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Link,
  List,
  ListItemIcon,
  Menu,
  ListItemText,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Popper,
  Fade,
} from "@mui/material";
import {
  Add as AddIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  ClearAll as ClearAllIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  GetApp as GetAppIcon,
  InsertDriveFile as InsertDriveFileIcon,
  KeyboardArrowLeft as KeyboardArrowLeftIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import { isNullOrEmpty } from "./utils/functions.js";
import { useSnackbar } from "notistack";

const dataset = [
  { id: 1, name: "Import Data" },
  { id: 2, name: "Create Dataset" },
];

export default function DataSelection({
  chartSelected,
  dataState,
  dataState: { rowData, columnData },
  handleAddIndicatorData,
  handleAddNewRows,
  handleDeleteIndicatorData,
  setDataState,
  resetChartSelected,
  toggleEditPanel,
  toggleUserSelectsDataset,
  toggleUserSelectsVisualization,
}) {
  const columnTypes = [
    {
      value: "Numerical",
      type: "number",
      description:
        "Numerical data means using numbers to describe things like age, height, or income. It's possible to count or measure using this data type.",
    },
    {
      value: "Categorical",
      type: "string",
      description:
        "Categorical data, also known as nominal data, classifies information into distinct, non-ordered categories. For instance, colors (e.g., red, blue, green) are categorical data, with no inherent hierarchy or order.",
    },
    // {
    //   value: "categorical (ordinal)",
    //   type: "string",
    //   description:
    //     "An 'ordinal' categorical variable has a clear ordering. For example, temperature as a variable with three orderly categories (low, medium and high)",
    // },
  ];

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 100);
  }, [dataState]);

  const apiRef = useGridApiRef();
  const popperRef = useRef();
  const { enqueueSnackbar } = useSnackbar();
  const [cellModesModel, setCellModesModel] = useState({});
  const [columnName, setColumnName] = useState("");
  const [columnNameExists, setColumnNameExist] = useState({
    status: false,
    message: "",
  });
  const [columnNameOriginal, setColumnNameOriginal] = useState("");
  const [numberOfRows, setNumberOfRows] = useState(0);
  const [openColumnTypeModal, setOpenColumnTypeModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openDeleteColumnModal, setOpenDeleteColumnModal] = useState({
    columnToBeDeleted: "",
    open: false,
  });
  const [openNewColumnNameModal, setOpenNewColumnNameModal] = useState(false);
  const [openRenameColumnNameModal, setOpenRenameColumnNameModal] =
    useState(false);
  const [openRowModal, setOpenRowModal] = useState(false);
  const [openUploadCSVModal, setOpenUploadCSVModal] = useState(false);
  const [selectColumnData, setSelectColumnData] = useState({});
  const [selectColumnType, setSelectColumnType] = useState(columnTypes[0]);
  const [selectionModel, setSelectionModel] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [value, setValue] = useState("");

  const open = Boolean(anchorEl);

  const [anchorElDataTableMenu, setAnchorElDataTableMenu] = useState(null);
  const openDataTableMenu = Boolean(anchorElDataTableMenu);

  const handleClickDataTableMenu = (event) => {
    setAnchorElDataTableMenu(event.currentTarget);
  };
  const handleCloseDataTableMenu = () => {
    setAnchorElDataTableMenu(null);
  };

  const handlePopperOpen = (event) => {
    const id = event.currentTarget.dataset.id;
    const row = rowData.find((r) => r.id === id);
    setValue(row);
    setAnchorEl(event.currentTarget);
  };

  const handlePopperClose = (event) => {
    if (
      anchorEl == null ||
      popperRef.current.contains(event.nativeEvent.relatedTarget)
    ) {
      return;
    }

    setAnchorEl(null);
  };

  const handleUploadOrGenerate = (id) => {
    if (id === 1) {
      setOpenUploadCSVModal((prevState) => !prevState);
      return;
    }
    setDataState({
      ...dataState,
      status: true,
    });
    // handleUnpopulateData(false);
  };

  const backToDataSelection = () => {
    setDataState({
      ...dataState,
      status: false,
    });
  };

  /**
   * This function sets the state of data for a row, column, and group, and toggles the visibility of a
   * modal.
   */
  const handlePopulateDataAndCloseModal = (row, column) => {
    setDataState({
      rowData: row,
      columnData: column,
      status: true,
    });
    setOpenUploadCSVModal((prevState) => !prevState);
  };

  const handleUnpopulateData = (clear = false) => {
    setDataState({
      rowData: [],
      columnData: [],
      status: true,
    });
    toggleEditPanel("", false);
    setOpenDeleteModal(false);
    // resetChartSelected();
    sessionStorage.removeItem("chart-options");
    sessionStorage.removeItem("chart-series");
    if (clear) {
      enqueueSnackbar("Data cleared successfully", {
        variant: "success",
      });
    }
    handleClickDataTableMenu(false);
  };

  const handleProcessRowUpdate = (updatedRow) => {
    toggleEditPanel("", false);
    const rowIndex = dataState.rowData.findIndex(
      (row) => row.id === updatedRow.id
    );
    const updatedRows = [...dataState.rowData];
    updatedRows[rowIndex] = updatedRow;

    setDataState(() => ({
      ...dataState,
      rowData: updatedRows,
    }));
    return updatedRow;
  };

  // Function to change the column type from the data table
  const handleChangeColumnDataType = (event) => {
    event.preventDefault();
    const columnIndex = dataState.columnData.findIndex(
      (col) => col.field === selectColumnData.field
    );
    const updatedColumns = [...dataState.columnData];
    // updatedColumns[columnIndex] = column;
    updatedColumns[columnIndex] = {
      field: selectColumnData.field,
      headerName: selectColumnData.headerName,
      sortable: false,
      editable: true,
      width: 200,
      type: selectColumnType.type,
    };
    let openlapISCData = JSON.parse(sessionStorage.getItem("openlap-isc-data"));
    setDataState(() => {
      let tempISCData = {
        ...openlapISCData,
        indicatorData: dataState,
      };
      sessionStorage.setItem("openlap-isc-data", JSON.stringify(tempISCData));
      return {
        ...dataState,
        columnData: updatedColumns,
      };
    });
    enqueueSnackbar("Column type changed successfully", {
      variant: "success",
    });
    setLoading(true);
    setOpenColumnTypeModal(false);
  };

  // Function to open the dialog to change the column type
  const handleOpenChangeColumnType = (colDef) => {
    const filteredColumnTypes = columnTypes.filter(
      (type) => type.type === colDef.type
    );
    setSelectColumnType(() => {
      setSelectColumnData(colDef);
      setOpenColumnTypeModal(true);
      return filteredColumnTypes[0];
    });
  };

  // Function to open modal to rename an existing column header
  const handleOpenRenameColumn = (colDef) => {
    setColumnName(colDef.headerName);
    setColumnNameOriginal(colDef);
    setOpenRenameColumnNameModal(true);
  };
  // Function to change the column name in staging area
  const handleOnChangeRenameHeader = (event) => {
    let tempName = event.target.value;
    setColumnName(tempName);
    if (Boolean(columnName)) {
      if (
        columnData.find(
          (col) => col.headerName.toLowerCase() === tempName.toLowerCase()
        )
      ) {
        if (
          tempName.toLowerCase() !== columnNameOriginal.headerName.toLowerCase()
        ) {
          setColumnNameExist({
            status: true,
            message: "Axis title already exists",
          });
        } else {
          setColumnNameExist({ status: false, message: "" });
        }
      } else {
        setColumnNameExist({ status: false, message: "" });
      }
    }
  };
  // Function to rename the column header
  const handleConfirmRenameColumn = (event) => {
    event.preventDefault();
    if (columnName !== "") {
      setOpenRenameColumnNameModal(false);
      let tempColumnData = columnNameOriginal;
      tempColumnData.headerName = columnName;
      handleAddIndicatorData(null, tempColumnData, "rename");
      //   handleRenameColumn(newColumnName);
    }
    enqueueSnackbar("Column renamed successfully", {
      variant: "success",
    });
  };

  // Function to delete selected rows from the dataset
  const handleDeleteRows = () => {
    const selectedRowIds = [...selectionModel];
    handleDeleteIndicatorData(selectedRowIds);
    setSelectionModel([]);
    enqueueSnackbar("Rows deleted successfully", {
      variant: "success",
    });
  };

  const handleDeleteRow = () => {
    const selectedRowIds = [];
    selectedRowIds.push(value.id);
    enqueueSnackbar("Row deleted successfully", {
      variant: "success",
    });
    handleDeleteIndicatorData(selectedRowIds);
    setSelectionModel([]);
  };

  // Function to add a new column to the dataset
  const handleAddNewColumn = () => {
    let fieldUUID = uuidv4();
    const newColumnData = [
      ...columnData,
      {
        field: fieldUUID,
        headerName: columnName,
        sortable: false,
        editable: true,
        width: 200,
        type: selectColumnType.type,
      },
    ];
    let newRowData = [];
    if (Boolean(rowData.length)) {
      newRowData = rowData.map((row, index) => ({
        ...row,
        [fieldUUID]:
          selectColumnType.type === "string" ? `${columnName} ${index + 1}` : 0,
      }));
    } else {
      for (let i = 0; i < numberOfRows; i++) {
        newRowData.push({
          id: uuidv4(),
          [fieldUUID]:
            selectColumnType.type === "string" ? `${columnName} ${i + 1}` : 0,
        });
      }
    }
    setColumnName("");
    setNumberOfRows(0);

    setDataState({
      rowData: newRowData,
      columnData: newColumnData,
      status: true,
    });

    enqueueSnackbar("New column added successfully", {
      variant: "success",
    });
  };

  const handledeleteExistingColumn = (columnName) => {
    // Find the index of the column to delete
    const columnIndex = columnData.findIndex(
      (column) => column.field === columnName
    );

    if (columnIndex === -1) {
      // Column not found, return the original data
      return { rowData, columnData };
    }

    // Remove the column from columnData
    const newColumnData = [
      ...columnData.slice(0, columnIndex),
      ...columnData.slice(columnIndex + 1),
    ];

    // Remove the field from each row in rowData
    const newRowData = rowData.map((row) => {
      const { [columnName]: _, ...newRow } = row;
      return newRow;
    });

    setDataState({
      rowData: newColumnData.length === 0 ? [] : newRowData, // If there are no columns left, set rowData to an empty array
      columnData: newColumnData,
      status: true,
    });
    setOpenDeleteColumnModal({
      columnToBeDeleted: "",
      open: false,
    });
    enqueueSnackbar("Column deleted successfully", {
      variant: "success",
    });
  };

  const handleCellClick = useCallback((params) => {
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

  return (
    <>
      {!dataState.status && (
        <>
          {!chartSelected && (
            <Grid container justifyContent="space-between">
              <Button
                variant="outlined"
                onClick={() => toggleUserSelectsDataset()}
                startIcon={<KeyboardArrowLeftIcon />}
              >
                Back
              </Button>
            </Grid>
          )}
          <Typography align="center">
            How would you like to add your data?
          </Typography>
          <Grid
            container
            justifyContent="center"
            spacing={4}
            sx={{ py: 2, zIndex: 1 }}
          >
            {dataset.map((ds, index) => {
              return (
                <Grid item key={index} sx={{ zIndex: 9 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      height: 150,
                      width: 150,
                      border: "3px solid",
                      borderColor: "openlapTheme.secondary",
                      "&:hover": {
                        boxShadow: 5,
                        backgroundColor: "openlapTheme.light",
                      },
                      p: 2,
                      borderRadius: 2,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                    onClick={() => handleUploadOrGenerate(ds.id)}
                  >
                    <Typography variant="h6" align="center">
                      {ds.name}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
          <Dialog open={openUploadCSVModal} fullWidth maxWidth="sm">
            <DialogTitle>
              <Grid
                container
                justifyContent="space-between"
                alignItems="center"
              >
                Import Data
                <IconButton
                  onClick={() =>
                    setOpenUploadCSVModal((prevState) => !prevState)
                  }
                >
                  <CloseIcon />
                </IconButton>
              </Grid>
            </DialogTitle>
            <DialogContent>
              <Typography gutterBottom>
                You can upload a dataset in only <b>CSV</b> format.
              </Typography>
              <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                <b>Note:</b> You do not need to upload any data. Data you do
                upload is not permanently stored. We recommend against uploading
                sensitive data that is confidential or contains identifying
                information about other people or parties.
              </Typography>

              <CSVUploader
                handlePopulateDataAndCloseModal={
                  handlePopulateDataAndCloseModal
                }
              />
            </DialogContent>
          </Dialog>
        </>
      )}
      {dataState.status && (
        <>
          {!chartSelected && (
            <Grid container justifyContent="space-between" sx={{ pb: 5 }}>
              <Button
                variant="outlined"
                startIcon={<KeyboardArrowLeftIcon />}
                onClick={() => {
                  // TODO: Confirmation needed
                  // handleUnpopulateData();
                  backToDataSelection();
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                endIcon={<KeyboardArrowRightIcon />}
                onClick={() => {
                  toggleUserSelectsDataset();
                  toggleUserSelectsVisualization();
                }}
              >
                Visualization
              </Button>
            </Grid>
          )}
          <Grid
            container
            sx={{
              pl: 3.5,
            }}
          >
            <Grid item xs={12}>
              <Grid container sx={{ pb: 1 }} justifyContent="space-between">
                <Grid item xs>
                  <Grid
                    container
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Grid item xs>
                      <ButtonGroup
                        variant={
                          !Boolean(rowData.length) ? "contained" : "outlined"
                        }
                        disableElevation
                      >
                        <Button
                          startIcon={<AddIcon />}
                          onClick={() => {
                            setOpenNewColumnNameModal(true);
                            setNumberOfRows(rowData.length);
                            toggleEditPanel("", false);
                          }}
                        >
                          column
                        </Button>
                        <Button
                          startIcon={<AddIcon />}
                          disabled={!Boolean(rowData.length)}
                          onClick={() => {
                            setOpenRowModal(true);
                            toggleEditPanel("", false);
                          }}
                        >
                          rows
                        </Button>
                      </ButtonGroup>
                    </Grid>
                    <Grid item>
                      <Grid container>
                        <Grid item>
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
                            <></>
                          )}
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
                              onClick={handleClickDataTableMenu}
                            >
                              <MoreVertIcon />
                            </IconButton>
                          </Tooltip>

                          <Menu
                            anchorEl={anchorElDataTableMenu}
                            open={openDataTableMenu}
                            onClose={handleCloseDataTableMenu}
                            anchorOrigin={{
                              vertical: "bottom",
                              horizontal: "right",
                            }}
                            transformOrigin={{
                              vertical: "top",

                              horizontal: "right",
                            }}
                          >
                            <MenuItem onClick={() => setOpenDeleteModal(true)}>
                              <ListItemIcon>
                                <DeleteIcon fontSize="small" color="error" />
                              </ListItemIcon>
                              <ListItemText>Delete dataset</ListItemText>
                            </MenuItem>
                          </Menu>
                        </Grid>
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            <Grid container justifyContent="center">
              <Grid
                item
                xs={12}
                sx={{
                  height: 600,
                  maxWidth: 1890,
                  width: window.innerWidth - 340,
                }}
              >
                {!loading && (
                  <DataGrid
                    apiRef={apiRef}
                    // checkboxSelection
                    columns={dataState.columnData}
                    columnMenuClearIcon={<ClearAllIcon />}
                    cellModesModel={cellModesModel}
                    disableRowSelectionOnClick
                    disableColumnMenu={false}
                    onColumnHeaderClick={(params) => {
                      apiRef.current.showColumnMenu(params.field);
                      toggleEditPanel("", false);
                    }}
                    onCellModesModelChange={handleCellModesModelChange}
                    onCellClick={handleCellClick}
                    hideFooterRowCount
                    hideFooterSelectedRowCount
                    onRowSelectionModelChange={(newSelectionModel) => {
                      setSelectionModel(newSelectionModel);
                    }}
                    rows={dataState.rowData}
                    pageSizeOptions={[]}
                    processRowUpdate={handleProcessRowUpdate}
                    selectionModel={selectionModel}
                    showCellVerticalBorder
                    slots={{
                      noRowsOverlay: () => (
                        <Grid
                          container
                          justifyContent="center"
                          alignItems="center"
                          sx={{ height: "100%" }}
                        >
                          <Grid item>
                            <Typography align="center">
                              No data available.
                            </Typography>
                            <Typography align="center">
                              <b>Create a new column</b> to add data to the
                              table
                            </Typography>
                          </Grid>
                        </Grid>
                      ),
                      columnMenu: (props) => {
                        const iscData = JSON.parse(
                          sessionStorage.getItem("openlap-isc-data")
                        );
                        let tempRowData = iscData.indicatorData.rowData;
                        const foundNullEmpty = tempRowData.every((row) =>
                          isNullOrEmpty(row[props.colDef.field])
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
                                  onClick={() => {
                                    handleOpenChangeColumnType(props.colDef);
                                    toggleEditPanel("", false);
                                  }}
                                >
                                  <ListItemIcon>
                                    <EditIcon fontSize="small" />
                                  </ListItemIcon>
                                  <ListItemText primary="Change column type" />
                                </MenuItem>
                              </span>
                            </Tooltip>

                            <MenuItem
                              onClick={() => {
                                toggleEditPanel("", false);
                                handleOpenRenameColumn(props.colDef);
                              }}
                            >
                              <ListItemIcon>
                                <EditIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary="Rename column" />
                            </MenuItem>
                            <Divider />
                            <MenuItem
                              onClick={() => {
                                setOpenDeleteColumnModal({
                                  columnToBeDeleted: props.colDef.field,
                                  open: true,
                                });
                                toggleEditPanel("", false);
                              }}
                            >
                              <ListItemIcon>
                                <DeleteIcon fontSize="small" color="error" />
                              </ListItemIcon>
                              <ListItemText primary="Delete column" />
                            </MenuItem>
                            {/* <GridColumnMenuColumnsItem
                    onClick={() => {
                      apiRef.current.hideColumnMenu();
                      // console.log(props);
                    }}
                    {...props}
                  /> */}
                            {/* <Divider />
                  <GridColumnMenuFilterItem
                    onClick={() => {
                      apiRef.current.hideColumnMenu();
                      // console.log(props);
                    }}
                    {...props}
                  /> */}
                          </Stack>
                        );
                      },
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
                      // height: "600px",
                      mb: 2,
                    }}
                    componentsProps={{
                      row: {
                        onMouseEnter: handlePopperOpen,
                        onMouseLeave: handlePopperClose,
                      },
                    }}
                  />
                )}
              </Grid>
            </Grid>
          </Grid>
        </>
      )}

      <Popper
        ref={popperRef}
        open={open}
        anchorEl={anchorEl}
        placement={"left"}
        transition
        onMouseLeave={() => setAnchorEl(null)}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={350}>
            <Tooltip
              arrow
              title={
                <Typography variant="body2" sx={{ p: 1 }}>
                  Delete row
                </Typography>
              }
            >
              <IconButton
                component={Paper}
                elevation="5"
                // sx={{ position: "absolute", left: 330, top: -17 }}
                sx={{ zIndex: 9, transform: "translateX(-6px)" }}
                color="error"
                size="small"
                onClick={handleDeleteRow}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Fade>
        )}
      </Popper>

      {/* Change column type */}
      <Dialog open={openColumnTypeModal} fullWidth maxWidth="xs">
        <DialogTitle sx={{ mb: -4 }}>Change column type</DialogTitle>
        <form onSubmit={(e) => handleChangeColumnDataType(e)}>
          <DialogContent>
            <Grid container>
              <Grid item xs={12}>
                <Grid container alignItems="center">
                  <Grid item xs>
                    <Typography>
                      What would be the data type of this column?
                    </Typography>
                  </Grid>
                  <Tooltip
                    title={columnTypes.map((type) => (
                      <Typography variant="body2" sx={{ p: 1 }}>
                        <b>{type.value}</b>: {type.description}
                      </Typography>
                    ))}
                  >
                    <IconButton color="info">
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <FormControl sx={{ mt: 1 }} fullWidth>
                  <InputLabel>Data type</InputLabel>
                  <Select
                    required
                    value={selectColumnType.value}
                    label="Column type"
                    onChange={(event) => {
                      const selectedType = columnTypes.find(
                        (type) => type.value === event.target.value
                      );
                      setSelectColumnType(selectedType);
                    }}
                  >
                    {columnTypes.map((type, index) => {
                      return (
                        <MenuItem value={type.value} key={index}>
                          <div
                            style={{
                              display: "inline-block",
                              width: "100%",
                            }}
                          >
                            <Tooltip
                              arrow
                              placement="right"
                              title={
                                <Typography variant="body2" sx={{ p: 1 }}>
                                  {type.description}
                                </Typography>
                              }
                            >
                              <span style={{ width: 600 }}>{type.value}</span>
                            </Tooltip>
                          </div>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              fullWidth
              color="primary"
              onClick={() => setOpenColumnTypeModal((prevState) => !prevState)}
            >
              Cancel
            </Button>
            <Button fullWidth variant="contained" type="submit">
              Confirm
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Creating a new column */}
      <Dialog open={openNewColumnNameModal} fullWidth maxWidth="xs">
        <DialogTitle>New column</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (columnName !== "") {
              setOpenNewColumnNameModal(false);
              handleAddNewColumn();
            }
          }}
        >
          <DialogContent>
            <Typography sx={{ pb: 2, mt: -3 }}>
              How would you like to name the column?
            </Typography>
            <TextField
              autoFocus
              error={columnNameExists.status}
              helperText={columnNameExists.message}
              fullWidth
              label="Column name"
              value={columnName}
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(e) => setColumnName(e.target.value)}
              variant="outlined"
            />
            <Grid container>
              <Grid item xs={12}>
                <Grid container alignItems="center">
                  <Grid item xs>
                    <Typography sx={{ py: 2 }}>
                      What would be the data type of this column?
                    </Typography>
                  </Grid>
                  <Tooltip
                    title={columnTypes.map((type) => (
                      <Typography variant="body2" sx={{ p: 1 }}>
                        <b>{type.value}</b>: {type.description}
                      </Typography>
                    ))}
                  >
                    <IconButton color="info">
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <FormControl sx={{ mb: 1 }} fullWidth>
                  <InputLabel>Data type</InputLabel>
                  <Select
                    required
                    value={selectColumnType.value}
                    label="Column type"
                    onChange={(event) => {
                      const selectedType = columnTypes.find(
                        (type) => type.value === event.target.value
                      );
                      setSelectColumnType(selectedType);
                    }}
                  >
                    {columnTypes.map((type, index) => {
                      return (
                        <MenuItem value={type.value} key={index}>
                          <div
                            style={{
                              display: "inline-block",
                              width: "100%",
                            }}
                          >
                            <Tooltip
                              arrow
                              placement="right"
                              title={
                                <Typography variant="body2" sx={{ p: 1 }}>
                                  {type.description}
                                </Typography>
                              }
                            >
                              <span style={{ width: 600 }}>{type.value}</span>
                            </Tooltip>
                          </div>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container alignItems="center">
              {!Boolean(rowData.length) && (
                <>
                  <Typography
                    color={rowData.length ? "textSecondary" : ""}
                    sx={{ pt: 1, pb: 2 }}
                  >
                    How many rows would you like to add in the table?
                  </Typography>
                  <TextField
                    autoFocus={columnName !== ""}
                    defaultValue={rowData.length ? rowData.length : ""}
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
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              fullWidth
              color="primary"
              onClick={() => {
                setOpenNewColumnNameModal(false);
                setColumnName("");
                setColumnNameExist({
                  status: false,
                  message: "",
                });
                let iscData = JSON.parse(
                  sessionStorage.getItem("openlap-isc-data")
                );
                let tempISCData = {
                  ...iscData,
                  temp: {
                    ...iscData.temp,
                    columnName: "",
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
              disabled={columnName === "" || numberOfRows === 0}
              type="submit"
              variant="contained"
            >
              Confirm
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Rename a column */}
      <Dialog open={openRenameColumnNameModal} fullWidth maxWidth="xs">
        <DialogTitle>Rename column</DialogTitle>
        <form onSubmit={(event) => handleConfirmRenameColumn(event)}>
          <DialogContent>
            <Typography sx={{ pb: 2, mt: -3 }}>
              How would you like to rename the column?
            </Typography>
            <TextField
              autoFocus
              error={columnNameExists.status}
              helperText={columnNameExists.message}
              fullWidth
              label="Column name"
              value={columnName}
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(e) => handleOnChangeRenameHeader(e)}
              variant="outlined"
            />
          </DialogContent>
          <DialogActions>
            <Button
              fullWidth
              color="primary"
              onClick={() => {
                setOpenRenameColumnNameModal(false);
                setColumnName("");
                setColumnNameExist({
                  status: false,
                  message: "",
                });
                let iscData = JSON.parse(
                  sessionStorage.getItem("openlap-isc-data")
                );
                let tempISCData = {
                  ...iscData,
                  temp: {
                    ...iscData.temp,
                    columnName: "",
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
              disabled={columnName === "" || columnNameExists.status}
              type="submit"
              variant="contained"
            >
              Confirm
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={openDeleteModal} fullWidth maxWidth="sm">
        <DialogTitle>Are you sure you want to delete this dataset?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Deleting this dataset will permanently remove all associated data
            and cannot be undone. Please consider the following before
            proceeding:
          </Typography>
          <Typography gutterBottom>
            <li>All data contained within this dataset will be lost.</li>
            <li>
              Any analyses or reports dependent on this dataset may be affected.
            </li>
            <li>There is no way to recover this dataset once it is deleted.</li>
          </Typography>
          <Typography gutterBottom>
            If you are certain about deleting this dataset, please click the
            "Delete" button below. Otherwise, click "Cancel" to keep the dataset
            intact.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            onClick={() => setOpenDeleteModal(false)}
            fullWidth
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleUnpopulateData(true)}
            variant="contained"
            color="error"
            fullWidth
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Delete confirmation */}
      <Dialog open={openDeleteColumnModal.open} fullWidth maxWidth="sm">
        <DialogTitle>Are you sure you want to delete this column?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Deleting this dataset will permanently remove all associated data
            and cannot be undone. Please consider the following before
            proceeding:
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            onClick={() =>
              setOpenDeleteColumnModal({
                columnToBeDeleted: "",
                open: false,
              })
            }
            fullWidth
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              handledeleteExistingColumn(
                openDeleteColumnModal.columnToBeDeleted
              )
            }
            variant="contained"
            color="error"
            fullWidth
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create new rows */}
      <Dialog open={openRowModal} fullWidth maxWidth="xs">
        <DialogTitle>Add new rows</DialogTitle>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (numberOfRows !== 0) {
              setOpenRowModal(false);
              handleAddNewRows(numberOfRows);
              toggleEditPanel("", false);
            }
          }}
        >
          <DialogContent>
            <Typography sx={{ pb: 2, mt: -3 }}>
              How many rows would you like to add in the table?
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
              fullWidth
              color="primary"
              onClick={() => {
                setOpenRowModal(false);
                setNumberOfRows(0);
              }}
            >
              Cancel
            </Button>
            <Button
              fullWidth
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

const CSVUploader = ({ handlePopulateDataAndCloseModal }) => {
  const [file, setFile] = useState({ name: "" });

  const handleUploadFile = () => {
    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      const csv = Papa.parse(target.result, {
        header: true,
        dynamicTyping: true,
      });
      const parsedData = csv?.data;
      const columns = Object.keys(parsedData[0]);

      const cleanedParsedData = cleanRowData(parsedData);
      const [modifiedColumnData, newRowData] = changeDataType(
        cleanedParsedData,
        columns
      );

      // const columnGroupingModel = modifiedColumnData.map((data) => {
      //   return {
      //     groupId: data.field,
      //     headerName: data.type === "number" ? "Numerical" : "Categorical",
      //     children: [{ field: data.field }],
      //   };
      // });

      handlePopulateDataAndCloseModal(
        // cleanedParsedData,
        newRowData,
        modifiedColumnData
        // columnGroupingModel
      );
    };
    reader.readAsText(file);
  };

  /**
   * The function cleans row data by removing rows with empty
   * values and adding unique IDs to the remaining rows.
   * @returns The `cleanRowData` function returns an array of
   * objects where each object has a unique `id` property generated
   * using the `uuidv4` function and all the empty values in the
   * original `rowData` have been removed.
   */
  const cleanRowData = (rowData) => {
    const hasEmptyValue = (row) =>
      Object.values(row).some((value) => !Boolean(value));

    const tempRow = rowData.filter((row) => !hasEmptyValue(row));

    const tempRowArray = tempRow.map((row) => ({ id: uuidv4(), ...row }));

    return tempRowArray;
  };

  const changeDataType = (rowData, columnData) => {
    const isColumnNumeric = (col) =>
      rowData.every((row) => Boolean(Number(row[col])));

    let newColumnDataArray = [];
    const newColumnData = columnData.map((col) => {
      let tempColumnUUID = uuidv4();
      newColumnDataArray.push({ [col]: tempColumnUUID });
      const isNumeric = isColumnNumeric(col);
      return {
        field: tempColumnUUID,
        headerName: col,
        sortable: false,
        editable: true,
        width: 200,
        type: isNumeric ? "number" : "string",
      };
    });
    // TODO:

    let newRowData = rowData.map((data) => {
      const newData = { id: data.id };
      newColumnDataArray.forEach((column) => {
        const key = Object.keys(column)[0];
        const value = column[key];
        newData[value] = data[key];
      });
      return newData;
    });

    return [newColumnData, newRowData];
  };

  return (
    <>
      <Box sx={{ pt: 2 }}>
        {file.name ? (
          <Grid container sx={{ height: 50 }} alignItems="center">
            <Grid item xs>
              <Grid
                container
                justifyContent="space-between"
                alignItems="center"
              >
                <Grid item xs>
                  <Grid container alignItems="center">
                    <Grid item>
                      <InsertDriveFileIcon sx={{ color: "primary.main" }} />
                    </Grid>
                    <Grid item xs>
                      <Typography sx={{ fontWeight: "bold", ml: 1 }}>
                        {file.name}
                      </Typography>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid item>
                  <Grid container alignItems="center">
                    <Grid item>
                      <Box
                        sx={{
                          borderRadius: 1,
                          px: 1,
                          mx: 1.5,
                          py: 0.5,
                          backgroundColor: "openlapTheme.light",
                        }}
                      >
                        <Typography variant="body2">{file.size} KB</Typography>
                      </Box>
                    </Grid>
                    <Grid item>
                      <Tooltip
                        title="Remove file and choose another file"
                        arrow
                      >
                        <IconButton
                          onClick={() => setFile({ name: "" })}
                          size="small"
                          sx={{ color: "red" }}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        ) : (
          <Grid
            container
            justifyContent="center"
            alignItems="center"
            sx={{
              border: "2px dotted #C4C4C4",
              height: 150,
              borderRadius: 2,
              mb: 1,
            }}
          >
            <Link component="label" sx={{ cursor: "pointer" }}>
              Click here to select a file to upload
              <input
                hidden
                multiple
                onChange={(event) => setFile(event.target.files[0])}
                type="file"
                accept=".csv"
              />
            </Link>
          </Grid>
        )}
      </Box>
      <Grid container justifyContent="center" sx={{ pt: 2 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<GetAppIcon />}
          disabled={!Boolean(file.name)}
          onClick={handleUploadFile}
        >
          Load data
        </Button>
      </Grid>
    </>
  );
};
