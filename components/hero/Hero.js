import React from "react";
import SubNav from "../subnav/SubNav";
import PropTypes from "prop-types";

const Hero = ({ title, showSubNav = true, children }) => {
  return (
    <div className="text-center pt-10 md:pt-20 mb-10 px-6">
      <h1 className="mx-auto md:max-w-3xl text-4xl md:text-6xl font-serif2 mb-2">{title}</h1>
      <div className="underlined-links animate-fadeIn mx-auto max-w-2xl md:text-2xl mb-8 mt-5 tracking-tight">{children}</div>

      {showSubNav && <SubNav />}
    </div>
  );
};

Hero.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default Hero;
