import React, { useContext } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Grid,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import PreviewIcon from "@mui/icons-material/Preview";
import DeleteIcon from "@mui/icons-material/Delete";
import { CompositeContext } from "../../../composite-indicator";
import { handleDisplayType } from "../../../../../dashboard/utils/utils";
import ChartPreview from "../../../../components/chart-preview";

export const SelectedIndicatorsTable = () => {
  const { indicator, setIndicator } = useContext(CompositeContext);

  const handleOpenPreview = (indicator) => {
    setIndicator((p) => ({
      ...p,
      myIndicators: {
        ...p.myIndicators,
        previewModal: {
          ...p.myIndicators.previewModal,
          isPreviewModalOpen: true,
          previewIndicator: indicator,
        },
      },
    }));
  };

  const handleClosePreview = () => {
    setIndicator((p) => ({
      ...p,
      myIndicators: {
        ...p.myIndicators,
        previewModal: {
          ...p.myIndicators.previewModal,
          isPreviewModalOpen: false,
          previewIndicator: {
            previewData: {
              displayCode: [],
              scriptData: "",
            },
          },
        },
      },
    }));
  };

  const handleDeselectIndicator = (indicatorId) => {
    setIndicator((p) => ({
      ...p,
      selectedIndicators: p.selectedIndicators.filter(
        (selected) => selected.id !== indicatorId
      ),
    }));
  };

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
                                  onClick={() => handleOpenPreview(indicator)}
                                >
                                  <PreviewIcon />
                                </IconButton>
                              </span>
                            </Tooltip>

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
                                  onClick={() =>
                                    handleDeselectIndicator(indicator.id)
                                  }
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
      <Dialog
        fullWidth
        maxWidth="md"
        open={indicator.myIndicators.previewModal.isPreviewModalOpen}
        onClose={handleClosePreview}
      >
        <DialogTitle>Preview Indicator</DialogTitle>
        <DialogContent>
          <Grid container>
            <Grid size={{ xs: 12 }}>
              {indicator.myIndicators.previewModal.previewIndicator.previewData
                .displayCode.length === 0 ? (
                <Skeleton variant="rectangular" height={200} width="100%" />
              ) : (
                <>
                  <Grid container direction="column" spacing={0}>
                    <Typography variant="h6">
                      {
                        indicator.myIndicators.previewModal.previewIndicator
                          .name
                      }
                    </Typography>
                    <Typography variant="body2">
                      {handleDisplayType(
                        indicator.myIndicators.previewModal.previewIndicator
                          .type
                      )}{" "}
                      ● Created on:{" "}
                      {changeTimeFormat(
                        indicator.myIndicators.previewModal.previewIndicator
                          .createdOn
                      )}{" "}
                      ● Created by:{" "}
                      {
                        indicator.myIndicators.previewModal.previewIndicator
                          .createdBy
                      }
                    </Typography>
                  </Grid>
                  <ChartPreview
                    previewData={
                      indicator.myIndicators.previewModal.previewIndicator
                        .previewData
                    }
                  />
                </>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button
            fullWidth
            variant="contained"
            onClick={handleClosePreview}
            autoFocus
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
