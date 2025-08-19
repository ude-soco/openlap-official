import React, { useContext } from "react";
import {
  Box,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import PreviewIcon from "@mui/icons-material/Preview";
import DeleteIcon from "@mui/icons-material/Delete";
import { CompositeContext } from "../../../composite-indicator";
import { handleDisplayType } from "../../../../../dashboard/utils/utils";

export const SelectedIndicatorsTable = () => {
  const { indicator } = useContext(CompositeContext);

  // * Helper functions
  function toSentenceCase(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function changeTimeFormat(time) {
    return new Date(time).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return (
    <>
      <TableContainer component={Paper} elevation={0} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Selected indicators</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {indicator.selectedIndicators.length === 0 ? (
              <TableRow>
                <TableCell>
                  <Box
                    sx={{
                      p: 4,
                      textAlign: "center",
                      color: "text.secondary",
                    }}
                  >
                    <Typography variant="body1" gutterBottom>
                      No indicators selected yet. Select indicators from above
                      to get started.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              indicator.selectedIndicators?.map((indicator) => (
                <React.Fragment key={indicator.id}>
                  <TableRow
                    //   onMouseEnter={() => handleOnHoverIndicator(indicator.id)}
                    hover
                    sx={{
                      cursor: "pointer",
                      position: "relative",
                      "&:hover .hover-actions": { opacity: 1 },
                      "&:hover .time-text": { opacity: 0 },
                    }}
                  >
                    <TableCell onClick={() => handlePreview(indicator.id)}>
                      <Grid container justifyContent="space-between">
                        <Grid size="grow">
                          <Typography component="span">
                            <b>{toSentenceCase(indicator.name)}</b>
                            <br />
                            <Typography component="span" variant="caption">
                              {handleDisplayType(indicator.type)} ● Created on:{" "}
                              {changeTimeFormat(indicator.createdOn)}
                            </Typography>
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
                              title={<Typography>Preview indicator</Typography>}
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  // onClick={() => handlePreview(indicator.id)}
                                  // disabled={state.isLoading.status}
                                >
                                  <PreviewIcon />
                                </IconButton>
                              </span>
                            </Tooltip>

                            {/* <Tooltip
                                arrow
                                title={<Typography>Edit indicator</Typography>}
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={handleEditIndicator}
                                    disabled={state.isLoading.status}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </span>
                              </Tooltip> */}

                            <Tooltip
                              arrow
                              title={
                                <Typography>Deselect indicator</Typography>
                              }
                            >
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  // onClick={handleToggleDelete}
                                  // disabled={state.isLoading.status}
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
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};
