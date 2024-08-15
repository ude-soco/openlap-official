import { useState } from "react";
import BarChartIcon from "@mui/icons-material/BarChart";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import QuizIcon from "@mui/icons-material/Quiz";
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AddchartIcon from "@mui/icons-material/Addchart";
import DashboardIcon from "@mui/icons-material/Dashboard";
import StyleIcon from "@mui/icons-material/Style";
import OpenLAPLogo from "../../../assets/brand/openlap-logo.svg";

const drawerWidth = 280;
export const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: "center",
}));

const Sidebar = ({ openSidebar, toggleSidebar }) => {
  const [openGQI, setOpenGQI] = useState(true);
  const [openISC, setOpenISC] = useState(true);
  const [openIndicator, setOpenIndicator] = useState(true);
  const [openTools, setOpenTools] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const iscMenus = [
    {
      primary: "ISC Dashboard",
      secondary: "List of my ISCs",
      navigate: "/isc",
      icon: <DashboardIcon />,
    },
    {
      primary: "ISC Creator",
      secondary: "Create a ISC",
      navigate: "/isc/creator",
      icon: <AddchartIcon />,
    },
    {
      primary: "ISC Pool",
      secondary: "Search for ISCs",
      navigate: "/isc/pool",
      icon: <AddchartIcon />,
    },
  ];

  const gqiMenus = [
    {
      primary: "GQI Dashboard",
      secondary: "List of my GQIs",
      navigate: "/gqi",
      icon: <DashboardIcon />,
    },
    {
      primary: "GQI Editor",
      secondary: "Create a GQI",
      navigate: "/gqi/editor",
      icon: <ListAltIcon />,
    },
    {
      primary: "GQI Pool",
      secondary: "Search for GQIs",
      navigate: "/gqi/pool",
      icon: <ListAltIcon />,
    },
  ];

  const indicatorMenus = [
    {
      primary: "Indicator Dashboard",
      secondary: "List of my Indicators",
      navigate: "/indicator",
      icon: <DashboardIcon />,
    },
    {
      primary: "Indicator Editor",
      secondary: "Create an Indicator",
      navigate: "/indicator/editor",
      icon: <AddchartIcon />,
    },
    {
      primary: "Indicator Pool",
      secondary: "Search for indicators",
      navigate: "/indicator/pool",
      icon: <AddchartIcon />,
    },
  ];

  const toolsMenu = [
    {
      primary: "CSV-xAPI Converter",
      secondary: "Convert CSV to xAPI and vice versa",
      navigate: "/csv-xapi",
      icon: <ChangeCircleIcon />,
    },
  ];
  return (
    <>
      <Drawer
        variant="persistent"
        anchor="left"
        open={openSidebar}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <DrawerHeader>
          <Box
            component="img"
            sx={{ height: 40, ...(!openSidebar && { display: "none" }) }}
            src={OpenLAPLogo}
            alt="Soco logo"
          />
        </DrawerHeader>

        <Divider />

        <List>
          <ListItemButton onClick={() => setOpenISC(!openISC)}>
            <ListItemIcon>
              <StyleIcon />
            </ListItemIcon>
            <ListItemText primary="Indicator Specification Cards (ISC)" />
            {openISC ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={openISC} timeout={"auto"} unmountOnExit>
            <List component="div" disablePadding>
              {iscMenus.map((menu, index) => {
                return (
                  <ListItemButton
                    sx={{ pl: 4 }}
                    onClick={() => {
                      navigate(menu.navigate);
                    }}
                    key={index}
                    selected={location.pathname === menu.navigate}
                  >
                    <ListItemIcon> {menu.icon} </ListItemIcon>
                    <ListItemText
                      primary={menu.primary}
                      secondary={menu.secondary}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </List>

        <List>
          <ListItemButton onClick={() => setOpenIndicator(!openIndicator)}>
            <ListItemIcon>
              <BarChartIcon />
            </ListItemIcon>
            <ListItemText primary={"Indicators"} />
            {openIndicator ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={openIndicator} timeout={"auto"} unmountOnExit>
            <List component="div" disablePadding>
              {indicatorMenus.map((menu, index) => {
                return (
                  <ListItemButton
                    sx={{ pl: 4 }}
                    onClick={() => {
                      navigate(menu.navigate);
                    }}
                    key={index}
                    selected={location.pathname === menu.navigate}
                  >
                    <ListItemIcon> {menu.icon} </ListItemIcon>
                    <ListItemText
                      primary={menu.primary}
                      secondary={menu.secondary}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </List>

        <List>
          <ListItemButton onClick={() => setOpenGQI(!openGQI)}>
            <ListItemIcon>
              <QuizIcon />
            </ListItemIcon>
            <ListItemText primary={"Goal-Question-Indicator"} />
            {openGQI ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={openGQI} timeout={"auto"} unmountOnExit>
            <List component="div" disablePadding>
              {gqiMenus.map((menu, index) => {
                return (
                  <ListItemButton
                    sx={{ pl: 4 }}
                    onClick={() => {
                      navigate(menu.navigate);
                    }}
                    key={index}
                    selected={location.pathname === menu.navigate}
                  >
                    <ListItemIcon> {menu.icon} </ListItemIcon>
                    <ListItemText
                      primary={menu.primary}
                      secondary={menu.secondary}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </List>

        <List>
          <ListItemButton onClick={() => setOpenTools(!openTools)}>
            <ListItemIcon>
              <ArchitectureIcon />
            </ListItemIcon>
            <ListItemText primary={"Tools"} />
            {openTools ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </ListItemButton>
          <Collapse in={openTools} timeout={"auto"} unmountOnExit>
            <List component="div" disablePadding>
              {toolsMenu.map((menu, index) => {
                return (
                  <ListItemButton
                    sx={{ pl: 4 }}
                    onClick={() => {
                      navigate(menu.navigate);
                    }}
                    key={index}
                    selected={location.pathname === menu.navigate}
                  >
                    <ListItemIcon> {menu.icon} </ListItemIcon>
                    <ListItemText
                      primary={menu.primary}
                      secondary={menu.secondary}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Collapse>
        </List>
      </Drawer>
    </>
  );
};

export default Sidebar;
