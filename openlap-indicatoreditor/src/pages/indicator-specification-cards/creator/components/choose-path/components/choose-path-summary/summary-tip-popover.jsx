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
        <Box sx={{ p: 2, maxWidth: 360 }}>
          <Typography gutterBottom>
            <b>Tip!</b>
          </Typography>
          <Typography>You can choose one of the following paths:</Typography>
          <Typography>
            <ul>
              <li>
                If you have an idea what data you want to show in a table, you
                can start by creating or uploading a <b>Dataset</b>.
              </li>
              <li>
                If you have a chart in mind, you can start by choosing a{" "}
                <b>Visualization</b>.
              </li>
            </ul>
          </Typography>
          <Typography>
            Don’t worry — you’ll complete both steps either way.
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
