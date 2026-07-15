import { createContext, useContext } from 'react'
import { getTheme, kyoto } from '../../common/themes'

const ThemeContext = createContext(kyoto)

export function useTheme() {
  return useContext(ThemeContext)
}

export default function ThemeProvider({ themeId, children }) {
  const theme = getTheme(themeId)
  return (
    <ThemeContext.Provider value={theme}>
      <div data-theme={theme.id} style={theme.tokens}>{children}</div>
    </ThemeContext.Provider>
  )
}
