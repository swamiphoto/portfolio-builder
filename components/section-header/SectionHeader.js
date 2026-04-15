import React from "react";
import WiggleLine from "../wiggle-line/WiggleLine";

const SectionHeader = ({ title, description }) => {
  return (
    <div className="mb-8">
      <h2 className="text-5xl font-serif2 tracking-tight text-gray-900">{title}</h2>
      <h4 className="text-gray-700 text-2xl mt-2 max-w-2xl mx-auto tracking-tight">{description}</h4>
    </div>
  );
};

export default SectionHeader;
