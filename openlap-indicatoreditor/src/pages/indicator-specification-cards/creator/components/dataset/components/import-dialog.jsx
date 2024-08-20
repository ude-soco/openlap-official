import React, { useContext } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import { GetApp as GetAppIcon } from "@mui/icons-material";
import CsvImporter from "./csv-importer.jsx";
import { ISCContext } from "../../../indicator-specification-card.jsx";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import { DataTypes } from "../../../utils/data/config.js";

const ImportDialog = ({ open, toggleOpen }) => {
  const { dataset, setDataset } = useContext(ISCContext);

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
        columns,
      );
      setDataset((prevState) => ({
        ...prevState,
        file: {
          name: "",
        },
        rows: newRowData,
        columns: modifiedColumnData,
      }));
      // handlePopulateDataAndCloseModal(newRowData, newRowData);
    };
    reader.readAsText(dataset.file);
    toggleOpen();
  };

  const cleanRowData = (rowData) => {
    const hasEmptyValue = (row) =>
      Object.values(row).some((value) => !Boolean(value));
    const tempRow = rowData.filter((row) => !hasEmptyValue(row));
    return tempRow.map((row) => ({ id: uuidv4(), ...row }));
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
        dataType: isNumeric ? DataTypes.numerical : DataTypes.categorical,
      };
    });
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
      <Dialog
        open={Boolean(open)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Import Data</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            <Typography gutterBottom>
              You can upload a dataset in only <b>CSV</b> format.
            </Typography>
            <Typography variant="body2" sx={{ fontStyle: "italic" }}>
              <b>Note:</b> You do not need to upload any data. Data you do
              upload is not permanently stored. We recommend against uploading
              sensitive data that is confidential or contains identifying
              information about other people or parties.
            </Typography>
          </DialogContentText>

          <CsvImporter />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={toggleOpen}
            fullWidth
            color="primary"
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUploadFile}
            disabled={dataset.file.name === ""}
            autoFocus
            fullWidth
            variant="contained"
            color="primary"
            startIcon={<GetAppIcon />}
          >
            Import data
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImportDialog;
