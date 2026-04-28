import { createContext, useContext } from 'react'

const ViewportContext = createContext(null)

export const ViewportProvider = ViewportContext.Provider

export function useAdminViewport() {
  return useContext(ViewportContext)
}
