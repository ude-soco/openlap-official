import { Paper } from "@mui/material";
import { useContext } from "react";
import { CustomThemeContext } from "../../../setup/theme-manager/theme-context-manager";

const CustomPaper = ({ locked = false, children, ...props }) => {
  const { darkMode } = useContext(CustomThemeContext);
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        position: "relative",
        opacity: locked ? 0.5 : 1,
        pointerEvents: locked ? "none" : "auto",
        backgroundColor: locked
          ? darkMode
            ? "grey.800"
            : "grey.400"
          : "background.paper",
      }}
      {...props}
    >
      {children}
    </Paper>
  );
};

export default CustomPaper;
