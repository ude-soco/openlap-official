import { useContext } from "react";
import { Box, Grid, Paper, Stack, Tooltip, Typography } from "@mui/material";
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
      <Stack gap={2}>
        <Typography>
          <b>Choose a task</b>
        </Typography>
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
                    size={{ xs: 6, sm: 3, lg: 2 }}
                    sx={{
                      cursor: "pointer",
                      p: 1,
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
                        <Box component="img" src={filter.image} height="56px" />
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
      </Stack>
    </>
  );
};

export default ChartTypeFilter;
