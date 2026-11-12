import {
  Box,
  Button,
  IconButton,
  Grid,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";

export default function TipPopover({
  tipAnchor,
  toggleTipAnchor,
  description,
}) {
  return (
    <>
      <Tooltip
        arrow
        title={<Typography>Click to view helpful tips</Typography>}
      >
        <IconButton
          size="small"
          onClick={(e) => toggleTipAnchor(e.currentTarget)}
          color="warning"
        >
          <TipsAndUpdatesIcon />
        </IconButton>
      </Tooltip>
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
        <Box sx={{ p: 2, maxWidth: 380 }}>
          <Typography dangerouslySetInnerHTML={{ __html: description }} />
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
