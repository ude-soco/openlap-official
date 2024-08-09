import { useState } from "react";
import BarChartIcon from "@mui/icons-material/BarChart";
import ChangeCircleIcon from "@mui/icons-material/ChangeCircle";
import ArchitectureIcon from "@mui/icons-material/Architecture";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import QuizIcon from "@mui/icons-material/Quiz";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ListAltIcon from "@mui/icons-material/ListAlt";
import AddchartIcon from "@mui/icons-material/Addchart";
import { useNavigate } from "react-router-dom";
import DashboardIcon from "@mui/icons-material/Dashboard";
import StyleIcon from "@mui/icons-material/Style";
import {
  Drawer,
  Box,
  Divider,
  List,
  Collapse,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";

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

  const iscMenus = [
    {
      primary: "ISC Dashboard",
      secondary: "List of my ISCs",
      navigate: "/isc",
      icon: <DashboardIcon />,
      disabled: false,
    },
    {
      primary: "ISC Creator",
      secondary: "Create or edit an ISC",
      navigate: "/isc/creator",
      icon: <AddchartIcon />,
      disabled: false,
    },
    {
      primary: "Pool of ISC",
      secondary: "List of all ISCs",
      navigate: "/isc/pool",
      icon: <AddchartIcon />,
      disabled: false,
    },
  ];

  const gqiMenus = [
    {
      primary: "GQI Dashboard",
      secondary: "List of my Questions and associated Indicators",
      navigate: "/gqi",
      icon: <DashboardIcon />,
      disabled: false,
    },
    {
      primary: "GQI Editor",
      secondary: "Create Questions and associate Indicators",
      navigate: "gqi/editor",
      icon: <ListAltIcon />,
      disabled: false,
    },
    {
      primary: "Pool of Questions",
      secondary: "Create Questions and associate Indicators",
      navigate: "gqi/pool",
      icon: <ListAltIcon />,
      disabled: false,
    },
  ];

  const indicatorMenus = [
    {
      primary: "Indicator Dashboard",
      secondary: "List of my Indicators",
      navigate: "/indicator",
      icon: <DashboardIcon />,
      disabled: false,
    },
    {
      primary: "Indicator Editor",
      secondary: "Create Basic, Composite, & Multi-level Indicator",
      navigate: "indicator/editor",
      icon: <AddchartIcon />,
      disabled: false,
    },
    {
      primary: "Indicator Pool",
      secondary: "List of all indicators",
      navigate: "indicator/pool",
      icon: <AddchartIcon />,
      disabled: false,
    },
  ];

  const toolsMenu = [
    {
      primary: "CSV-xAPI Converter",
      secondary: "Convert CSV to xAPI and vice versa",
      navigate: "/csv-xapi-converter",
      icon: <ChangeCircleIcon />,
      disabled: false,
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
          // zIndex: openSidebar ? 1 : 0,
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
                    disabled={menu.disabled}
                    // selected={selectedMenu === menu.navigate}
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
                    disabled={menu.disabled}
                    // selected={selectedMenu === menu.navigate}
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
                    disabled={menu.disabled}
                    // selected={selectedMenu === menu.navigate}
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
                    disabled={menu.disabled}
                    // selected={selectedMenu === menu.navigate}
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
