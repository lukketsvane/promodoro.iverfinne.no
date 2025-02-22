export const getDaysLeftInYear = () => {
  const now = new Date()
  const endOfYear = new Date(now.getFullYear(), 11, 31) // December 31st
  const diffTime = Math.abs(endOfYear.getTime() - now.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

export const getTodayKey = () => {
  return new Date().toISOString().split("T")[0]
}

export const getRandomTomatoIcon = () => {
  const iconNumbers = Array.from({ length: 103 }, (_, i) => (i + 1).toString().padStart(2, "0"))
  const randomIndex = Math.floor(Math.random() * iconNumbers.length)
  return `icon-${iconNumbers[randomIndex]}`
}

