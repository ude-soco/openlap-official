import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppOpenlap from "./app-openlap.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <>
    <AppOpenlap />
  </>
);
