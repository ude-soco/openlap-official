import { createContext } from "react";

// Shared context for the ISC Creator workspace and its step components.
//
// Extracted from indicator-specification-card.jsx in Phase C so the component
// file only exports a component (resolves the react-refresh/only-export-components
// warning and gives the future reducer a stable home). The provider's value and
// behavior are unchanged — only the declaration moved here.
export const ISCContext = createContext(undefined);

export default ISCContext;
