export interface Theme {
  id: string
  name: string
  label: string
  colors: {
    primary: string
    secondary: string
    accent: string
  }
}

export const AVAILABLE_THEMES: Record<string, Theme> = {
  lavender: {
    id: 'lavender',
    name: 'Lavender',
    label: '🟣 Lavanda',
    colors: {
      primary: '#c084fc', // Purple pastel
      secondary: '#e9d5ff', // Light purple
      accent: '#f3e8ff', // Very light purple
    },
  },
  mint: {
    id: 'mint',
    name: 'Mint',
    label: '🟢 Menta',
    colors: {
      primary: '#6ee7b7', // Green pastel
      secondary: '#d1fae5', // Light green
      accent: '#ecfdf5', // Very light green
    },
  },
  peach: {
    id: 'peach',
    name: 'Peach',
    label: '🍑 Melocotón',
    colors: {
      primary: '#fb9a8e', // Peach pastel
      secondary: '#fed7aa', // Light peach
      accent: '#fef3c7', // Very light peach/yellow
    },
  },
  sky: {
    id: 'sky',
    name: 'Sky',
    label: '🔵 Cielo',
    colors: {
      primary: '#7dd3fc', // Blue pastel
      secondary: '#bae6fd', // Light blue
      accent: '#e0f2fe', // Very light blue
    },
  },
  butter: {
    id: 'butter',
    name: 'Butter',
    label: '💛 Mantequilla',
    colors: {
      primary: '#fde047', // Yellow pastel
      secondary: '#fef08a', // Light yellow
      accent: '#fef3c7', // Very light yellow
    },
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    label: '🌸 Rosa',
    colors: {
      primary: '#fb7185', // Rose pastel
      secondary: '#fbcfe8', // Light rose
      accent: '#ffe4e6', // Very light rose
    },
  },
  sage: {
    id: 'sage',
    name: 'Sage',
    label: '🌿 Salvia',
    colors: {
      primary: '#9ca3af', // Sage pastel
      secondary: '#d1d5db', // Light sage
      accent: '#f3f4f6', // Very light sage
    },
  },
  coral: {
    id: 'coral',
    name: 'Coral',
    label: '🪸 Coral',
    colors: {
      primary: '#f87171', // Coral pastel
      secondary: '#fecaca', // Light coral
      accent: '#fee2e2', // Very light coral
    },
  },
}

export const DEFAULT_THEME = 'lavender'
