import { useContext, useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from "@mui/material";
import SearchOffRoundedIcon from "@mui/icons-material/SearchOffRounded";
import { BasicContext } from "../../../basic-indicator";
import CustomTooltip from "../../../../../../../common/components/custom-tooltip/custom-tooltip";
import EmptyState from "../../../../../../../common/components/empty-state/empty-state";
import { DataTypes } from "../../../../../../indicator-specification-cards/creator/utils/data/config";

const AnalyzedDataTable = () => {
  const {
    analysis: { analyzedData },
  } = useContext(BasicContext);
  const [page, setPage] = useState(0); // Current page
  const [rowsPerPage, setRowsPerPage] = useState(5); // Rows per page

  const formatTypeName = (type) => {
    if (type === "Text") return "Categorical";
    if (type === "Numeric") return "Numerical";
    return type;
  };

  const columns = Object.keys(analyzedData).map((key) => ({
    title: `${analyzedData[key].configurationData.title} (${formatTypeName(
      analyzedData[key].configurationData.type
    )})`,
    data: analyzedData[key].data,
    type: formatTypeName(analyzedData[key].configurationData.type),
  }));

  const handleTooltipDescription = (type) => {
    return `What is <b>${type}</b> data type?<br/>
    ${DataTypes[type.toLowerCase()].description}`;
  };

  const numRows = columns[0]?.data.length ?? 0;

  // Friendly empty result: the method ran but produced no rows.
  if (numRows === 0) {
    return (
      <EmptyState
        icon={SearchOffRoundedIcon}
        title="No data for this combination"
        description="No records matched the selected method, inputs, and filters. Try adjusting your filters or inputs, then preview again."
      />
    );
  }

  // Calculate the rows to display based on the current page and rows per page
  const displayedRows = [...Array(numRows).keys()].slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page when rows per page changes
  };

  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={(theme) => ({ borderRadius: `${theme.custom.radii.card}px` })}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((column, index) => (
              <TableCell
                key={index}
                component="th"
                scope="col"
                sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
              >
                <Box sx={{ display: "inline-flex", alignItems: "center" }}>
                  {column.title}
                  <CustomTooltip
                    type="description"
                    message={handleTooltipDescription(column.type)}
                  />
                </Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {displayedRows.map((rowIndex) => (
            <TableRow key={rowIndex} hover>
              {columns.map((column, colIndex) => (
                <TableCell key={colIndex}>{column.data[rowIndex]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={numRows}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );
};

export default AnalyzedDataTable;
