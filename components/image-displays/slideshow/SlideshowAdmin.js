import React, { useEffect, useState, useRef } from "react";
import Text from "../../text/Text"; // Correct Text import
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { getCloudimageUrl } from "../../../common/images"; // Importing getCloudimageUrl for scaling

const SlideshowAdmin = ({ gallery }) => {
  const [slides, setSlides] = useState([]);
  const [inputs, setInputs] = useState([]); // Stores both image URLs and text inputs in order
  const imageRefs = useRef([]); // Ref array for image elements on the left
  const inputRefs = useRef([]); // Ref array for inputs on the right
  const [popup, setPopup] = useState({ open: false, index: null }); // Popup state for URL input
  const [newUrl, setNewUrl] = useState(""); // Temporary URL state for adding new images
  const [jsonModalOpen, setJsonModalOpen] = useState(false); // State for showing JSON modal
  const [jsonContent, setJsonContent] = useState(""); // Holds the regenerated JSON content

  useEffect(() => {
    if (gallery) {
      const combinedSlides = [];
      const tempInputs = [];

      let currentImageBatch = [];
      gallery.imageUrls.forEach((url, index) => {
        currentImageBatch.push(url);

        if (gallery.texts[index + 1]) {
          combinedSlides.push({ type: "images", urls: [...currentImageBatch] });
          tempInputs.push({ type: "images", urls: [...currentImageBatch] });
          currentImageBatch = [];

          combinedSlides.push({ type: "text", content: gallery.texts[index + 1] });
          tempInputs.push({ type: "text", content: gallery.texts[index + 1] });
        }
      });

      if (currentImageBatch.length > 0) {
        combinedSlides.push({ type: "images", urls: [...currentImageBatch] });
        tempInputs.push({ type: "images", urls: [...currentImageBatch] });
      }

      setSlides(combinedSlides);
      setInputs(tempInputs);
    }
  }, [gallery]);

  // Sync refs with slides and inputs length
  useEffect(() => {
    imageRefs.current = imageRefs.current.slice(0, slides.length); // Trim refs array to match slides length
    inputRefs.current = inputRefs.current.slice(0, inputs.length); // Trim input refs array
  }, [slides, inputs]);

  // Handle deleting an image by index
  const handleDeleteImage = (sectionIndex, imageIndex) => {
    const updatedInputs = [...inputs];
    updatedInputs[sectionIndex].urls.splice(imageIndex, 1); // Remove the image URL
    setInputs(updatedInputs);

    // Update slides as well
    const updatedSlides = [...slides];
    updatedSlides[sectionIndex].urls.splice(imageIndex, 1);
    setSlides(updatedSlides);
  };

  // Handle opening a popup for adding new images
  const handleOpenPopup = (sectionIndex) => {
    setPopup({ open: true, index: sectionIndex });
    setNewUrl(""); // Reset new URL state
  };

  // Handle saving a new image URL
  const handleSaveImage = () => {
    if (newUrl.trim()) {
      const updatedInputs = [...inputs];
      updatedInputs[popup.index].urls.push(newUrl); // Add the new image URL
      setInputs(updatedInputs);

      // Update slides as well
      const updatedSlides = [...slides];
      updatedSlides[popup.index].urls.push(newUrl);
      setSlides(updatedSlides);

      setPopup({ open: false, index: null }); // Close popup
      setNewUrl(""); // Clear URL input
    }
  };

  // Handle drag end
  const handleOnDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination } = result;

    // Clone current inputs and slides
    const updatedInputs = [...inputs];
    const updatedSlides = [...slides];

    // Moving within the same section
    if (source.droppableId === destination.droppableId) {
      const sectionIndex = parseInt(source.droppableId, 10);
      const [movedImage] = updatedInputs[sectionIndex].urls.splice(source.index, 1);
      updatedInputs[sectionIndex].urls.splice(destination.index, 0, movedImage);

      // Update slides as well
      updatedSlides[sectionIndex].urls = [...updatedInputs[sectionIndex].urls];
    } else {
      // Moving across sections
      const sourceSectionIndex = parseInt(source.droppableId, 10);
      const destinationSectionIndex = parseInt(destination.droppableId, 10);
      const [movedImage] = updatedInputs[sourceSectionIndex].urls.splice(source.index, 1);
      updatedInputs[destinationSectionIndex].urls.splice(destination.index, 0, movedImage);

      // Update slides as well
      updatedSlides[sourceSectionIndex].urls = [...updatedInputs[sourceSectionIndex].urls];
      updatedSlides[destinationSectionIndex].urls = [...updatedInputs[destinationSectionIndex].urls];
    }

    // Update state
    setInputs(updatedInputs);
    setSlides(updatedSlides);
  };

  // Scroll to the right pane when clicking an image/text on the left
  const handleElementClick = (index, type, urlIndex) => {
    const inputElem = inputRefs.current[index];
    if (inputElem) {
      inputElem.scrollIntoView({ behavior: "smooth", block: "center" });
      inputElem.focus();

      if (type === "images" && urlIndex !== undefined) {
        const inputThumbnailElem = inputRefs.current[index].querySelector(`img[data-urlindex="${urlIndex}"]`);
        if (inputThumbnailElem) {
          inputThumbnailElem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  };

  // Scroll to the left pane when clicking an input on the right
  const handleScrollToLeftPane = (index, type) => {
    const leftElem = imageRefs.current[index];
    if (leftElem) {
      leftElem.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Handle Regenerate JSON and display it in modal
  const handleRegenerateJson = () => {
    const fullJson = {
      ...gallery, // Include other properties of the gallery
      imageUrls: inputs.flatMap((input) => (input.type === "images" ? input.urls : [])),
      texts: inputs
        .filter((input) => input.type === "text")
        .reduce((acc, input, i) => {
          acc[i + 1] = input.content;
          return acc;
        }, {}),
    };
    setJsonContent(JSON.stringify(fullJson, null, 2)); // Format JSON nicely
    setJsonModalOpen(true); // Show modal
  };

  // Copy JSON to clipboard
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(jsonContent);
    alert("JSON copied to clipboard!");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Pane: Display Images and Texts */}
      <div className="w-3/4 p-4 overflow-auto border-r">
        {slides.map((slide, slideIndex) => (
          <div key={slideIndex} className="mb-4" ref={(el) => (imageRefs.current[slideIndex] = el)}>
            {slide.type === "images" ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                {slide.urls.map((url, urlIndex) => (
                  <img
                    key={urlIndex}
                    src={getCloudimageUrl(url, { width: 400, quality: 30 })} // Scale down images for the left pane
                    alt={`Slide ${slideIndex + 1}`}
                    className="h-36 w-auto object-contain mx-auto cursor-pointer" // Consistent height, preserve aspect ratio
                    onClick={() => handleElementClick(slideIndex, slide.type, urlIndex)}
                  />
                ))}
              </div>
            ) : (
              <div className="max-w-3xl px-4 cursor-pointer" onClick={() => handleElementClick(slideIndex, slide.type)}>
                <Text layout="layout2">{slide.content}</Text>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right Pane: Editable Inputs */}
      <div className="w-1/4 p-4 overflow-auto">
        <DragDropContext onDragEnd={handleOnDragEnd}>
          {inputs.map((input, index) => (
            <div key={`input-${index}`} className="mb-4 p-3 bg-gray-100 shadow rounded-lg" ref={(el) => (inputRefs.current[index] = el)}>
              {input.type === "images" ? (
                <Droppable droppableId={`${index}`} direction="horizontal">
                  {(provided) => (
                    <div className="flex flex-wrap gap-2" {...provided.droppableProps} ref={provided.innerRef}>
                      {input.urls.map((url, urlIndex) => (
                        <Draggable key={urlIndex} draggableId={`${index}-${urlIndex}`} index={urlIndex}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="relative">
                              <img
                                src={getCloudimageUrl(url, { width: 100, quality: 30 })} // Scale down images for thumbnails
                                alt={`Thumbnail ${urlIndex}`}
                                className="w-24 h-24 object-cover"
                                data-urlindex={urlIndex}
                              />
                              <button className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs cursor-pointer" onClick={() => handleDeleteImage(index, urlIndex)}>
                                X
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      <button className="w-24 h-24 bg-gray-300 flex items-center justify-center text-xl font-bold text-gray-600 cursor-pointer" onClick={() => handleOpenPopup(index)}>
                        + Add Image
                      </button>
                    </div>
                  )}
                </Droppable>
              ) : (
                <textarea ref={(el) => (inputRefs.current[index] = el)} value={input.content} onChange={(e) => handleInputChange(e, index, "text")} rows={2} className="w-full p-2 border border-gray-300 rounded-lg" onClick={() => handleScrollToLeftPane(index, "text")} />
              )}
            </div>
          ))}
        </DragDropContext>

        <button className="mt-4 p-2 bg-blue-500 text-white rounded-lg" onClick={handleRegenerateJson}>
          Regenerate JSON
        </button>

        {/* Popup for Adding New Images */}
        {popup.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h2 className="mb-2">Enter Image URL:</h2>
              <input type="text" className="w-full p-2 border border-gray-300 rounded-lg mb-2" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
              <div className="flex justify-end">
                <button className="mr-2 p-2 bg-green-500 text-white rounded-lg" onClick={handleSaveImage}>
                  Save
                </button>
                <button className="p-2 bg-red-500 text-white rounded-lg" onClick={() => setPopup({ open: false, index: null })}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for JSON display */}
      {jsonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-4xl w-full">
            <h2 className="mb-4">Generated JSON:</h2>
            <textarea value={jsonContent} readOnly className="w-full h-64 p-2 border border-gray-300 rounded-lg mb-4" />
            <div className="flex justify-end">
              <button className="mr-2 p-2 bg-green-500 text-white rounded-lg" onClick={handleCopyToClipboard}>
                Copy JSON
              </button>
              <button className="p-2 bg-red-500 text-white rounded-lg" onClick={() => setJsonModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideshowAdmin;
