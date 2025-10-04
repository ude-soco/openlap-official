import { Chip, Tooltip, Grid, Typography } from "@mui/material";

const MAX_LABEL_LENGTH = 70;

export default function Summary({
  verb,
  goal,
  goalName,
  question,
  indicatorName,
  indicatorData,
}) {
  const handleCheckGoal = () => {
    return goal !== "" && goalName !== "";
  };

  const handleCheckQuestion = () => {
    return question !== "";
  };

  const handleCheckIndicatorName = () => {
    return indicatorName !== "";
  };

  const truncate = (text, length) =>
    text.length > length ? `${text.slice(0, length)}…` : text;

  return (
    <Grid container spacing={1}>
      {handleCheckGoal() && (
        <Grid size={{ xs: 12 }}>
          <Grid container alignItems="center" spacing={1}>
            <Typography>I want to</Typography>
            <Tooltip title={<Typography>{verb}</Typography>} arrow>
              <Chip
                label={truncate(verb, MAX_LABEL_LENGTH)}
                sx={{ cursor: "help" }}
              />
            </Tooltip>
            <Tooltip title={<Typography>{goal}</Typography>} arrow>
              <Chip
                label={truncate(goal, MAX_LABEL_LENGTH)}
                sx={{ cursor: "help" }}
              />
            </Tooltip>
          </Grid>
        </Grid>
      )}
      {handleCheckQuestion() && (
        <Grid size={{ xs: 12 }}>
          <Grid container alignItems="center" spacing={1}>
            <Typography>I am interested in knowing</Typography>
            <Tooltip title={<Typography>{question}</Typography>} arrow>
              <Chip
                label={truncate(question, MAX_LABEL_LENGTH)}
                sx={{ cursor: "help" }}
              />
            </Tooltip>
          </Grid>
        </Grid>
      )}
      {handleCheckIndicatorName() && (
        <>
          <Grid size={{ xs: 12 }}>
            <Grid container alignItems="center" spacing={1}>
              <Typography>I need an indicator that shows</Typography>
              <Tooltip title={<Typography>{indicatorName}</Typography>} arrow>
                <Chip
                  label={truncate(indicatorName, MAX_LABEL_LENGTH)}
                  sx={{ cursor: "help" }}
                />
              </Tooltip>
            </Grid>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Grid container spacing={1} alignItems="center">
              <Typography>I need the following data</Typography>
              {indicatorData.map((item, index) => {
                if (item.value !== "") {
                  return (
                    <Tooltip
                      key={index}
                      title={
                        <Typography>
                          {item.value} ({item.type.value})
                        </Typography>
                      }
                      arrow
                    >
                      <Chip
                        key={index}
                        label={`${truncate(item.value, MAX_LABEL_LENGTH)} (${
                          item.type.value
                        })`}
                        sx={{ cursor: "help" }}
                      />
                    </Tooltip>
                  );
                } else return undefined;
              })}
            </Grid>
          </Grid>
        </>
      )}
    </Grid>
  );
}
