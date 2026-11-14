import PropTypes from "prop-types";
import { useContext, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Grid,
  Pagination,
  Stack,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { CustomThemeContext } from "../../setup/theme-manager/theme-context-manager";
import { createScopedTheme } from "../../common/theme/scoped-theme";
import usePublicContent from "./utils/use-public-content.js";
import {
  NewsCard,
  PublicationCard,
} from "./components/shared/content-cards.jsx";
import ContentState from "./components/shared/content-state.jsx";

export default function ContentArchive({ kind }) {
  const { theme } = useContext(CustomThemeContext);
  const scopedTheme = useMemo(() => createScopedTheme(theme), [theme]);
  const [page, setPage] = useState(0);
  const { status, items, total, retry } = usePublicContent(kind, page, 6);
  const news = kind === "news";
  return (
    <ThemeProvider theme={scopedTheme}>
      <Container
        component="main"
        maxWidth="lg"
        sx={{ py: { xs: 3, md: 6 }, minHeight: "100vh" }}
      >
        <Stack sx={{ gap: 4 }}>
          <Box>
            <Button
              component={RouterLink}
              to="/"
              startIcon={<ArrowBackRoundedIcon />}
            >
              Back to OpenLAP
            </Button>
          </Box>
          <Box>
            <Typography variant="h3" component="h1">
              {news ? "News" : "Publications"}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {news
                ? "Updates, announcements, and stories from OpenLAP."
                : "Research on the Open Learning Analytics Platform."}
            </Typography>
          </Box>
          {status !== "ready" || !items.length ? (
            <ContentState status={status} kind={kind} onRetry={retry} />
          ) : (
            <Grid container spacing={3}>
              {items.map((item) => (
                <Grid size={news ? 12 : { xs: 12, sm: 6, md: 4 }} key={item.id}>
                  {news ? (
                    <NewsCard item={item} expanded />
                  ) : (
                    <PublicationCard item={item} />
                  )}
                </Grid>
              ))}
            </Grid>
          )}
          {total > 6 && (
            <Pagination
              count={Math.ceil(total / 6)}
              page={page + 1}
              onChange={(_event, next) => {
                setPage(next - 1);
                window.scrollTo({ top: 0, behavior: "instant" });
              }}
              aria-label={`${kind} pages`}
              sx={{ alignSelf: "center" }}
            />
          )}
        </Stack>
      </Container>
    </ThemeProvider>
  );
}

ContentArchive.propTypes = {
  kind: PropTypes.oneOf(["news", "publications"]).isRequired,
};
