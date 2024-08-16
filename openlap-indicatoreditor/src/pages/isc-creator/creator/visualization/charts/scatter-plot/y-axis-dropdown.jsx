import { useEffect, useState } from "react";
import {
  Box,
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
  Edit as EditIcon,
  Info as InfoIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from "@mui/icons-material";

export default function YAxisDropdown({
  axisLabel,
  series,
  dataState: { rowData, columnData },
  handleSetYAxisSeries,
  handleDeleteNumericalSeries,
  openEditor: { open },
  handleAddRows,
  handleNameColumn,
  handleEditColumnData,
  toggleEditPanel,
}) {
  let allowedDataType = "number";
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenMenu = (e) => setAnchorEl(e.currentTarget);

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

  const handleSubmitNewColumnData = (event) => {
    event.preventDefault();
    if ((numberOfRows !== 0 || Boolean(rowData.length)) && columnName !== "") {
      setOpenColumnModal(false);
      if (rowData.length) {
        handleAddRows(rowData.length, allowedDataType);
      } else {
        handleAddRows(numberOfRows, allowedDataType);
      }
      handleNameColumn(columnName, allowedDataType);
      setColumnName("");
      setNumberOfRows(0);
      toggleEditPanel(allowedDataType, "yaxis");
    }
  };

  const handleSelectNumericalColumnData = (columnData) => {
    setAnchorEl(null);
    let numericalColumnName = columnData.headerName;
    const numericalColumnDataArray = rowData.map(
      (row) => row[columnData.field],
    );
    handleSetYAxisSeries(numericalColumnName, numericalColumnDataArray);
  };

  const handleSelectCreateNewColumnData = () => {
    setAnchorEl(null);
    setOpenColumnModal((prevState) => !prevState);
  };

  const handleSelectEditColumnData = (columnData) => {
    setAnchorEl(null);
    let numericalField = columnData.field;
    let numericalColumnName = columnData.headerName;
    let numericalColumnType = allowedDataType;
    let numericalColumnDataArray = rowData.map((row) => row[columnData.field]);
    toggleEditPanel(allowedDataType);
    handleEditColumnData(
      numericalField,
      numericalColumnName,
      numericalColumnType,
      numericalColumnDataArray,
    );
  };

  return (
    <>
      <Grid container justifyContent="center" alignItems="center">
        <Grid item>
          <Grid container alignItems="center" spacing={1}>
            {Boolean(series.length) ? (
              <>
                {series.map((ser, index) => {
                  return (
                    <Grid item key={index}>
                      <Chip
                        onDelete={() => handleDeleteNumericalSeries(ser.name)}
                        label={
                          <Typography variant="body2">{ser.name}</Typography>
                        }
                      />
                    </Grid>
                  );
                })}
              </>
            ) : (
              <Typography variant="body2" sx={{ pt: 0.5 }}>
                Select data
              </Typography>
            )}
          </Grid>
        </Grid>

        <IconButton onClick={handleOpenMenu} disabled={open}>
          <KeyboardArrowDownIcon color={open ? "" : "primary"} />
        </IconButton>

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
          <List
            subheader={
              <ListSubheader>
                <Grid
                  container
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Grid item>Numerical titles</Grid>
                  <Grid item>
                    <Tooltip
                      title={
                        <Typography variant="body2" sx={{ p: 1 }}>
                          Axis titles containing numerical type data in your
                          dataset
                        </Typography>
                      }
                    >
                      <IconButton>
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </Grid>
                </Grid>
              </ListSubheader>
            }
          >
            {columnData
              .filter((col) => col.type === allowedDataType)
              .map((colData, index) => {
                return (
                  <ListItem key={index} disablePadding sx={{ px: 1 }}>
                    <Grid container alignItems="center" spacing={1}>
                      {/* // TODO: Edit the column data */}
                      <Grid item>
                        <Tooltip
                          title={
                            <Typography variant="body2" sx={{ p: 1 }}>
                              Edit data
                            </Typography>
                          }
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleSelectEditColumnData(colData)}
                          >
                            <EditIcon color="primary" />
                          </IconButton>
                        </Tooltip>
                      </Grid>

                      {/* Select standard values */}
                      <Grid item xs>
                        <ListItemButton
                          disabled={Boolean(
                            series.find((ser) => ser.name === colData.field),
                          )}
                          onClick={() =>
                            handleSelectNumericalColumnData(colData)
                          }
                        >
                          <ListItemText primary={colData.field} />
                        </ListItemButton>
                      </Grid>
                    </Grid>
                  </ListItem>
                );
              })}
            <ListItem disablePadding>
              <ListItemButton
                sx={{ color: "primary.main" }}
                onClick={handleSelectCreateNewColumnData}
              >
                <Typography variant="body2">+ NEW NUMERICAL TITLE</Typography>
              </ListItemButton>
            </ListItem>
          </List>
        </Popover>
      </Grid>

      <Dialog open={openColumnModal} fullWidth maxWidth="xs">
        <DialogTitle>Create a new numerical title</DialogTitle>
        <form onSubmit={(e) => handleSubmitNewColumnData(e)}>
          <DialogContent>
            <Typography sx={{ pb: 2, mt: -2 }}>
              What would you like to name your axis title?
            </Typography>
            <TextField
              autoFocus
              error={columnNameExists.status}
              helperText={columnNameExists.message}
              fullWidth
              value={columnName}
              label="Axis title"
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(e) => setColumnName(e.target.value)}
              variant="outlined"
            />

            <Typography
              color={rowData.length ? "textSecondary" : ""}
              sx={{ pt: 3, pb: 2 }}
            >
              How many rows would you like to add?
            </Typography>

            <TextField
              autoFocus={columnName !== ""}
              defaultValue={rowData.length ? rowData.length : ""}
              fullWidth
              disabled={Boolean(rowData.length)}
              label="Number of rows"
              type="number"
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(e) => setNumberOfRows(e.target.value)}
              variant="outlined"
            />
            <Grid container alignItems="center">
              <Grid item>
                <Typography variant="body2">
                  Why can't I select the number of rows here?
                </Typography>
              </Grid>
              {Boolean(rowData.length) && (
                <Grid item>
                  <Tooltip
                    arrow
                    title={
                      <Box sx={{ p: 1 }}>
                        <Typography variant="body2" gutterBottom>
                          Your existing dataset has a total of {rowData.length}{" "}
                          rows. If you would like to add more rows, please click
                          on the "Edit data" button on one of the existing axis
                          title.
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                          Alternatively you can scroll down and use Select data
                          to add more the number of rows.
                        </Typography>
                      </Box>
                    }
                  >
                    <IconButton>
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button
              color="inherit"
              onClick={() => {
                setOpenColumnModal(false);
                setNumberOfRows(0);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                (numberOfRows === 0 && !Boolean(rowData.length)) ||
                columnName === "" ||
                columnNameExists.status
              }
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
