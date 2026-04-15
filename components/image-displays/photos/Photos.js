import React from "react";
import PropTypes from "prop-types";

const Photos = ({ layout, children }) => {
  const renderPhotos = () => {
    switch (layout) {
      case "verticalPair":
        let pairs = [];
        React.Children.forEach(children, (child, index) => {
          if (index % 2 === 0) {
            pairs.push([child, children[index + 1]]);
          }
        });
        return pairs.map((pair, index) => (
          // Updated for top alignment and equal width
          <div key={index} className="flex flex-col md:flex-row md:items-start space-y-2 md:space-y-0 md:space-x-2">
            <div className="w-full md:w-1/2">{pair[0]}</div>
            <div className="w-full md:w-1/2">{pair[1]}</div>
          </div>
        ));
      default:
        return <p>No layout selected</p>;
    }
  };

  return <div className="gallery-container">{renderPhotos()}</div>;
};

Photos.propTypes = {
  layout: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

export default Photos;
