import React, { createContext, useState, useContext } from "react";

const ScrollContext = createContext();

export const useScrollContext = () => useContext(ScrollContext);

export const ScrollProvider = ({ children }) => {
  const [isScrolled, setIsScrolled] = useState(false);

  return <ScrollContext.Provider value={{ isScrolled, setIsScrolled }}>{children}</ScrollContext.Provider>;
};
