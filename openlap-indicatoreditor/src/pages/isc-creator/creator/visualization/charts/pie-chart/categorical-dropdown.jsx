import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Popover,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Info as InfoIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowRight as KeyboardArrowRightIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import { getUniqueValuesAndCounts } from "../utils/chart-utils.js";

export default function CategoricalDropdown({
  axisLabel,
  series,
  options,
  dataState: { rowData, columnData },
  handleSetCategoricalOptions,
  handleSetCountOccurrences,
  handleEditColumnData,
  handleNameColumn,
  toggleEditPanel,
}) {
  let allowedDataType = "string";
  const [anchorEl, setAnchorEl] = useState(null);
  const [anchorElMethod, setAnchorElMethod] = useState(null);
  const [anchorElUnique, setAnchorElUnique] = useState(null);
  const [tempSelectedColumn, setTempSelectedColumn] = useState([]);
  const openMenu = Boolean(anchorEl);
  const openMenuMethod = Boolean(anchorElMethod);
  const openMenuUnique = Boolean(anchorElUnique);

  const handleOpenMenu = (e) => {
    toggleEditPanel("", false);
    setAnchorEl(e.currentTarget);
  };
  const handleOpenMethodMenu = (e) => setAnchorElMethod(e.currentTarget);
  const handleOpenUniqueMenu = (e, data) => {
    setAnchorElUnique(e.currentTarget);
    setTempSelectedColumn(data);
  };

  const [columnName, setColumnName] = useState("");
  const [columnNameExists, setColumnNameExist] = useState({
    status: false,
    message: "",
  });
  const [numberOfRows, setNumberOfRows] = useState(0);
  const [openColumnModal, setOpenColumnModal] = useState(false);

  useEffect(() => {
    if (Boolean(columnName)) {
      if (
        columnData.find(
          (col) => col.headerName.toLowerCase() === columnName.toLowerCase(),
        )
      ) {
        setColumnNameExist({
          status: true,
          message: "Axis title already exists",
        });
      } else {
        setColumnNameExist({ status: false, message: "" });
      }
    }
  }, [columnName]);

  // The function is trigger via the submit button in the editor panel
  const handleSubmitNewColumnData = (event) => {
    event.preventDefault();
    if ((numberOfRows !== 0 || Boolean(rowData.length)) && columnName !== "") {
      setOpenColumnModal(false);
      let tempNumberOfRows = rowData.length ? rowData.length : numberOfRows;
      handleNameColumn(columnName, allowedDataType, tempNumberOfRows);
      setColumnName("");
      setNumberOfRows(0);
      toggleEditPanel(allowedDataType, true);
    }
  };

  // The function is used to select the categorical data from the list
  const handleSelectCategoricalColumnData = (columnData, unique = false) => {
    setAnchorEl(null);
    setAnchorElMethod(null);
    setAnchorElUnique(null);
    let categoricalColumnField = columnData.field;
    let categoricalColumnName = columnData.headerName;
    let categoricalColumnDataArray = rowData.map(
      (row) => row[categoricalColumnField],
    );
    if (unique) {
      let [uniqueColumnDataArray, uniqueColumnDataCountArray] =
        getUniqueValuesAndCounts(categoricalColumnDataArray);
      handleSetCategoricalOptions(
        categoricalColumnField,
        categoricalColumnName,
        uniqueColumnDataArray,
        unique,
      );
    } else {
      handleSetCategoricalOptions(
        categoricalColumnField,
        categoricalColumnName,
        categoricalColumnDataArray,
        unique,
      );
    }
  };

  // The function is used to open the dialog, where users can input the axis title and number of columns
  const handleSelectCreateNewColumnData = () => {
    setAnchorEl(null);
    setOpenColumnModal((prevState) => !prevState);
    // toggleEditPanel("", false);
  };

  // The function is used to count the number of occurrences
  const handleSelectCountOccurrences = (columnData) => {
    setAnchorEl(null);
    setAnchorElMethod(null);
    let categoricalColumnField = columnData.field;
    let categoricalColumnName = columnData.headerName;
    const categoricalColumnDataArray = rowData.map(
      (row) => row[columnData.field],
    );
    let [uniqueColumnDataArray, uniqueColumnDataCountArray] =
      getUniqueValuesAndCounts(categoricalColumnDataArray);

    handleSetCountOccurrences(
      categoricalColumnField,
      categoricalColumnName,
      uniqueColumnDataArray,
      uniqueColumnDataCountArray,
    );
  };

  const handleSelectEditColumnData = (columnData) => {
    setAnchorEl(null);
    let categoricalField = columnData.field;
    let categoricalColumnName = columnData.headerName;
    let categoricalColumnType = allowedDataType;
    let categoricalColumnDataArray = rowData.map(
      (row) => row[columnData.field],
    );
    setTimeout(() => {
      toggleEditPanel(allowedDataType);
    }, 100);
    handleEditColumnData(
      categoricalField,
      categoricalColumnName,
      categoricalColumnType,
      categoricalColumnDataArray,
    );
  };

  return (
    <>
      <Grid container justifyContent="center" alignItems="center">
        <Grid item>
          {options.headerNameOptions ? (
            <Tooltip
              title={
                <Typography variant="body2" sx={{ p: 1 }}>
                  {options.headerNameOptions}
                </Typography>
              }
            >
              <Chip
                label={
                  <Typography variant="body2">
                    {options.headerNameOptions}
                  </Typography>
                }
                sx={{
                  maxWidth: "170px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              />
            </Tooltip>
          ) : (
            <Typography variant="body2">Select data</Typography>
          )}
        </Grid>

        <IconButton onClick={handleOpenMenu} color="primary">
          <KeyboardArrowDownIcon />
        </IconButton>
      </Grid>

      <Popover
        open={openMenu}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <ListItem disablePadding sx={{ px: 2 }}>
          <ListItemText
            primary={<Typography variant="overline">{axisLabel}</Typography>}
          />
        </ListItem>
        <Divider />
        <List sx={{ minWidth: "200px" }}>
          {columnData
            .filter((col) => col.type === allowedDataType)
            .map((colData, index) => {
              return (
                <ListItem key={index} disablePadding sx={{ px: 1 }}>
                  <Grid container alignItems="center" spacing={1}>
                    {/* Select standard values */}
                    <Grid item xs>
                      <ListItemButton
                        // disabled={Boolean(
                        //   series.find(() => options.name === colData.field)
                        // )}
                        onClick={() => {
                          handleSelectCategoricalColumnData(colData);
                          toggleEditPanel("", false);
                        }}
                      >
                        <ListItemText primary={colData.headerName} />
                      </ListItemButton>
                    </Grid>
                    <Grid item>
                      <Tooltip
                        title={
                          <Typography variant="body2" sx={{ p: 1 }}>
                            {Boolean(
                              options.headerNameOptions === colData.headerName,
                            )
                              ? "Edit data"
                              : `Select "${colData.headerName}" first to edit data`}
                          </Typography>
                        }
                      >
                        <span>
                          <IconButton
                            color="primary"
                            disabled={Boolean(
                              options.headerNameOptions !== colData.headerName,
                            )}
                            size="small"
                            onClick={() => handleSelectEditColumnData(colData)}
                          >
                            <SettingsIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Grid>
                    {/* Select unique value button */}
                    <Grid item>
                      <Tooltip
                        title={
                          <Typography variant="body2" sx={{ p: 1 }}>
                            View options
                          </Typography>
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => handleOpenUniqueMenu(e, colData)}
                          >
                            <KeyboardArrowRightIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Popover
                        open={openMenuUnique}
                        anchorEl={anchorElUnique}
                        onClose={() => {
                          setAnchorEl(null);
                          setAnchorElUnique(null);
                        }}
                        anchorOrigin={{
                          vertical: "center",
                          horizontal: "right",
                        }}
                        transformOrigin={{
                          vertical: "center",
                          horizontal: "left",
                        }}
                      >
                        <List>
                          <ListItem disablePadding>
                            <ListItemButton
                              onClick={() =>
                                handleSelectCategoricalColumnData(
                                  tempSelectedColumn,
                                  true,
                                )
                              }
                            >
                              <ListItemText
                                primary={`Select only unique values of "${tempSelectedColumn.headerName}"`}
                              />
                            </ListItemButton>
                          </ListItem>
                        </List>
                      </Popover>
                    </Grid>
                  </Grid>
                </ListItem>
              );
            })}

          {columnData.some((item) => item.type === allowedDataType) ? (
            <>
              <Divider sx={{ pt: 1 }} />
              {/* Methods */}
              <List subheader={<ListSubheader>Methods</ListSubheader>}>
                <ListItem sx={{ pl: 3, pr: 1 }}>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs>
                      <ListItemText>
                        <ListItemText primary="Count #occurrences" />
                      </ListItemText>
                    </Grid>
                    <Grid item>
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMethodMenu(e)}
                      >
                        <KeyboardArrowRightIcon color="primary" />
                      </IconButton>

                      <Popover
                        open={openMenuMethod}
                        anchorEl={anchorElMethod}
                        onClose={() => {
                          setAnchorEl(null);
                          setAnchorElMethod(null);
                        }}
                        anchorOrigin={{
                          vertical: "bottom",
                          horizontal: "center",
                        }}
                      >
                        <List
                          subheader={
                            <ListSubheader>Select a column</ListSubheader>
                          }
                        >
                          {columnData
                            .filter((col) => col.type === allowedDataType)
                            .map((colData, index) => {
                              return (
                                <ListItem
                                  key={index}
                                  disablePadding
                                  sx={{ px: 1 }}
                                >
                                  <Grid
                                    container
                                    alignItems="center"
                                    spacing={2}
                                  >
                                    <Grid item xs>
                                      <ListItemButton
                                        onClick={() =>
                                          handleSelectCountOccurrences(colData)
                                        }
                                      >
                                        <ListItemText primary={colData.field} />
                                      </ListItemButton>
                                    </Grid>
                                  </Grid>
                                </ListItem>
                              );
                            })}
                        </List>
                      </Popover>
                    </Grid>
                  </Grid>
                </ListItem>
              </List>
            </>
          ) : (
            <>
              <ListItem disablePadding>
                <Grid
                  container
                  sx={{ px: 2, py: 1, width: "300px" }}
                  alignItems="center"
                >
                  <Grid item xs>
                    <Typography>No data available</Typography>
                  </Grid>
                  <Grid item>
                    <Tooltip
                      arrow
                      title={
                        <Typography variant="body2" sx={{ p: 1 }}>
                          Create a new column of type <b>categorical</b> from
                          the data table below
                        </Typography>
                      }
                    >
                      <IconButton color="primary">
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                </Grid>
                {/* <Button
              fullWidth
              size="large"
              onClick={handleSelectCreateNewColumnData}
              startIcon={<AddIcon />}
            >
              CREATE NEW SLICE LABEL
            </Button> */}
              </ListItem>
            </>
          )}
        </List>
      </Popover>

      <Dialog open={openColumnModal} fullWidth maxWidth="xs">
        <DialogTitle>Create a new slice label</DialogTitle>
        <form onSubmit={(e) => handleSubmitNewColumnData(e)}>
          <DialogContent>
            <Typography sx={{ pb: 2, mt: -2 }}>
              What would you like to name your slice label?
            </Typography>
            <TextField
              autoFocus
              error={columnNameExists.status}
              helperText={columnNameExists.message}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              label="Name of slice label"
              onChange={(e) => setColumnName(e.target.value)}
              value={columnName}
              variant="outlined"
            />

            <Grid container alignItems="center">
              {!Boolean(rowData.length) && (
                <>
                  <Typography
                    color={rowData.length ? "textSecondary" : ""}
                    sx={{ pt: 3, pb: 2 }}
                  >
                    How many slices would you like to add?
                  </Typography>

                  <TextField
                    autoFocus={columnName !== ""}
                    defaultValue={rowData.length ? rowData.length : ""}
                    fullWidth
                    label="Number of slices"
                    onChange={(e) => setNumberOfRows(e.target.value)}
                    type="number"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    variant="outlined"
                  />
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              color="primary"
              onClick={() => {
                setOpenColumnModal(false);
                setNumberOfRows(0);
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={
                (numberOfRows === 0 && !Boolean(rowData.length)) ||
                columnName === "" ||
                columnNameExists.status
              }
              type="submit"
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
