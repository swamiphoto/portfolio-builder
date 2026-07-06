// components/image-displays/print/PrintStoreContext.js
// Provides a single, app-wide print configurator drawer that any component can
// open — the lightbox today, image thumbnails or page CTAs later.
import React, { createContext, useContext, useState, useCallback } from 'react'
import PrintConfigurator from './PrintConfigurator'

const PrintStoreContext = createContext(null)

export function usePrintStore() {
  return useContext(PrintStoreContext)
}

export function PrintStoreProvider({ printStore, username, children }) {
  const [target, setTarget] = useState(null) // { print, imageUrl } | null

  const openConfigurator = useCallback((next) => {
    if (next && next.print) setTarget(next)
  }, [])
  const close = useCallback(() => setTarget(null), [])

  return (
    <PrintStoreContext.Provider value={{ openConfigurator, close, printStore, username, isOpen: !!target }}>
      {children}
      <PrintConfigurator
        open={!!target}
        print={target?.print}
        imageUrl={target?.imageUrl}
        printStore={printStore}
        username={username}
        onClose={close}
      />
    </PrintStoreContext.Provider>
  )
}
