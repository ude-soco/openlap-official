import React, { useContext } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Grid,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { chartFilters } from "../../../utils/data/config.js";
import { ISCContext } from "../../../indicator-specification-card.jsx";

const ChartTypeFilter = () => {
  const { visRef, setVisRef } = useContext(ISCContext);

  const handleSelectFilter = (filter) => {
    if (visRef.filter.type !== filter.type) {
      setVisRef((prevState) => ({
        ...prevState,
        filter: filter,
      }));
    } else {
      setVisRef((prevState) => ({
        ...prevState,
        filter: {
          type: "",
        },
      }));
    }
  };

  return (
    <>
      <Accordion variant="outlined" defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography><b>Filter chart by types</b></Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid
            container
            spacing={2}
            justifyContent="center"
            sx={{ display: "flex", alignItems: "stretch" }}
          >
            {chartFilters
              .sort((a, b) => a.type.localeCompare(b.type))
              .map((filter, index) => {
                if (filter.enable) {
                  return (
                    <Grid
                      key={index}
                      item
                      xs={6}
                      sm={4}
                      md={2}
                      sx={{ cursor: "pointer" }}
                      onClick={() => handleSelectFilter(filter)}
                    >
                      <Grid container spacing={2}>
                        <Grid item xs>
                          <Tooltip
                            arrow
                            title={
                              <Typography
                                variant="body2"
                                sx={{ p: 1, whiteSpace: "pre-line" }}
                              >
                                {filter.description}
                              </Typography>
                            }
                          >
                            <Paper
                              variant="outlined"
                              sx={{
                                pb: 1,
                                pt: 2,
                                "&:hover": {
                                  boxShadow: 5,
                                },
                                border:
                                  visRef.filter.type === filter.type
                                    ? "2px solid #F57C00"
                                    : "",
                              }}
                            >
                              <Grid
                                container
                                direction="column"
                                alignItems="center"
                                
                              >
                                <Grid item>
                                  <Box
                                    component="img"
                                    src={filter.image}
                                    height="48px"
                                  />
                                </Grid>
                                <Grid item>
                                  <Typography align="center" variant="body2">
                                    {filter.type}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </Paper>
                          </Tooltip>
                        </Grid>
                      </Grid>
                    </Grid>
                  );
                }
              })}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export default ChartTypeFilter;
