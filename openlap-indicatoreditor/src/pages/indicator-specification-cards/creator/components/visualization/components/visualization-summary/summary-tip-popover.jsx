import Grid from "@mui/material/Grid2";
import {
  Box,
  Button,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";

export default function SummaryTipPopover({ tipAnchor, toggleTipAnchor }) {
  return (
    <>
      <IconButton
        onClick={(e) => toggleTipAnchor(e.currentTarget)}
        color="warning"
      >
        <Tooltip arrow title={<Typography>Tips</Typography>}>
          <TipsAndUpdatesIcon />
        </Tooltip>
      </IconButton>
      <Popover
        open={Boolean(tipAnchor)}
        anchorEl={tipAnchor}
        onClose={() => toggleTipAnchor(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            backgroundColor: "primary.main",
            color: "primary.contrastText",
            position: "absolute",
            p: 1,
          },
        }}
      >
        <Box sx={{ p: 2, maxWidth: 400 }}>
          <Typography gutterBottom>
            <b>Tip!</b>
          </Typography>
          <Typography gutterBottom>
            Choose a <b>Chart type</b> that fits your needs.
          </Typography>
          <Typography gutterBottom>
            Each chart requires specific type of data (e.g. <em>categorical</em>
            , <em>numerical</em>, and <em>categorical (ordinal)</em>).
          </Typography>
          <Typography gutterBottom>
            Your <b>Dataset</b> should have the type of data required by your
            selected <b>Chart</b>. Check the required type of data under the
            short description for the Charts.
          </Typography>
          <Typography>
            <b>Good to know!</b>
          </Typography>
          <Typography>
            Charts will be <b>recommended</b> to you if those match the type of
            data available in your <b>Dataset</b>.
          </Typography>
        </Box>
        <Grid container justifyContent="flex-end">
          <Button
            size="small"
            onClick={() => toggleTipAnchor(null)}
            color="text"
            variant="outlined"
          >
            Close
          </Button>
        </Grid>
      </Popover>
    </>
  );
}
