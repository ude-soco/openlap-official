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
import {
  requestDeleteAnalyticsMethodById,
  requestDeleteVisualizationTypeById,
} from "./utils/manage-apis";
import { AuthContext } from "../../setup/auth-context-manager/auth-context-manager";

const AnalyticsTable = ({ analyticsList, handleDeleteAnalytics }) => {
  const { api } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [state, setState] = useState({
    openDeleteDialog: false,
    isLoading: false,
    onHoverAnalyticsId: undefined,
  });

  const handleOnHoverAnalyticsMethod = (id) => {
    setState((p) => ({ ...p, onHoverAnalyticsId: id }));
  };

  const handleToggleDelete = () => {
    setState((p) => ({ ...p, openDeleteDialog: !p.openDeleteDialog }));
  };

  const handleDeleteAnalyticsMethod = async () => {
    setState((p) => ({ ...p, isLoading: true }));
    try {
      const response = await requestDeleteAnalyticsMethodById(
        api,
        state.onHoverAnalyticsId
      );
      handleDeleteAnalytics(state.onHoverAnalyticsId);
      enqueueSnackbar(response.message, { variant: "success" });
    } catch (error) {
      enqueueSnackbar("Failed to delete chart", { variant: "error" });
    } finally {
      setState((p) => ({ ...p, isLoading: false }));
    }
  };

  function toSentenceCase(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  return (
    <>
      <Stack>
        <TableContainer component={Paper} elevation={0} variant="outlined">
          <Table>
            <TableHead>
              <TableCell>
                <Typography variant="overline">
                  Available Analytics Method
                </Typography>
              </TableCell>
            </TableHead>
            <TableBody>
              {analyticsList.map((item) => (
                <React.Fragment key={item.id}>
                  <TableRow
                    onMouseEnter={() => handleOnHoverAnalyticsMethod(item.id)}
                    hover
                    sx={{
                      position: "relative",
                      "&:hover .hover-actions": { opacity: 1 },
                      "&:hover .time-text": { opacity: 0 },
                    }}
                  >
                    <TableCell>
                      <Grid container justifyContent="space-between">
                        <Tooltip
                          title={<Typography>{item.description}</Typography>}
                          placement="bottom-start"
                        >
                          <Grid size="grow">
                            <Typography component="span" fontWeight="bold">
                              {toSentenceCase(item.name)}
                            </Typography>
                          </Grid>
                        </Tooltip>
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
                              title={
                                <Typography>Delete Analytics Method</Typography>
                              }
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
              {analyticsList === 0 && (
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
                          No Analytics Method found.
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
          content={`This will delete the analytics method permanently.`}
          open={state.openDeleteDialog}
          toggleOpen={handleToggleDelete}
          handler={handleDeleteAnalyticsMethod}
        />
      </Stack>
    </>
  );
};

export default AnalyticsTable;
