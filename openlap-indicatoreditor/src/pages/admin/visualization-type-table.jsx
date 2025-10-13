import React, { useContext, useState } from "react";
import {
  Box,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useSnackbar } from "notistack";
import DeleteIcon from "@mui/icons-material/Delete";
import CustomDialog from "../../common/components/custom-dialog/custom-dialog";
import { requestDeleteVisualizationTypeById } from "./utils/manage-apis";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";

const VisualizationTypeTable = ({ typeList, handleDeleteType }) => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({
    openDeleteDialog: false,
    isLoading: false,
    onHoverChartId: undefined,
  });

  const handleOnHoverChart = (id) => {
    setState((p) => ({ ...p, onHoverChartId: id }));
  };

  const handleToggleDelete = () => {
    setState((p) => ({ ...p, openDeleteDialog: !p.openDeleteDialog }));
  };

  const handleDeleteChart = async () => {
    setState((p) => ({ ...p, isLoading: true }));
    try {
      const response = await requestDeleteVisualizationTypeById(
        api,
        state.onHoverChartId
      );
      handleDeleteType(state.onHoverChartId);
      enqueueSnackbar(response.message, { variant: "success" });
    } catch (error) {
      enqueueSnackbar("Failed to delete chart", { variant: "error" });
    } finally {
      setState((p) => ({ ...p, isLoading: false}));
    }
  };

  function toSentenceCase(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  return (
    <Stack>
      <TableContainer component={Paper} elevation={0} variant="outlined">
        <Table>
          <TableHead>
            <TableCell>
              <Typography variant="overline">Available charts</Typography>
            </TableCell>
          </TableHead>
          <TableBody>
            {typeList.map((item) => (
              <React.Fragment key={item.id}>
                <TableRow
                  onMouseEnter={() => handleOnHoverChart(item.id)}
                  hover
                  sx={{
                    position: "relative",
                    "&:hover .hover-actions": { opacity: 1 },
                    "&:hover .time-text": { opacity: 0 },
                  }}
                >
                  <TableCell>
                    <Grid container justifyContent="space-between">
                      <Grid size="grow">
                        <Typography component="span" fontWeight="bold">
                          {toSentenceCase(item.name)}
                        </Typography>
                      </Grid>
                      <Grid size="auto">
                        <Box
                          className="hover-actions"
                          sx={{
                            position: "absolute",
                            right: 0,
                            top: "50%",
                            transform: "translateY(-50%)",
                            display: "flex",
                            gap: 1,
                            opacity: 0,
                            transition: "opacity 0.2s ease-in-out",
                            zIndex: 2,
                            mr: 2,
                          }}
                        >
                          <Tooltip
                            arrow
                            title={<Typography>Delete Chart</Typography>}
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={handleToggleDelete}
                                disabled={state.isLoading.status}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </Grid>
                    </Grid>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            {typeList === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  <Box>
                    <Box
                      sx={{
                        p: 8,
                        textAlign: "center",
                        color: "text.secondary",
                      }}
                    >
                      <Typography variant="body1" gutterBottom>
                        No charts found.
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <CustomDialog
        type="delete"
        content={`This will delete the chart permanently.`}
        open={state.openDeleteDialog}
        toggleOpen={handleToggleDelete}
        handler={handleDeleteChart}
      />
    </Stack>
  );
};

export default VisualizationTypeTable;
