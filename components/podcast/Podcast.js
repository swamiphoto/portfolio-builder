import React from "react";

const podcastData = [
  {
    id: "9QT-ywu6pXg",
    title: "Tanmay Sapkal Part 2 – Where is Landscape Photography Headed?",
    description:
      "There are so many landscape photographers today doing similar things. It's a crowded space. Where's this art form headed? And how do you balance what you want as an artist with what others expect from you? How do you succeed on social media? We discuss these and several other topics that would interest landscape photographers.",
  },
  {
    id: "jDIiFiyx31I",
    title: "E4: Jeff Lewis Part 1 – Sell the Light",
    description: "He doesn't use fancy toolkits like luminosity masks. Instead, he 'sells the light' to breathe life into his images.",
  },
  {
    id: "EH03iVyp2mg",
    title: "E6: Shashank Khanna Part 1 – How to Create Soothing Landscape Images",
    description: "Shashank Khanna shares how to create soothing images with subtle color palettes using a unique style of blending warm and cool tones.",
  },
];

const Podcast = () => {
  return (
    <section className="py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold">Podcast</h2>
        <p className="text-xl">I interview world-class photographers on how they make their images.</p>
      </div>
      <div className="space-y-12 max-w-5xl mx-auto">
        {podcastData.map((podcast) => (
          <div key={podcast.id} className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Video on the left */}
            <div className="md:w-1/2 w-full aspect-w-16 aspect-h-9">
              <iframe
                width="100%"
                height="315"
                src={`https://www.youtube.com/embed/${podcast.id}`}
                title={podcast.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen></iframe>
            </div>

            {/* Text on the right */}
            <div className="md:w-1/2 w-full text-left">
              <h3 className="text-2xl font-semibold mb-2">{podcast.title}</h3>
              <p className="text-base text-gray-600">{podcast.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Podcast;
