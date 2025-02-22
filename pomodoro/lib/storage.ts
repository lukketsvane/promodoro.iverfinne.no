export interface TomatoStats {
    dailyCount: number
    totalCount: number
    lastUpdated: string
    collectedDates: string[]
    currentSequence: {
      segmentIndex: number
      progressMinutes: number
    }
  }
  
  const STORAGE_KEY = "tomato-stats"
  
  export function getTomatoStats(): TomatoStats {
    if (typeof window === "undefined") return getInitialStats()
  
    const stored = localStorage.getItem(STORAGE_KEY)
    const today = new Date().toISOString().split("T")[0]
  
    if (!stored) {
      return getInitialStats()
    }
  
    const stats = JSON.parse(stored)
    if (stats.lastUpdated !== today) {
      const newStats = {
        ...stats,
        dailyCount: 0,
        lastUpdated: today,
        currentSequence: {
          segmentIndex: 0,
          progressMinutes: 0,
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats))
      return newStats
    }
  
    return stats
  }
  
  export function updateTomatoStats(stats: TomatoStats): TomatoStats {
    const today = new Date().toISOString().split("T")[0]
    const uniqueDates = new Set([...stats.collectedDates, today])
  
    const newStats = {
      ...stats,
      dailyCount: stats.dailyCount + 1,
      totalCount: stats.totalCount + 1,
      lastUpdated: today,
      collectedDates: Array.from(uniqueDates),
    }
  
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats))
    return newStats
  }
  
  export function updateSequenceProgress(stats: TomatoStats, completedMinutes: number): TomatoStats {
    const POMODORO_SEQUENCE = [
      { type: "work", duration: 60 }, // Changed to 1 hour total work time
      { type: "break", duration: 15 },
    ]
  
    const currentSegment = POMODORO_SEQUENCE[stats.currentSequence.segmentIndex]
    const newProgressMinutes = stats.currentSequence.progressMinutes + completedMinutes
  
    if (newProgressMinutes >= currentSegment.duration) {
      // Segment is completed
      const nextSegmentIndex = (stats.currentSequence.segmentIndex + 1) % POMODORO_SEQUENCE.length
      const newStats = {
        ...stats,
        currentSequence: {
          segmentIndex: nextSegmentIndex,
          progressMinutes: 0,
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats))
      return newStats
    } else {
      // Segment is in progress
      const newStats = {
        ...stats,
        currentSequence: {
          segmentIndex: stats.currentSequence.segmentIndex,
          progressMinutes: newProgressMinutes,
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats))
      return newStats
    }
  }
  
  function getInitialStats(): TomatoStats {
    return {
      dailyCount: 0,
      totalCount: 0,
      lastUpdated: new Date().toISOString().split("T")[0],
      collectedDates: [],
      currentSequence: {
        segmentIndex: 0,
        progressMinutes: 0,
      },
    }
  }
  
  