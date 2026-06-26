import { Box, Typography } from "@mui/material";

// Standard section heading: an h2 title with an optional subtitle.
// `sx` styles the wrapper (e.g. width); `align` controls text alignment.
// The title color is left to inherit so it works on both light and dark
// (e.g. Publications) section backgrounds.
const SectionHeading = ({
  title,
  subtitle,
  subtitleColor = "text.secondary",
  align = { sm: "left", md: "center" },
  sx,
}) => (
  <Box sx={{ textAlign: align, ...sx }}>
    <Typography component="h2" variant="h4">
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body1" color={subtitleColor}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

export default SectionHeading;
