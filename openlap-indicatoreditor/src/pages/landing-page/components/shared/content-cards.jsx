import PropTypes from "prop-types";
import {
  alpha,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import DownloadIcon from "@mui/icons-material/Download";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { contentHref, formatNewsDate } from "../../utils/content-links.js";

const clamp = (lines) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

export function NewsCard({ item, featured = false, expanded = false }) {
  const theme = useTheme();
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: featured ? { xs: 3, md: 4 } : 3 }}>
        <Stack spacing={featured ? 1.5 : 1}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {featured && (
              <Chip
                label="Latest"
                size="small"
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: theme.custom.colors.accent,
                  fontWeight: 600,
                }}
              />
            )}
            <Typography variant="overline" color="text.secondary">
              {formatNewsDate(item.date)}
            </Typography>
          </Stack>
          <Typography
            variant={featured ? "h5" : "subtitle1"}
            component="h3"
            sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
          >
            {item.title || "News title"}
          </Typography>
          <Typography
            variant={featured ? "body1" : "body2"}
            color="text.secondary"
            component="div"
            sx={{
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              ...(!expanded && clamp(featured ? 4 : 3)),
            }}
          >
            {(Array.isArray(item.body) ? item.body : []).map((part, index) => {
              if (typeof part === "string") return part;
              if (!part || typeof part.text !== "string") return null;
              const href = contentHref(part.href);
              return href ? (
                <Link
                  key={index}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {part.text}
                </Link>
              ) : (
                part.text
              );
            })}
          </Typography>
          {item.venue && (
            <Typography variant="caption" color="text.secondary">
              {item.venue}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

NewsCard.propTypes = {
  item: PropTypes.object.isRequired,
  featured: PropTypes.bool,
  expanded: PropTypes.bool,
};

export function PublicationCard({ item }) {
  const pdf = contentHref(item.pdfLink);
  const details = contentHref(item.details);
  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        color: "common.white",
        bgcolor: "grey.900",
        border: "1px solid",
        borderColor: "grey.800",
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 3.5 }, flexGrow: 1 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={item.type || "Publication type"}
              size="small"
              variant="outlined"
              sx={{
                borderColor: "grey.700",
                color: "grey.400",
                fontWeight: 500,
              }}
            />
            <Typography variant="caption" sx={{ color: "grey.500" }}>
              {item.year}
            </Typography>
          </Stack>
          <Typography
            variant="h6"
            component="h3"
            sx={{
              fontWeight: 700,
              color: "grey.100",
              overflowWrap: "anywhere",
            }}
          >
            {item.title || "Publication title"}
          </Typography>
          <Typography variant="body2" sx={{ color: "grey.400" }}>
            {item.authors}
          </Typography>
          <Typography variant="caption" sx={{ color: "grey.500" }}>
            {item.venue}
          </Typography>
        </Stack>
      </CardContent>
      {(pdf || details) && (
        <CardActions
          sx={{
            px: { xs: 3, md: 3.5 },
            pb: { xs: 3, md: 3.5 },
            pt: 0,
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {pdf && (
            <Button
              component="a"
              href={pdf}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="contained"
              startIcon={<DownloadIcon />}
            >
              Get PDF
            </Button>
          )}
          {details && (
            <Button
              component="a"
              href={details}
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              endIcon={<OpenInNewIcon />}
              sx={{ color: "grey.300" }}
            >
              Details
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
}

PublicationCard.propTypes = { item: PropTypes.object.isRequired };
