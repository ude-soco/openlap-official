import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import OpenLAPISCAbstract from "../../../assets/home/abstract-isc.png";
import { useNavigate } from "react-router-dom";

const ISCCreatorFeature = () => {
  const navigate = useNavigate();
  const [openDialog, setOpenDialog] = useState(false);

  const toggleOpenDialog = () => setOpenDialog((p) => !p);
  return (
    <Container
      maxWidth="lg"
      sx={{ pt: { xs: 4, md: 12 }, pb: { xs: 2, md: 10 } }}
    >
      <Stack direction="row" gap={4} alignItems="center">
        <Box sx={{ width: { xs: "100%", md: "55%" } }}>
          <Card
            elevation={0}
            sx={{
              width: "100%",
              border: { xs: "1px solid #bdbdbd", md: "none" },
              position: "relative",
            }}
          >
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
            <CardContent sx={{ display: { xs: "flex", md: "none" } }}>
              <Stack gap={4}>
                <Box>
                  <Typography variant="h4" gutterBottom>
                    Indicator Specification Card Creator
                  </Typography>
                  <Typography>
                    The ISC Creator is an intuitive learning analytics tool that
                    supports the systematic and theoretically-sound (co-)design
                    of personalized low-fidelity learning analytics indicators,
                    using Indicator Specification Cards (ISCs).
                  </Typography>
                </Box>
                <Box>
                  <Button
                    variant="contained"
                    endIcon={<DesignServicesIcon />}
                    onClick={() => navigate("/login")}
                  >
                    Design Indicators now!
                  </Button>
                </Box>
              </Stack>
            </CardContent>

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
        <Box
          sx={{
            width: { xs: "100%", md: "45%" },
            display: { xs: "none", md: "flex" },
          }}
        >
          <Stack gap={4}>
            <Box>
              <Typography
                variant="h4"
                gutterBottom
                sx={{ display: { xs: "none", md: "flex" } }}
              >
                Indicator Specification Card Creator
              </Typography>
              <Typography>
                The ISC Creator is an intuitive learning analytics tool that
                supports the systematic and theoretically-sound (co-)design of
                personalized low-fidelity learning analytics indicators, using
                Indicator Specification Cards (ISCs).
              </Typography>
            </Box>
            <Box>
              <Button
                variant="contained"
                endIcon={<DesignServicesIcon />}
                onClick={() => navigate("/login")}
              >
                Design Indicators now!
              </Button>
            </Box>
          </Stack>
        </Box>
      </Stack>

      <Dialog maxWidth="xl" open={openDialog} onClose={toggleOpenDialog}>
        <DialogContent>
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
