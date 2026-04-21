import React from "react";
import { HiOutlineArrowLeft } from "react-icons/hi2";

const GalleryCover = ({ name, description, enableSlideshow = false, enableClientView = false, onBackClick, onSlideshowClick, onClientLoginClick, childPages, activeChildId, username, onChildPageClick }) => {
  const hasChildNav = childPages?.length > 0
  const basePath = username ? `/sites/${username}` : ''
  const hasActions = enableSlideshow || enableClientView
  const hasContent = name || description || hasChildNav || hasActions

  if (!hasContent) return null

  return (
    <div className="relative flex flex-col items-center justify-center text-gray-900 px-4 pt-8 pb-6 md:px-20 md:pt-14 md:pb-8">
      <div className="text-center px-6">
        {name && <h1 className="text-4xl md:text-5xl font-serif2 mb-4">{name}</h1>}
        {description && <p className="font-serif text-[20px] md:text-[22px] font-normal leading-8 max-w-3xl mx-auto mb-6 text-gray-900" style={{ letterSpacing: '-0.6px' }}>{description}</p>}

        {hasChildNav && (
          <ul className="flex items-center justify-center gap-8 mb-6">
            {childPages.map(p => {
              const isActive = p.id === activeChildId
              const cls = `font-serif text-base font-medium transition-colors ${isActive ? 'text-gray-900 underline' : 'text-gray-500 hover:text-gray-900'}`
              return (
                <li key={p.id}>
                  {onChildPageClick ? (
                    <button onClick={() => onChildPageClick(p.id)} className={cls}>{p.title}</button>
                  ) : (
                    <a href={`${basePath}/${p.slug || p.id}`} className={cls}>{p.title}</a>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {hasActions && (
          <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-4 space-y-4 sm:space-y-0 mt-6 w-full sm:w-auto">
            {enableSlideshow && (
              <button onClick={onSlideshowClick} className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 bg-gray-900 text-white text-base sm:text-lg font-serif font-light hover:bg-gray-800 transition tracking-wide">
                View Music Show
              </button>
            )}
            {enableClientView && (
              <button onClick={onClientLoginClick} className="w-full sm:w-auto px-4 py-2 sm:px-6 sm:py-3 border border-gray-500 text-gray-700 text-base sm:text-lg font-serif font-light hover:text-black hover:border-gray-700 transition tracking-wide">
                Client Login
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryCover;
