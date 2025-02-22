"use server"

import { cookies } from "next/headers"

export interface TomatoStats {
  dailyCount: number
  totalCount: number
  lastUpdated: string
  collectedDates: string[]
}

export async function getTomatoStats(): Promise<TomatoStats> {
  "use server"

  const stored = cookies().get("tomato-stats")
  const today = new Date().toISOString().split("T")[0]

  if (!stored?.value) {
    return {
      dailyCount: 0,
      totalCount: 0,
      lastUpdated: today,
      collectedDates: [],
    }
  }

  const stats = JSON.parse(stored.value)
  if (stats.lastUpdated !== today) {
    return {
      ...stats,
      dailyCount: 0,
      lastUpdated: today,
    }
  }

  return stats
}

export async function updateTomatoStats(currentStats: TomatoStats): Promise<TomatoStats> {
  "use server"

  const today = new Date().toISOString().split("T")[0]
  const uniqueDates = new Set([...currentStats.collectedDates, today])

  const newStats = {
    dailyCount: currentStats.lastUpdated === today ? currentStats.dailyCount + 1 : 1,
    totalCount: currentStats.totalCount + 1,
    lastUpdated: today,
    collectedDates: Array.from(uniqueDates),
  }

  cookies().set("tomato-stats", JSON.stringify(newStats))

  return newStats
}

