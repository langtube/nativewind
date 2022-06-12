import { createContext } from "react";
import { StyleSheetStore } from "../style-sheet-store";

export const StoreContext = createContext(new StyleSheetStore());
