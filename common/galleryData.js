// common/galleryData.js
// Gallery data extracted from pages/galleries.js for use in API routes and server-side code.
// Import this instead of pages/galleries.js in any server-side/API context.

export const galleryData = [
  {
    name: "Admin",
    slug: "admin",
    imagesFolderUrl: "landscapes",
    isHidden: true,
  },
  {
    name: "Arizona",
    description: "Over Christmas break, I went to Arizona and Utah with friends—Antelope Canyon, Grand Canyon, Monument Valley, and Sedona. It blows my mind that I lived in Arizona for 12 years and never visited Page. The landscapes were absolutely stunning.",
    thumbnailUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/AR503758.jpg",
    slug: "arizona",
    blocks: [
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/antelepe-canyon/AR503758.jpg",
        variant: 2,
      },
      {
        type: "text",
        content: "It was winter, so we knew we wouldn't see the famous light rays beaming into the canyons. We also weren't sure if it would be bright enough for the canyons to glow during our 10:30 a.m. tour. But we got lucky—the canyons were so vibrant!",
        variant: 1,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/antelepe-canyon/AR503751.jpg",
        variant: 1,
      },

      {
        type: "stacked",
        imagesFolderUrl: "landscapes/arizona/antelepe-canyon",
      },

      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/AR503763-Enhanced-NR.jpg",
        caption: "These slot canyons were formed over millions of years as flash floods carved deep, narrow paths through the sandstone. Over time, wind and water erosion shaped the walls into these incredible textures and patterns. Looks like a colorful iceberg, isn't it?",
        variant: 1,
      },

      {
        type: "stacked",
        imagesFolderUrl: "landscapes/arizona/antelope-canyon2",
      },
      {
        type: "text",
        content: "I'm hardly on the other side of the camera, but Naga and Bharath insisted on taking my pictures—and I'm so glad they did. I love how these turned out!",
      },
      {
        type: "stacked",
        imageUrls: [
          "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/b0e97b51-6e24-45e4-abab-3973eba8bdfd.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/d5432ee6-5172-421d-87be-2e89ee1b725e.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/PXL_20241222_183630103.MP~2.jpg",
        ],
      },

      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/AR503820-Edit-2.jpg",
        caption:
          "Horseshoe Bend was just 15 minutes from our Airbnb, but we left a bit late after spending the afternoon chatting. Naga and Bharath dropped me off at the parking lot, and I took off running—with my camera backpack and tripod (not something I'd recommend)—to the viewpoint, making it just in time to catch the last bit of light.",
        variant: 1,
      },
      {
        type: "text",
        content:
          "Monument Valley feels like a different planet. The landscape is so vast. Wild west movies were filmed here, and it's easy to see why. The View Hotel has amazing views of the valley, and we were wishing we could have stayed there to see the buttes and mesas glowing in the morning light.",
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/AR503840-Edit.jpg",
        variant: 1,
      },

      {
        type: "masonry",
        imagesFolderUrl: "landscapes/arizona/monument-valley",
      },

      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/AR503948-Edit-Edit.jpg",
        variant: 2,
        caption:
          "We visited the spot where Forrest Gump runs in the movie, but I messed up—the sun was on the wrong side, and the rocks are silhoutted in the afternoon. I told my friends we should head back to catch the rocks glowing from the other side, but we got there after sunset and missed seeing the glowing rocks from the other side too. Oh well...always a reason to go back!",
      },

      {
        type: "video",
        url: "https://www.youtube.com/embed/SwJ0ug0PH3Y",
        caption: "Monument Valley seen from the visitor center",
        variant: 2,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/AR503959-Edit-2.jpg",
        variant: 2,
      },
      {
        type: "text",
        content: "The Grand Canyon is not easy to capture. The landscape is so grand and three dimensional, it's difficult to convey the grandness through a photo. I've been there several times and don't really have a great photo still. I took portraits instead. ",
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/AR504066-Edit.jpg",
        variant: 2,
      },
      {
        type: "masonry",
        imagesFolderUrl: "landscapes/arizona/grand-canyon",
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/AR504121-Enhanced-NR.jpg",
        caption: "Nothing quite as satisfying as an Arizona sunset.",
        variant: 2,
      },
      {
        type: "video",
        url: "https://www.youtube.com/embed/kId9npazvq0",
        caption: "12 hours of non-stop entertainment in the car (not that we had much of a choice)!",
        variant: 2,
      },
      {
        type: "text",
        content: "Sedona has this mystical, almost magical vibe to it. Red Rock Crossing is one of the most photographed spots in Arizona, but we were there a bit too early and the light was not favorable for landscapes. That means more portraits...",
      },
      {
        type: "stacked",
        imagesFolderUrl: "landscapes/arizona/sedona",
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/naga.jpg",
        variant: 1,
      },
      {
        type: "video",
        url: "https://www.youtube.com/embed/wDkitsE1J4E",
        caption: "What are the chances? Bharath ran into his close friend from college in Sedona, of all places. A random spot, a random time… ",
        variant: 2,
      },
      {
        type: "text",
        content: "Some phone shots at Cathedral Rock. Can you feel the serenity of this place? Sitting near Oak Creek and listening to the gentle flow of water, it feels like time somehow slows down here.",
      },

      {
        type: "masonry",
        imagesFolderUrl: "landscapes/arizona/sedona-phone-shots",
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/misc/AR504282-Edit.jpg",
        variant: 2,
      },
      {
        type: "video",
        url: "https://www.youtube.com/embed/JkSdcyOA25o",
        caption: "Sedona",
        variant: 2,
      },
      {
        type: "text",
        content:
          "Naga and Bharath were headed back home, and I needed to get to Phoenix. I called Suhrid to pick me—only an old friend would be foolish enough to drive two hours to get me. The evening was absolutely gorgeous, so we took a few shots of him and his mom. Just look at how the rocks glow like gold!",
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/sedona2/AR504508-Edit.jpg",
        variant: 2,
        caption: "Suhrid and I go way back—we went to the same high school in Malawi, were neighbors there, and later became roommates in college at ASU.",
      },
      {
        type: "stacked",
        imagesFolderUrl: "landscapes/arizona/sedona2",
        excludeImageUrls: ["https://storage.googleapis.com/swamiphoto/photos/landscapes/arizona/sedona2/AR504508-Edit.jpg"],
      },
    ],
    enableSlideshow: true,
    showCover: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=IvoAT-5HKwM"],
      musicCredits: ["Music: Eléana by Richard Clayderman"],
      layout: "kenburns",
    },
  },
  {
    name: "Sunol Ridge",
    description: "I wanted to test my new Sigma 85mm portrait lens and asked Naga if she'd be my test model. We ended up hiking with her entire family and captured some shots after an hour-long hike up Sunol Ridge.",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501526.jpg`,
    slug: "naga-sunol",
    blocks: [
      {
        type: "masonry",
        imagesFolderUrl: "portraits/sunol",
        start: 0,
        count: 11,
        excludeImageUrls: ["https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501496.jpg"],
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501496.jpg",
      },
      {
        type: "stacked",
        imagesFolderUrl: "portraits/sunol",
        start: 11,
        count: 10,
      },
      {
        type: "masonry",
        imagesFolderUrl: "portraits/sunol",
        start: 21,
        count: 9,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501702.jpg",
        variant: 2,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501814.jpg",
        variant: 1,
      },
      {
        type: "masonry",
        imagesFolderUrl: "portraits/sunol",
        start: 30,
        count: -1,
        excludeImageUrls: [
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501702.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501814.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501721.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501832.jpg",
        ],
      },
      {
        type: "stacked",
        imageUrls: ["https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501721.jpg", "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501832.jpg"],
      },
    ],
    showCover: true,
    enableSlideshow: true,
    slideshowSettings: {
      customDurations: { 24: 7000 },
      youtubeLinks: ["https://www.youtube.com/watch?v=PYujyluMxMU", "https://www.youtube.com/watch?v=qj4RiKoARPk"],
      captions: {
        // 24: "Photographer's favorite. Possibly my all time favorite.",
      },
      coverImageIndex: 24,
      mobileCoverImageIndex: 21,
      layout: "film-single",
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "wisteria",
      clientMessage: "Hello Naga & Bharath, here are some additional images — only you can see them. If you'd like to print any of these, send me the image urls so I can fine-tune them a bit more. Let me know your favorites!",
    },
  },
  {
    name: "Sunflower Portraits",
    description: "A dreamy evening with the sunflowers in Woodland. We were at the tailend of the sunflower season and took a chance to drive a couple hours to see them, but the light was perfect and the flowers were still in bloom.",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR500896.jpg`,
    slug: "naga-sunflowers",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/naga-sunflowers",
        start: 0,
        count: 2,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR500795-Edit-Edit.jpg",
        variant: 1,
      },
      {
        type: "masonry",
        imagesFolderUrl: "portraits/naga-sunflowers",
        start: 3,
        count: 2,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR500885-Edit-Edit.jpg",
        variant: 1,
      },
      {
        type: "stacked",
        imagesFolderUrl: "portraits/naga-sunflowers",
        start: 6,
        count: 4,
      },
      {
        type: "text",
        content: "A mini film stitched together from random phone clips. I think the kids will enjoy looking back on this when they're older. Wish I had something like this with my mom.",
      },
      {
        type: "video",
        url: "https://www.youtube.com/embed/wRWx1mJap14",
        caption: "A Mother's Love",
        variant: 2,
      },
      {
        type: "masonry",
        imagesFolderUrl: "portraits/naga-sunflowers",
        start: 10,
        count: 12,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR501135-Edit-Edit.jpg",
        variant: 2,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR501124-Edit.jpg",
        variant: 2,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR501135-Edit.jpg",
        variant: 1,
      },
      {
        type: "stacked",
        imagesFolderUrl: "portraits/naga-sunflowers",
        excludeImageUrls: ["https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR501150.jpg"],
        start: 25,
        count: -1,
      },
      {
        type: "text",
        content: "With the last bit of light remaining, Naga put her photography skills to the test.",
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR501150.jpg",
        variant: 2,
      },
    ],
    enableSlideshow: true,
    showCover: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=qj4RiKoARPk"],
      layout: "kenburns",
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "wisteria",
      clientMessage: "Hello Naga, here are some additional images — only you can see them. If you'd like to print any of these, send me the image urls so I can fine-tune them a bit more. Let me know your favorites!",
    },
  },
  {
    name: "Beautiful California",
    description:
      "I don't think there's anywhere quite like California. We have just about every landscape you can imagine—from jaw-dropping coastlines and rolling golden hills to vineyards, deserts, redwoods, and not to forget, Karl the Fog. This gallery is a collection of the landscapes that make me appreciate just how special this place is.",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/landscapes/california/AR501858.jpg`,
    slug: "california",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "landscapes/california",
      },
    ],
    enableSlideshow: true,
    showCover: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=BciS5krYL80"],
      duration: 6000,
    },
  },
  {
    name: "Lavender",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/naga-lavendar/DSCF6486-Edit.jpg`,
    slug: "naga-lavendar",
    description: "We took a drive an hour and a half north to photograph Naga's family in the beautiful lavender fields. Mala joined me, and it was our first time going out after the lockdown, which made the evening feel extra special and refreshing.",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/naga-lavendar",
      },
    ],
    enableSlideshow: true,
    enableClientView: true,
    clientSettings: {
      clientLogin: "wisteria",
      clientMessage: "Hi Naga, here are all the Lavendar images — send me the URLs of the ones you like, I'll make them public.",
    },
  },
  {
    name: "Japan",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/landscapes/japan/DSC00179-Edit-4.jpg`,
    slug: "japan",
    description:
      "I didn't take a whole lot of photos in Japan, as I was traveling with Mala. It was funny...I visited the temples and other sites twice: once early in the morning as a photographer avoiding crowds, and again later in the day with Mala for sightseeing. Two trips to each sight...and worth it!",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "landscapes/japan",
      },
    ],
  },
  {
    name: "Anagha",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/anagha/DSC_0068.jpg`,
    slug: "anagha",
    description: "As another photographer friend put it, this is truly magical. Anagha looked absolutely adorable in her traditional attire and was such a joy to work with. She was a natural.",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/anagha",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=_iktURk0X-A"],
      layout: "film-stack",
      duration: 5000,
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "harmonium",
      clientMessage: "Hello Megha/Adithya, here are some additional images — only you can see them. If you'd like to print any of these, send me the image urls so I can fine-tune them a bit more. Let me know your favorites!",
    },
  },
  {
    name: "Anagha at Adobe Lodge",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/anagha2/DSC_1309-Edit.jpg`,
    slug: "anagha-family",
    description: "This was my first shoot with Anagha. She was barely one, but she already had a million-dollar smile. Now, she's ten and still has that same smile, and I love showing her these photos. This is why I love portrait photography.",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/anagha2",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=BeUSuSXBqMQ"],
      layout: "film-single",
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "harmonium",
      clientMessage: "Hello Megha/Adithya, here are some additional images — only you can see them. If you'd like to print any of these, send me the image urls so I can fine-tune them a bit more. Let me know your favorites!",
    },
  },
  {
    name: "Naga and Bharath",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/naga-stanford/DSC_9221-Edit-Edit.jpg`,
    slug: "naga-bharath",
    description: "Naga was pregnant with Sathya, and this was their maternity shoot. They were so natural together, and their chemistry was incredible to capture. These shots remain some of my all-time favorites.",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/naga-stanford",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=JkfSV51U-64"],
      layout: "kenburns",
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "wisteria",
      clientMessage: "Hello Naga/Bharath...my first shoot with you...nostalgic! Here are the rest of the images only you can see.",
    },
  },
  {
    name: "Sathya",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5614.jpg`,
    slug: "sathya",
    description: "This was my first shoot with Sathya, who was just one at the time—chubby, cute, and full of the most adorable expressions. Now he's seven, a handsome young boy, and we hang out playing cards and soccer together. It's amazing to see how much he's grown!",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/naga-adobe",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=puOnVzlkrQM"],
      layout: "kenburns",
      duration: 5000,
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "wisteria",
      clientMessage: "Hello Naga/Bharath...these are the images from Adobe Lodge...our first shoot with Sathya! Here are the rest of the images only you can see.",
    },
  },
  {
    name: "Sathya at Two",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/_DSC0510.jpg`,
    slug: "young-boy-sathya",
    description: "This was Sathya's second shoot, at two years old. He was so full of energy, running around non-stop, and this gallery captures some adorable mother-and-child moments. Sathya's uncle and aunt also joined in, making it a fun family outing.",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/naga-sanjose",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=puOnVzlkrQM"],
      layout: "kenburns",
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "wisteria",
      clientMessage: "Hello Naga/Bharath...here are all the images from our second shoot with Sathya!",
    },
  },
  {
    name: "Mt. Diablo",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/naga-diablo/DSC_4122.jpg`,
    slug: "mtdiablo",
    description:
      "This was my first shoot with Sriman, just a few months old, and my first time capturing the brothers together. We chose countryside outfits for the kids, which matched well with the rolling hills. Despite the wind constantly knocking over my light stands (and Naga and Bharath graciously helping to hold them), it was all worth it!",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/naga-diablo",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=hzGHrQBq_i4"],
      layout: "kenburns",
      duration: 9000,
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "wisteria",
      clientMessage: "Hello Naga/Bharath...here are all the images from our first shoot with Sriman (Mt. Diablo)! Remember the fox?!",
    },
  },
  {
    name: "Traditional Baby",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4265-2.jpg`,
    slug: "traditional-baby",
    description:
      "We started this shoot outdoors, but it was cold for the baby. So we went home and did the rest of the shoot indoors. Sriman was so adorable in his traditional attire! Now he's four, and he still has the same adorable smile. Plenty of naked baby shots were taken, but of course Sriman wouldn't want them out here!",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/naga-home",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=PYujyluMxMU"],
      layout: "film-single",
      duration: 7000,
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "wisteria",
      clientMessage: "Hello Naga/Bharath...here are all the images from the shoot we did at your previous place. Naked baby shots.",
    },
  },
  {
    name: "Sai Suma",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/saisuma/DSC_2769-Edit-Edit-2-Edit-Edit-Edit.jpg`,
    slug: "saisuma",
    description: "Sai is a photographer herself, but this time she was on the other side of the camera, pregnant with her first child, modeling for Chiffon and Spice. What started as a maternity shoot naturally turned into a mix of fashion and portrait shots.",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/saisuma",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=PYujyluMxMU"],
      layout: "film-single",
      duration: 7000,
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "chiffon",
      clientMessage: "Hi Suma...here are a few more images from the shoot that only you can see.",
    },
  },
  {
    name: "Sathya and Ishuwar",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/sathya-ishuwar/DSC_9082.jpg`,
    slug: "sathyaishuwar",
    description: "Ishuwar called me asking if I'd do a pre-wedding shoot for them. I said sure, and we met at Stanford, where Ishuwar was studying. They were so natural together, and their chemistry was amazing to capture. These are still some of my favorite images.",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/sathya-ishuwar",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=6P5zx_rxlhI"],
      layout: "film-stack",
      duration: 7000,
    },
    enableClientView: true,
    clientSettings: {
      clientLogin: "stanford",
      clientMessage: "Hi Sathya/Ishuwar...so long ago and yet feels like yesterday! Here are more images only you can see.",
    },
  },
  {
    name: "The Journey",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/_DSC0510.jpg`,
    slug: "naga-journey",
    description:
      "The first time I photographed Naga and Bharath, Naga was pregnant with Sathya. A couple of years later, I captured them again when Sathya was two. Then Sriman came along, and we added a few more memories to the collection. Now, Sathya is seven, and Sriman is four, and every time we meet, they are eager to play soccer with me. This is what I love about photography—I'm part of their journey!",
    blocks: [
      {
        type: "stacked",
        imageUrls: [
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-stanford/DSC_9185-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-stanford/DSC_9214-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-stanford/DSC_9227-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-stanford/DSC_9222-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-stanford/DSC_9221-Edit-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-stanford/DSC_9283.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-stanford/DSC_9322.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-stanford/DSC_9265-Edit-Edit.jpg",

          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/protected/DSC_5761-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5529.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5566-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/protected/DSC_5801.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5568.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5571-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5567-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5613-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5581-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5626.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5634.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5642.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5691.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5636-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5725.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5739.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5825-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-adobe/DSC_5728.jpg",

          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_1821.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_1862.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_1844.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_1852.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_1887.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_1943.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_2112.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_2120.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/_DSC0222.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_2131.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_2121.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/_DSC0225-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/_DSC0353.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/_DSC0510.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/DSC_2190.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/_DSC0438.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sanjose/_DSC0537-Edit-2.jpg",

          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-diablo/DSC_4122.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-diablo/DSC_4278-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-diablo/DSC_4307.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-diablo/DSC_4236-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-diablo/DSC_4175-Edit-2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-diablo/DSC_4154-Edit-2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-diablo/DSC_4284-Edit-Edit-2.jpg",

          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4212.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4187-Edit-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4260.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4293-Edit-2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4265-2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4302.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4338.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4354.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4433.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/DSC_4449.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/protected/DSCF1442-2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/protected/DSC_4154.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/protected/DSC_4169.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-home/protected/DSC_4635.jpg",

          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501414.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501496.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501499.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501527.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501490.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501531.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501674.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501666.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501715.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sunol/AR501702.jpg",

          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR500960-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR500940-Edit-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR500885-Edit-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR500795-Edit-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR500896.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR501135-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-sunflowers/AR501260.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-journey/IMG_3274-2.jpg",

          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-lavendar/DSCF6486-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-lavendar/DSC_5374-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-lavendar/DSC_5266-Edit.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-lavendar/DSC_5024.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/naga-lavendar/DSC_5118-Edit.jpg",
        ],
      },
    ],
    texts: {
      1: 'It was 2017. I got a call from Naga. She said, "I love your photos! Can we do a maternity shoot?" I\'d never done one before. I said, "sure, let\'s give it a shot."',
      3: "We met at Stanford, and Naga was glowing. Bharath was visibly excited. They were so natural together, and their chemistry was amazing to capture. These are still some of my favorite images.",
      6: 'After the shoot, Naga asked me, "Can we book you for 3, 6, and 9-month shoots?" She hadn\'t even seen the images yet but trusted me.',
      8: "Sathya was born. We did a shoot soon after at Adobe lodge. Sathya was a natural...he was so comfortable in front of the camera.",
      24: "Naga loves wisterias. We found a bunch and took a shot. Coz, why not.",
      26: "Sathya turned two, and it was time for another shoot. This time, we chose a spot near the Japanese gardens in San Jose.",
      43: "Sriman was born. It was peak of Covid, but we decided on a shoot at Mt. Diablo.",
      50: "A few months later, we did another shoot, this time at their home. Sriman looked so adorable in traditional attire!",
      63: "What's a photoshoot without some naked baby shots?",
      65: "Some of my favorite mother and son portraits. These aren't technically perfect—even the lighting isn't great...but, there's something about them I love. I think they remind me of me and my mom.",
      70: "There's always time for a few couple and solo shots!",
      75: "We'd talked about doing a sunflower shoot for years, and we finally made it happen. It was the tail end of the season, and we took a chance with a two-hour drive. But the light was perfect, and the flowers were still in bloom.",
      82: "Hope you enjoyed the show. This is what photography is to me. It's not the lighting, or the composition, or the gear. It's the connection. It's becoming a part of their journey.",
      83: "Almost forgot...we did a lavender shoot too! It was the first time Mala and I took a trip after the lockdown.",
    },
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=hzGHrQBq_i4"],
    },
    isHidden: true,
  },
  {
    name: "Atif Aslam",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_4986 2.jpg`,
    slug: "atifaslam",
    description: "Atif is a heartthrob from Pakistan. The guy is just rediculously handome. He is a blend of charm, style, class, and talent, and I have to say my camera and lens really loved him!",
    blocks: [
      {
        type: "stacked",
        imageUrls: [
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5061 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_4986 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5166 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5274 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5334 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5095 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5201 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5306 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5374 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5392 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5389 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5612 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5549 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5616 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5466 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5342 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5345 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5309 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5276 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5174 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5151 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5151 2.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/sonu-atif/DSC_5065 2.jpg",
        ],
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=qmBW9-fUvag"],
    },
  },
  {
    name: "Prabhu Deva",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_6844.jpg`,
    slug: "prabhudeva",
    description: 'I grew up watching Prabhu Deva, the Michael Jackson of India. Especially the song "Chikku Bukku Raile". They used to call him "rubber" for his insane flexibility, and seeing him dance in person was surreal. Even at this age, he was moving effortlessly just like in the movies.',
    blocks: [
      {
        type: "stacked",
        imageUrls: [
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_6843.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_6844.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_6850.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_6847.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_6870.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_6852.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_6845.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_6884.jpg",
        ],
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=S61L1fpqFXE"],
    },
  },
  {
    name: "Katrina Kaif",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/bollywood/katrina.jpeg`,
    slug: "katrinakaif",
    description: "Katrina Kaif is one of Bollywood's biggest stars, and it's easy to see why. She's got the looks, the grace, and this playful energy that makes her a natural in front of the camera. She knows how to own the moment.",
    blocks: [
      {
        type: "stacked",
        imageUrls: [
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/katrina.jpeg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/katrina2.jpeg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7054.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7037.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7054.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7138.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7148.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7055.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7090.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7042.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7103.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7066.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7449.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7450.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/bollywood/dabaang/DSC_7456.jpg",
        ],
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=ZTmF2v59CtI"],
      layout: "film-single",
      duration: 5000,
    },
  },
  {
    name: "Access Braille",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0041.jpg`,
    slug: "accessbraille",
    description: "Sudha is a Bharatanatyam dancer and teacher, and she moves with so much grace. She was performing for Access Braille, a non-profit that supports the visually impaired, and you can see in every photo how expressive she is, with every movement filled with emotion.",
    blocks: [
      {
        type: "stacked",
        imageUrls: [
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0034.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0036.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0037.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0050.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0057.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0070.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0078.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0076.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0072.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha/DSC_0109.jpg",
        ],
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=LD5W8W7-0II"],
    },
  },
  {
    name: "Pacific Coast Rocks ",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/landscapes/colorful-rocks/DSCF1412.jpg`,
    slug: "rocks",
    description: "The Pacific Coast Highway (Highway 1) is easily one of the most beautiful roads in the world, with unexpected surprises. I stumbled upon these colorful rocks on a random beach along the coast. Have you ever seen rocks having so much color?",
    blocks: [
      {
        type: "stacked",
        imageUrls: [
          "https://storage.googleapis.com/swamiphoto/photos/landscapes/colorful-rocks/DSCF1406.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/landscapes/colorful-rocks/DSCF1412.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/landscapes/colorful-rocks/DSCF1411.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/landscapes/colorful-rocks/DSCF1408.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/landscapes/colorful-rocks/DSCF1415.jpg",
          "https://storage.googleapis.com/swamiphoto/photos/landscapes/colorful-rocks/DSCF1414.jpg",
        ],
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=U1FZVpcKhGg"],
      layout: "film-single",
    },
  },
  {
    name: "Sarina",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/events/sarina-first-bday/AR502170.jpg`,
    slug: "sarina-bday",
    description: "Birthday party at Broom street Ganesha temple",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "events/sarina-first-bday",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=g4M0hH1R2eU"],
    },
    isHidden: true,
  },
  {
    name: "Sarina",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/sarina/AR502585.jpg`,
    slug: "sarina",
    description: "Portraits on Sarina's 1st birthday",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/sarina",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=mVsmFCgxc1o"],
      layout: "film-single",
    },
    isHidden: true,
  },
  {
    name: "Nava Rasa",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/sudha-navarasa/AR503366-Edit-2-Edit.jpg`,
    slug: "sudha-nava-rasa",
    description: "Nava Rasa refers to the nine emotions in Indian classical dance. Sudha was modeling for a sari designer, showcasing nine different saris, each representing a unique emotion. This is the first one.",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/sudha-navarasa",
        start: 0,
        count: 4,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha-navarasa/AR503441-Edit-2-2.jpg",
        variant: 1,
      },
      {
        type: "stacked",
        imagesFolderUrl: "portraits/sudha-navarasa",
        excludeImageUrls: ["https://storage.googleapis.com/swamiphoto/photos/portraits/sudha-navarasa/AR503551-Edit-Edit.jpg", "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha-navarasa/AR503441-Edit-2-2.jpg"],
        start: 4,
        count: -1,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/portraits/sudha-navarasa/AR503551-Edit-Edit.jpg",
        variant: 1,
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=OBUauvQLrQQ"],
    },
    isHidden: true,
  },
  {
    name: "Nanna",
    thumbnailUrl: "https://storage.googleapis.com/swamiphoto/photos/events/naga-dad-75th-bday/bw/DSC_2663-Enhanced-NR.jpg",
    slug: "nanna75",
    description: "Here's a cherished collection of black-and-white photographs we gathered for Nanna's 75th birthday video.",
    blocks: [
      {
        type: "masonry",
        imagesFolderUrl: "events/naga-dad-75th-bday/recent",
        excludeImageUrls: ["https://storage.googleapis.com/swamiphoto/photos/events/naga-dad-75th-bday/recent/20180526_152637.jpg"],
        start: 0,
        count: 6,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/events/naga-dad-75th-bday/recent/20180526_152637.jpg",
      },
      {
        type: "stacked",
        imagesFolderUrl: "events/naga-dad-75th-bday/recent",
        start: 6,
        count: 8,
      },

      {
        type: "masonry",
        imagesFolderUrl: "events/naga-dad-75th-bday/recent",
        start: 14,
        count: 10,
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/events/naga-dad-75th-bday/recent/IMG-20181123-WA0023.jpg",
      },
      {
        type: "masonry",
        imagesFolderUrl: "events/naga-dad-75th-bday/recent",
        start: 24,
        count: -1,
        excludeImageUrls: ["https://storage.googleapis.com/swamiphoto/photos/events/naga-dad-75th-bday/recent/IMG-20181123-WA0023.jpg"],
      },
      {
        type: "stacked",
        imagesFolderUrl: "events/naga-dad-75th-bday/bw",
        start: 0,
        count: 5,
        excludeImageUrls: ["https://storage.googleapis.com/swamiphoto/photos/events/naga-dad-75th-bday/bw/DSC_2655-Enhanced-NR.jpg"],
      },
      {
        type: "photo",
        imageUrl: "https://storage.googleapis.com/swamiphoto/photos/events/naga-dad-75th-bday/bw/DSC_2655-Enhanced-NR.jpg",
        variant: 1,
      },
      {
        type: "masonry",
        imagesFolderUrl: "events/naga-dad-75th-bday/bw",
        start: 5,
        count: 4,
      },
      {
        type: "stacked",
        imagesFolderUrl: "events/naga-dad-75th-bday/bw",
        start: 9,
        count: -1,
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=Kpjo3Cxc_90"],
      layout: "kenburns",
    },
    isHidden: true,
  },
  {
    name: "Bharath's Family",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/naga-lavendar/DSCF6486-Edit.jpg`,
    slug: "bharath-family",
    description: "Portraits of Bharath's family, his brother's family, and his mom.",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "portraits/bharath-family",
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=OhswLOVzXNc"],
      layout: "kenburns",
    },
    isHidden: true,
  },
  {
    name: "Rajee/Pradeep Puja",
    thumbnailUrl: `https://storage.googleapis.com/swamiphoto/photos/portraits/naga-lavendar/DSCF6486-Edit.jpg`,
    slug: "rajee-pradeep-puja",
    description: "Sathya Narayana Puja at Rajee and Pradeep's home. Backyard portraits of families and couples after the puja.",
    blocks: [
      {
        type: "stacked",
        imagesFolderUrl: "events/rajee-pradeep-puja",
        excludeImageUrls: [
          "https://storage.googleapis.com/swamiphoto/photos/events/rajee-pradeep-puja/IMG_0312.jpeg",
          "https://storage.googleapis.com/swamiphoto/photos/events/rajee-pradeep-puja/IMG_0304.jpeg",
          "https://storage.googleapis.com/swamiphoto/photos/events/rajee-pradeep-puja/IMG_0338.jpeg",
          "https://storage.googleapis.com/swamiphoto/photos/events/rajee-pradeep-puja/IMG_0311.jpeg",
        ],
      },
    ],
    enableSlideshow: true,
    slideshowSettings: {
      youtubeLinks: ["https://www.youtube.com/watch?v=OhswLOVzXNc"],
      layout: "kenburns",
    },
    isHidden: true,
  },
];
