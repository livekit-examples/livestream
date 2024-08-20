import { createContext, useContext } from "react";

export const TokenContext = createContext<string>("");
export const useAuthToken = () => useContext(TokenContext);
