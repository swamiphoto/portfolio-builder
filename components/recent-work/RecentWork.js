import React from "react";
import Photo from "../../components/image-displays/photo/Photo"; // Import the existing Photo component
import IMAGES from "../../common/images"; // Ensure correct import of the images
import SectionHeader from "../section-header/SectionHeader";

const RecentWork = () => {
  return (
    <section className="py-12">
      <SectionHeader title="Recent Work" description="Here are some pictures I took in the last year" />

      <Photo src="https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR500885-Edit-Edit.jpg" caption="Sunflowers with Naga" />

      <Photo src="https://storage.googleapis.com/swamiphoto/photos/landscapes/japan/DSC00179-Edit-4.jpg" caption="Bamboo Forest" />

      <Photo src="https://storage.googleapis.com/swamiphoto/photos/landscapes/japan/DSC00324-Enhanced-NR.jpg" caption="Fushimi Inari Taisha" />

      <Photo src="https://storage.googleapis.com/swamiphoto/photos/landscapes/california/AR501858.jpg" caption="The most beautiful bridge covered in fog" />

      <Photo src="https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501496.jpg" caption="One of my favorite mother and son portraits" />
    </section>
  );
};

export default RecentWork;
