"use client"

import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { GeistMono } from "geist/font/mono"
import { Home, Info, X } from "lucide-react"
import Image from "next/image"
import { getTomatoStats, updateTomatoStats, updateSequenceProgress, type TomatoStats } from "../lib/storage"

interface TimerState {
  modeIndex: number
  setTime: number
  timeLeft: number
  isRunning: boolean
  isDragging: boolean
  showInfo: boolean
}

const TIMER_MODES = [
  { name: "2 min", seconds: 120 },
  { name: "5 min", seconds: 300 },
  { name: "15 min", seconds: 900 },
  { name: "30 min", seconds: 1800 },
  { name: "60 min", seconds: 3600 },
]

const POMODORO_SEQUENCE = [
  { type: "work", duration: 60 },
  { type: "break", duration: 15 },
]

function getDaysLeftInYear() {
  const now = new Date()
  const endOfYear = new Date(now.getFullYear(), 11, 31)
  const diffTime = Math.abs(endOfYear.getTime() - now.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
function getRandomTomatoIcon() {
  const iconNumbers = Array.from({ length: 103 }, (_, i) => (i + 1).toString().padStart(2, "0"))
  const randomIndex = Math.floor(Math.random() * iconNumbers.length)
  return `icon-${iconNumbers[randomIndex]}`
}

export default function TimeTimer() {
  const [state, setState] = useState<TimerState>({
    modeIndex: 0,
    setTime: TIMER_MODES[0].seconds,
    timeLeft: TIMER_MODES[0].seconds,
    isRunning: false,
    isDragging: false,
    showInfo: false,
  })

  const [stats, setStats] = useState<TomatoStats>({
    dailyCount: 0,
    totalCount: 0,
    lastUpdated: new Date().toISOString().split("T")[0],
    collectedDates: [],
    currentSequence: { segmentIndex: 0, progressMinutes: 0 },
  })

  const [showHome, setShowHome] = useState(false)

  const svgRef = useRef<SVGSVGElement>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const tapCount = useRef<number>(0)
  const tapTimer = useRef<NodeJS.Timeout | null>(null)
  const timerStartRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    setStats(getTomatoStats())
  }, [])

  // Replace the existing timer effect with this new implementation
  useEffect(() => {
    const updateTimer = () => {
      if (!state.isRunning || !timerStartRef.current) return

      const now = Date.now()
      const elapsed = Math.floor((now - timerStartRef.current) / 1000)
      const newTimeLeft = Math.max(0, state.setTime - elapsed)

      if (newTimeLeft !== state.timeLeft) {
        setState((prev) => ({ ...prev, timeLeft: newTimeLeft }))
      }

      if (newTimeLeft === 0) {
        setState((prev) => ({ ...prev, isRunning: false }))
        setStats(updateTomatoStats(stats))
        timerStartRef.current = null
        return
      }

      animationFrameRef.current = requestAnimationFrame(updateTimer)
    }

    if (state.isRunning && state.timeLeft > 0) {
      if (!timerStartRef.current) {
        timerStartRef.current = Date.now() - (state.setTime - state.timeLeft) * 1000
      }
      animationFrameRef.current = requestAnimationFrame(updateTimer)
    } else {
      timerStartRef.current = null
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [state.isRunning, state.timeLeft, state.setTime, stats])

  // Add visibility change handler
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state.isRunning) {
        setState((prev) => ({ ...prev, isRunning: false }))
        timerStartRef.current = null
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [state.isRunning])

  useEffect(() => {
    const newSetTime = TIMER_MODES[state.modeIndex].seconds
    const newTimeLeft = TIMER_MODES[state.modeIndex].seconds
    setState((prev) => ({ ...prev, setTime: newSetTime, timeLeft: newTimeLeft, isRunning: false }))
  }, [state.modeIndex])

  // Add completed session handling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout
    if (state.timeLeft === 0 && !state.isRunning) {
      timeoutId = setTimeout(() => {
        const completedMinutes = state.setTime / 60
        const updatedStats = updateSequenceProgress(stats, completedMinutes)
        setStats(updatedStats)
        updateTomatoStats(updatedStats)
      }, 0)
    }
    return () => clearTimeout(timeoutId)
  }, [state.timeLeft, state.isRunning, state.setTime, stats])

  const calculateArc = useCallback(() => {
    const percentage = state.timeLeft / state.setTime
    const degrees = percentage * 360

    const startAngle = -90 * (Math.PI / 180)
    const endAngle = (degrees - 90) * (Math.PI / 180)

    const startX = 50 + 45 * Math.cos(startAngle)
    const startY = 50 + 45 * Math.sin(startAngle)
    const endX = 50 + 45 * Math.cos(endAngle)
    const endY = 50 + 45 * Math.sin(endAngle)

    const largeArcFlag = degrees > 180 ? 1 : 0

    return `M 50 50 L ${startX} ${startY} A 45 45 0 ${largeArcFlag} 1 ${endX} ${endY} Z`
  }, [state.timeLeft, state.setTime])

  const handleDragStart = useCallback(
    (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
      setState((prev) => ({ ...prev, isDragging: true, isRunning: false }))

      const handleDrag = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
        if (!state.isDragging || !svgRef.current) return

        const svg = svgRef.current
        const rect = svg.getBoundingClientRect()
        const centerX = rect.width / 2
        const centerY = rect.height / 2

        let clientX, clientY
        if ("touches" in e) {
          clientX = e.touches[0].clientX
          clientY = e.touches[0].clientY
        } else {
          clientX = e.clientX
          clientY = e.clientY
        }

        const x = clientX - rect.left - centerX
        const y = clientY - rect.top - centerY

        let angle = Math.atan2(y, x) * (180 / Math.PI)
        angle = (-angle + 90 + 360) % 360

        const newTime = Math.round((angle / 360) * state.setTime)
        setState((prev) => ({ ...prev, timeLeft: newTime }))
      }

      handleDrag(e)
    },
    [state.isDragging, state.setTime],
  )

  const handleDragEnd = useCallback(() => {
    setState((prev) => ({ ...prev, isDragging: false }))
    if (state.timeLeft > 0 && state.timeLeft < state.setTime) {
      setState((prev) => ({ ...prev, isRunning: true }))
    }
  }, [state.timeLeft, state.setTime])

  const handleDoubleTap = useCallback(() => {
    if (state.isRunning) {
      timerStartRef.current = null
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
    setState((prev) => ({ ...prev, isRunning: !prev.isRunning }))
  }, [state.isRunning])

  const handleTap = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault()
      tapCount.current += 1

      if (tapCount.current === 1) {
        tapTimer.current = setTimeout(() => {
          tapCount.current = 0
        }, 300)
      } else if (tapCount.current === 2) {
        clearTimeout(tapTimer.current!)
        handleDoubleTap()
        tapCount.current = 0
      }
    },
    [handleDoubleTap],
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      handleTap(e)
    },
    [handleTap],
  )

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const diffX = touchStartX.current - touchEndX
    const diffY = touchStartY.current - touchEndY

    const target = e.target as HTMLElement
    if (!target.closest("svg")) {
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
          setState((prev) => ({ ...prev, modeIndex: (prev.modeIndex + 1) % TIMER_MODES.length }))
        } else {
          setState((prev) => ({ ...prev, modeIndex: (prev.modeIndex - 1 + TIMER_MODES.length) % TIMER_MODES.length }))
        }
      }
    }

    touchStartX.current = null
    touchStartY.current = null
  }, [])

  const getNumberOfMarkers = useCallback(() => {
    const totalMinutes = state.setTime / 60
    return totalMinutes <= 5 ? totalMinutes * 2 : totalMinutes
  }, [state.setTime])

  const getMarkerValue = useCallback(
    (index: number) => {
      const totalMinutes = state.setTime / 60
      if (totalMinutes <= 5) {
        return (totalMinutes - index * 0.5).toFixed(1)
      }
      return totalMinutes - index
    },
    [state.setTime],
  )

  const renderPomodoroSequence = () => {
    const progressMinutes = stats.currentSequence?.progressMinutes ?? 0
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex gap-1 h-8 mb-4">
          {POMODORO_SEQUENCE.map((period, index) => {
            const isCurrentSegment = index === (stats.currentSequence?.segmentIndex ?? 0)
            const isPastSegment = index < (stats.currentSequence?.segmentIndex ?? 0)
            const progressPercentage = isCurrentSegment ? (progressMinutes / period.duration) * 100 : 0

            return (
              <div
                key={index}
                className="flex-1 rounded overflow-hidden relative bg-gray-100"
                title={`${period.type === "work" ? "Work" : "Break"} - ${period.duration} minutes${
                  isCurrentSegment ? ` (${stats.currentSequence?.progressMinutes ?? 0} minutes completed)` : ""
                }`}
              >
                <div
                  className={`absolute inset-0 transition-all duration-300 ${
                    period.type === "work" ? "bg-red-500" : "bg-green-400"
                  }`}
                  style={{
                    width: isPastSegment ? "100%" : isCurrentSegment ? `${progressPercentage}%` : "0%",
                  }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex justify-center gap-8 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Arbeid (60 min totalt)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded" />
            <span>Pause (15 min)</span>
          </div>
        </div>
        <div className="text-center mt-4 text-sm text-gray-600">
          {(stats.currentSequence?.segmentIndex ?? 0) === 0 ? (
            <p>
              {progressMinutes} minutt fullførte. Treng {60 - progressMinutes} minutt meir for å fullføra arbeidsøkta.
            </p>
          ) : (
            <p>
              {progressMinutes} minutt pause teke. {15 - progressMinutes} minutt pause att.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`fixed inset-0 bg-white flex items-center justify-center overflow-hidden ${GeistMono.className}`}
      style={{
        height: "100vh",
        width: "100vw",
        maxHeight: "-webkit-fill-available",
        userSelect: "none",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="fixed top-4 left-4 z-50 flex items-center gap-4">
        <button
          onClick={() => {
            setShowHome((prev) => !prev)
            setState((prev) => ({ ...prev, showInfo: false }))
          }}
          className="p-2 text-gray-600 hover:text-gray-900 transition-colors relative"
        >
          <Home className="w-6 h-6" />
          {stats.dailyCount > 0 && (
            <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {stats.dailyCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setState((prev) => ({ ...prev, showInfo: !prev.showInfo }))}
          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          {state.showInfo ? <X className="w-6 h-6" /> : <Info className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {showHome && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-white z-40 overflow-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-2xl mx-auto space-y-6 pt-12">
              <div className="text-center space-y-2">
                <h1 className="text-6xl font-bold text-red-500">{getDaysLeftInYear()}</h1>
                <p className="text-gray-600">dager igjen av året</p>
              </div>

              <div className="mt-8 pb-8 border-b">
                <h2 className="text-xl font-bold mb-6">Pomodoro-sekvens</h2>
                {renderPomodoroSequence()}
              </div>

              <div>
                <h2 className="text-xl font-bold mb-4">Dine tomater</h2>
                <div className="grid grid-cols-7 gap-2">
                  {stats.collectedDates.map((date) => (
                    <div key={date} className="aspect-square bg-red-50 rounded-lg p-2 flex items-center justify-center">
                      <Image
                        src={`https://v0.blob.com/${getRandomTomatoIcon()}.png`}
                        alt="Collected tomato"
                        width={100}
                        height={100}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h2 className="text-xl font-bold mb-4">Statistikk</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">I dag (så langt)</p>
                    <p className="text-2xl font-bold">{stats.dailyCount || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Totalt</p>
                    <p className="text-2xl font-bold">{stats.totalCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {state.showInfo && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-white z-40 overflow-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-2xl mx-auto space-y-6 pt-12">
              <h1 className="text-3xl font-bold mb-6">Pomodoro-teknikken</h1>

              <div className="space-y-4">
                <p>
                  Pomodoro-teknikken er ein tidshandteringsmetode utvikla av Francesco Cirillo på slutten av 1980-talet.
                  Den brukar ein tidtakar for å dela arbeidet inn i fokuserte 25-minutts intervall, med korte pausar
                  imellom.
                </p>
                <p>Denne teknikken er særleg effektiv for:</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Å betra fokus og konsentrasjon</li>
                  <li>Å handtera tid meir effektivt</li>
                  <li>Å redusera mental trøyttleik</li>
                  <li>Å dela arbeid inn i handterlege delar</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showHome && !state.showInfo && (
        <motion.div
          className="w-[80%] h-[80%] relative"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="wait">
            <motion.svg
              key={state.modeIndex}
              ref={svgRef}
              viewBox="0 0 120 120"
              className="w-full h-full cursor-pointer"
              preserveAspectRatio="xMidYMid meet"
              onMouseDown={handleDragStart}
              onMouseMove={(e) => {
                if (state.isDragging && svgRef.current) {
                  const svg = svgRef.current
                  const rect = svg.getBoundingClientRect()
                  const centerX = rect.width / 2
                  const centerY = rect.height / 2

                  const x = e.clientX - rect.left - centerX
                  const y = e.clientY - rect.top - centerY

                  let angle = Math.atan2(y, x) * (180 / Math.PI)
                  angle = (-angle + 90 + 360) % 360

                  const newTime = Math.round((angle / 360) * state.setTime)
                  setState((prev) => ({ ...prev, timeLeft: newTime }))
                }
              }}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={(e) => {
                if (state.isDragging && svgRef.current) {
                  const svg = svgRef.current
                  const rect = svg.getBoundingClientRect()
                  const centerX = rect.width / 2
                  const centerY = rect.height / 2

                  const x = e.touches[0].clientX - rect.left - centerX
                  const y = e.touches[0].clientY - rect.top - centerY

                  let angle = Math.atan2(y, x) * (180 / Math.PI)
                  angle = (-angle + 90 + 360) % 360

                  const newTime = Math.round((angle / 360) * state.setTime)
                  setState((prev) => ({ ...prev, timeLeft: newTime }))
                }
              }}
              onTouchEnd={handleDragEnd}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <defs>
                <filter id="inner-shadow">
                  <feOffset dx="0" dy="2" />
                  <feGaussianBlur stdDeviation="2" result="offset-blur" />
                  <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                  <feFlood floodColor="black" floodOpacity="0.2" result="color" />
                  <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                  <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                </filter>
              </defs>
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="white"
                stroke="#e5e7eb"
                strokeWidth="0.5"
                filter="url(#inner-shadow)"
              />

              <motion.path
                d={calculateArc()}
                fill="#E84C3D"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3 }}
                transform="translate(10 10)"
              />

              {[...Array(getNumberOfMarkers())].map((_, i) => {
                const isMainMarker = i % 5 === 0
                const angle = (i * (360 / getNumberOfMarkers()) - 90) * (Math.PI / 180)
                const x1 = 60 + (isMainMarker ? 38 : 41) * Math.cos(angle)
                const y1 = 60 + (isMainMarker ? 38 : 41) * Math.sin(angle)
                const x2 = 60 + 45 * Math.cos(angle)
                const y2 = 60 + 45 * Math.sin(angle)
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="black"
                    strokeWidth={isMainMarker ? "0.7" : "0.3"}
                  />
                )
              })}

              {[...Array(getNumberOfMarkers())].map((_, i) => {
                if (i % 2 !== 0 && state.setTime > 300) return null
                const angle = (i * (360 / getNumberOfMarkers()) - 90) * (Math.PI / 180)
                const x = 60 + 52 * Math.cos(angle)
                const y = 60 + 52 * Math.sin(angle)
                const value = getMarkerValue(i)
                return (
                  <text
                    key={i}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="3"
                    fontWeight="bold"
                    fontFamily="Geist Mono, monospace"
                    style={{ pointerEvents: "none" }}
                  >
                    {value}
                  </text>
                )
              })}

              <circle cx="60" cy="60" r="1" fill="black" />

              {!state.isRunning && state.timeLeft !== state.setTime && (
                <motion.circle
                  cx="60"
                  cy="60"
                  r="3"
                  fill="#E84C3D"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
            </motion.svg>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}

