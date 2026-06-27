import { useContext } from "react";
import PropTypes from "prop-types";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import GetAppIcon from "@mui/icons-material/GetApp";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import CsvImporter from "./csv-importer.jsx";
import { ISCContext } from "../../../isc-context.js";
import { DataTypes } from "../../../utils/data/config.js";

const ImportDialog = ({ open, toggleOpen }) => {
  const { dataset, setDataset, setRequirements } = useContext(ISCContext);

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
      setDataset((prevState) => ({
        ...prevState,
        rows: newRowData,
      }));
      setRequirements((prevState) => ({
        ...prevState,
        data: modifiedColumnData,
      }));
    };
    reader.readAsText(dataset.file);
    toggleOpen();
  };

  const cleanRowData = (rowData) => {
    const hasEmptyValue = (row) =>
      // eslint-disable-next-line no-extra-boolean-cast -- CSV behavior unchanged this phase
      Object.values(row).some((value) => !Boolean(value));
    const tempRow = rowData.filter((row) => !hasEmptyValue(row));
    return tempRow.map((row) => ({ id: uuidv4(), ...row }));
  };

  const changeDataType = (rowData, columnData) => {
    const isColumnNumeric = (col) =>
      rowData.every((row) => Boolean(Number(row[col])));

    const newColumn = columnData.map((col) => {
      const isNumeric = isColumnNumeric(col);
      return {
        id: uuidv4(),
        value: col,
        type: isNumeric ? DataTypes.numerical : DataTypes.categorical,
        placeholder: undefined,
      };
    });

    let newRowData = rowData.map((row) => {
      const newData = { id: row.id };
      newColumn.forEach((col) => {
        const key = Object.keys(col)[0];
        const value = col[key];
        newData[value] = row[col.value];
      });
      return newData;
    });
    return [newColumn, newRowData];
  };

  return (
    <>
      <Dialog open={Boolean(open)}>
        <DialogTitle>Import existing dataset</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Upload a CSV file if you already have dataset values.
          </Typography>

          <CsvImporter />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 2 }}
          >
            <b>Note:</b> You do not need to upload any data. Data you upload is
            not permanently stored. We recommend against uploading sensitive data
            that is confidential or contains identifying information about other
            people or parties.
          </Typography>
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
            Import dataset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

ImportDialog.propTypes = {
  open: PropTypes.bool,
  toggleOpen: PropTypes.func,
};

export default ImportDialog;
