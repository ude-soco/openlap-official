import { useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardMedia,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import OpenLAPISCAbstract from "../../../assets/home/abstract-isc.png";

const ISCCreatorFeature = () => {
  const [openDialog, setOpenDialog] = useState(false);

  const toggleOpenDialog = () => setOpenDialog((p) => !p);
  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 4, sm: 12 }, pb: { xs: 8 } }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: { xs: "flex", md: "none" } }}
      >
        ISC Creator
      </Typography>
      <Stack
        direction={{ xs: "column", md: "row" }}
        gap={4}
        alignItems="center"
      >
        <Box sx={{ width: { xs: "100%", md: "55%" } }}>
          <Card elevation={0} sx={{ width: "100%", position: "relative" }}>
            <CardActionArea
              sx={{
                "&:hover + .search-icon, .search-icon:hover": {
                  opacity: 1,
                },
              }}
              onClick={toggleOpenDialog}
            >
              <CardMedia
                sx={{
                  width: "100%",
                  aspectRatio: "16/9",
                  objectFit: "contain",
                }}
                image={OpenLAPISCAbstract}
              />
            </CardActionArea>

            <IconButton
              className="search-icon"
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                opacity: 0,
                transition: "opacity 0.3s",
                backgroundColor: "rgba(255, 255, 255, 0.8)",
                "&:hover": {
                  opacity: 1,
                  backgroundColor: "rgba(255, 255, 255, 1)",
                },
              }}
              onClick={() => console.log("search clicked")}
            >
              <SearchIcon />
            </IconButton>
          </Card>
        </Box>
        <Box sx={{ width: { xs: "100%", md: "45%" } }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            ISC Creator
          </Typography>
          <Typography>
            The ISC Creator is an intuitive learning analytics tool that
            supports the systematic and theoretically-sound (co-)design of
            personalized low-fidelity learning analytics indicators, using
            Indicator Specification Cards (ISCs).
          </Typography>
          <Link
            component="button"
            color="primary"
            fontWeight="bold"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              "& > svg": { transition: "0.2s" },
              "&:hover > svg": { transform: "translateX(4px)" },
            }}
          >
            <span>Learn more</span>
            <ChevronRightRoundedIcon
              fontSize="small"
              sx={{ mt: "1px", ml: "2px" }}
            />
          </Link>
        </Box>
      </Stack>
      <Dialog maxWidth="lg" open={openDialog} onClose={toggleOpenDialog}>
        <DialogContent>
          <DialogTitle>
            <Grid container justifyContent="flex-end">
              <IconButton onClick={toggleOpenDialog}>
                <CloseIcon />
              </IconButton>
            </Grid>
          </DialogTitle>
          <Box
            component="img"
            src={OpenLAPISCAbstract}
            sx={{ width: "100%", objectFit: "contain" }}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default ISCCreatorFeature;
