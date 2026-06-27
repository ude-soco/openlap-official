import { useContext } from "react";
import {
  Box,
  ButtonBase,
  Grid,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { chartFilters } from "../../../utils/data/config.js";
import { ISCContext } from "../../../isc-context.js";
import { TASK_DESCRIPTIONS } from "../utils/visualization-copy.js";

const ChartTypeFilter = () => {
  const { visRef, setVisRef } = useContext(ISCContext);

  const handleSelectFilter = (filter) => {
    if (visRef.filter.type !== filter.type) {
      setVisRef((p) => ({ ...p, filter: filter }));
    } else {
      setVisRef((p) => ({ ...p, filter: { type: "" } }));
    }
  };

  return (
    <>
      <Stack gap={2}>
        <Box>
          <Typography variant="subtitle1" component="h3" fontWeight={600}>
            Choose the analytical task
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The task describes the kind of pattern or relationship you want to
            inspect. It guides which charts are recommended.
          </Typography>
        </Box>
        <Grid container spacing={2} justifyContent="center">
          {chartFilters
            .sort((a, b) => a.type.localeCompare(b.type))
            .map((filter, index) => {
              if (filter.enable) {
                const selected = visRef.filter.type === filter.type;
                return (
                  <Grid
                    key={index}
                    component={Paper}
                    variant="outlined"
                    size={{ xs: 6, sm: 3, lg: 2 }}
                    sx={{
                      p: 0,
                      overflow: "hidden",
                      borderRadius: 1,
                      "&:hover": { boxShadow: 5 },
                      border: selected ? "2px solid #F57C00" : "",
                    }}
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
                      <ButtonBase
                        onClick={() => handleSelectFilter(filter)}
                        aria-pressed={selected}
                        aria-label={`Task: ${filter.type}. ${filter.description}`}
                        sx={{ width: "100%", height: "100%", p: 1 }}
                      >
                        <Stack
                          gap={1}
                          alignItems="center"
                          justifyContent="flex-start"
                          sx={{ height: "100%" }}
                        >
                          <Box
                            component="img"
                            src={filter.image}
                            height="56px"
                            alt=""
                          />
                          <Typography
                            align="center"
                            variant="body2"
                            fontWeight={600}
                          >
                            {filter.type}
                          </Typography>
                          {TASK_DESCRIPTIONS[filter.type] && (
                            <Typography
                              align="center"
                              variant="caption"
                              color="text.secondary"
                            >
                              {TASK_DESCRIPTIONS[filter.type]}
                            </Typography>
                          )}
                        </Stack>
                      </ButtonBase>
                    </Tooltip>
                  </Grid>
                );
              }
              return undefined;
            })}
        </Grid>
      </Stack>
    </>
  );
};

export default ChartTypeFilter;
