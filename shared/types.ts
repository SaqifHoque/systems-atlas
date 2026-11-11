export type Track = 'Foundations' | 'Performance' | 'Reliability' | 'Consistency'
export interface Lesson {
  id: string
  title: string
  subtitle: string
  level: string
  track: Track
  minutes: number
  prerequisites: string[]
  lab: 'request' | 'shortener' | 'notifications' | 'payment' | 'regions'
  icon: string
  x: number
  y: number
  learn: string[]
  story: string
  trace: string
  tradeoff: string
  question: string
  options: string[]
  answer: number
  explanation: string
  source: { title: string; url: string }
  reason: string
}
export type LessonStatus = 'available' | 'in-progress' | 'completed' | 'recommended' | 'preview'
export interface Progress { version: 1; started: string[]; completed: string[] }
