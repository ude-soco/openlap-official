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
          <Typography>To be decided</Typography>
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
