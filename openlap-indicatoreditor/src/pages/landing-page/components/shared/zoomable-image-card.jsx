import { useState } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Card,
  CardActionArea,
  CardMedia,
  Dialog,
  DialogContent,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

// Image card with a hover "search" affordance that opens a full-size dialog.
// `sx` is merged onto the Card (e.g. for the responsive border used by the
// Feature rows). `children` (optional) render below the image, inside the card
// (used for the Feature rows' mobile text block).
const ZoomableImageCard = ({ image, alt = "", dialogLabel, sx, children }) => {
  const [open, setOpen] = useState(false);
  const toggleOpen = () => setOpen((prev) => !prev);

  return (
    <>
      <Card elevation={0} sx={{ width: "100%", position: "relative", ...sx }}>
        <CardActionArea
          aria-label={alt ? `Enlarge image: ${alt}` : "Enlarge image"}
          sx={{
            "&:hover + .search-icon, .search-icon:hover": { opacity: 1 },
          }}
          onClick={toggleOpen}
        >
          <CardMedia
            component="img"
            image={image}
            alt={alt}
            loading="lazy"
            sx={{ width: "100%", aspectRatio: "16/9", objectFit: "contain" }}
          />
        </CardActionArea>
        {children}
        <IconButton
          className="search-icon"
          aria-label={alt ? `Enlarge image: ${alt}` : "Enlarge image"}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            opacity: 0,
            transition: "opacity 0.3s",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            "&:hover, &:focus-visible": {
              opacity: 1,
              backgroundColor: "rgba(255, 255, 255, 1)",
            },
          }}
          onClick={toggleOpen}
        >
          <SearchIcon />
        </IconButton>
      </Card>
      <Dialog
        aria-label={dialogLabel}
        maxWidth="xl"
        open={open}
        onClose={toggleOpen}
      >
        <DialogContent>
          <Box
            component="img"
            src={image}
            alt={alt}
            sx={{ width: "100%", objectFit: "contain" }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

ZoomableImageCard.propTypes = {
  image: PropTypes.string.isRequired,
  alt: PropTypes.string,
  dialogLabel: PropTypes.string,
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
  children: PropTypes.node,
};

export default ZoomableImageCard;
