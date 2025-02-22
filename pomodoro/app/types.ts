export interface TomatoStats {
  dailyCount: number
  totalCount: number
  lastUpdated: string
  collectedDates: string[]
}

export interface TimerState {
  modeIndex: number
  setTime: number
  timeLeft: number
  isRunning: boolean
  isDragging: boolean
  showInfo: boolean
}

