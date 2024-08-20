import React, { useContext } from "react";
import {
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import { ISCContext } from "../../../../indicator-specification-card.jsx";

const Footer = ({ state, setState }) => {
  const { dataset, setDataset } = useContext(ISCContext);
  const totalPages = Math.ceil(dataset.rows.length / state.pageSize);

  const handleDeleteSelectedRows = () => {
    setDataset((prevState) => ({
      ...prevState,
      rows: prevState.rows.filter(
        (row) => !state.selectionModel.includes(row.id),
      ),
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

  return (
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
                    title={<Typography>Delete selected rows</Typography>}
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
              {[5, 10].map((size) => (
                <MenuItem key={size} value={size}>
                  {size} rows per page
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </>
  );
};

export default Footer;
