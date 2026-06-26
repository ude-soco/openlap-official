import PropTypes from "prop-types";
import { Container } from "@mui/material";

// Standard section wrapper: consistent container width and vertical padding.
// Spacing defaults can be overridden per-section via `sx` to preserve the
// existing layout of each section.
const Section = ({ id, maxWidth = "lg", sx, children, ...rest }) => (
  <Container
    id={id}
    maxWidth={maxWidth}
    sx={{ pt: { xs: 4, sm: 12 }, pb: { xs: 8, sm: 16 }, ...sx }}
    {...rest}
  >
    {children}
  </Container>
);

Section.propTypes = {
  id: PropTypes.string,
  maxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  sx: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.func]),
  children: PropTypes.node,
};

export default Section;
