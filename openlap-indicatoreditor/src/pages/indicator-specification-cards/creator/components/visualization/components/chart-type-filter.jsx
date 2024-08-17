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
  const [state, setState] = React.useState({
    openFilters: false,
  });

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
          Filter chart by types
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} justifyContent="center">
            {chartFilters.map((filter) => {
              if (filter.enable) {
                return (
                  <Grid
                    item
                    xs={2}
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
                              pb: 2,
                              pt: 3,
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
                              spacing={2}
                            >
                              <Grid item>
                                <Box
                                  component="img"
                                  src={filter.image}
                                  height="72px"
                                />
                              </Grid>
                              <Grid item>
                                <Typography>{filter.type}</Typography>
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
