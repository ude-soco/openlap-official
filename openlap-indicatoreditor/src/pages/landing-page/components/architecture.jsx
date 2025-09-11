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
  Stack,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import OpenLAPArchitecture from "../../../assets/home/abstract-architecture.png";
import { navigationIds } from "../utils/navigation-data";

const Architecture = () => {
  const [openDialog, setOpenDialog] = useState(false);

  const toggleOpenDialog = () => setOpenDialog((p) => !p);
  return (
    <Container
      id={navigationIds.ARCHITECTURE}
      maxWidth="lg"
      sx={{ pt: { xs: 4, sm: 12 }, pb: { xs: 8 } }}
    >
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: { xs: "flex", md: "none" } }}
      >
        OpenLAP Architecture
      </Typography>
      <Stack
        direction={{ xs: "column-reverse", md: "row" }}
        gap={4}
        alignItems="center"
      >
        <Box sx={{ width: { xs: "100%", md: "40%" } }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            OpenLAP Architecture
          </Typography>
          <Typography>
            The three main components of OpenLAP
            <ul>
              <li>
                <b>Indicator Engine</b>: Responsible for providing an intuitive
                and interactive User Interface (UI) to help users develop their
                indicators.
              </li>
              <li>
                <b>Analytics Framework</b>: Contains various core modules that
                allow the generation, execution, and management of indicators.
              </li>
              <li>
                <b>Data Collection and Management</b>: Responsible for
                xAPI-based data collection from various learning sources as well
                as maintaining data privacy policies.
              </li>
            </ul>
          </Typography>
        </Box>
        <Box sx={{ width: { xs: "100%", md: "60%" } }}>
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
                image={OpenLAPArchitecture}
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
            >
              <SearchIcon />
            </IconButton>
          </Card>
        </Box>
      </Stack>
      <Dialog maxWidth="xl" open={openDialog} onClose={toggleOpenDialog}>
        <DialogContent>
          <Box
            component="img"
            src={OpenLAPArchitecture}
            sx={{ width: "100%", objectFit: "contain" }}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default Architecture;
