import { useContext } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
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
          <Typography>
            <b>Filter chart by types</b>
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2} justifyContent="center">
            {chartFilters
              .sort((a, b) => a.type.localeCompare(b.type))
              .map((filter, index) => {
                if (filter.enable) {
                  return (
                    <Grid
                      key={index}
                      component={Paper}
                      variant="outlined"
                      size={{ xs: 6, md: 3, lg: 2 }}
                      sx={{
                        cursor: "pointer",
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
                      onClick={() => handleSelectFilter(filter)}
                    >
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
                        <Stack
                          gap={2}
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Box
                            component="img"
                            src={filter.image}
                            height="56px"
                          />
                          <Typography align="center" variant="body2">
                            {filter.type}
                          </Typography>
                        </Stack>
                      </Tooltip>
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
