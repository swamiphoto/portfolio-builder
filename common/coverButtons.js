// Pure: the "secondary" hero button style is the complement of the chosen
// (primary) style — solid pairs with outline and vice versa. Any non-'outline'
// input resolves to 'outline' so a secondary button stays visible.
export function secondaryButtonStyle(primary) {
  return primary === 'outline' ? 'solid' : 'outline'
}
