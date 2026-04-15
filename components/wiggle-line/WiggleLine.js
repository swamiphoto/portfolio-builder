import React from "react";

const WiggleLine = ({ color = "black" }) => (
  <svg width="100" height="10" viewBox="0 0 100 10" className="mx-auto my-8" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0 5C10 0 20 10 30 5C40 0 50 10 60 5C70 0 80 10 90 5C95 2.5 100 2.5 100 2.5" stroke={color} strokeWidth="2" />
  </svg>
);

export default WiggleLine;
