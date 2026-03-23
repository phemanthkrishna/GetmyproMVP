import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export const MILESTONES = [
  { job: 1,  bonus: 50,  badge: 'First Fix',    icon: '🔧', color: '#10B981', desc: 'First job done!' },
  { job: 5,  bonus: 100, badge: 'Live Wire',    icon: '⚡', color: '#3B82F6', desc: '5 jobs strong!' },
  { job: 10, bonus: 150, badge: 'Pro Worker',   icon: '🏅', color: '#F59E0B', desc: 'Double digits!' },
  { job: 20, bonus: 200, badge: 'Top Pro',      icon: '🌟', color: '#F47820', desc: 'Top of the platform!' },
  { job: 30, bonus: 300, badge: 'Elite',        icon: '🔥', color: '#EF4444', desc: 'Elite worker!' },
  { job: 40, bonus: 500, badge: 'Local Legend', icon: '👑', color: '#8B5CF6', desc: "Bobbili's best!" },
] as const

export type Milestone = typeof MILESTONES[number]
export type MilestoneRecord = { job: number; earnedAt: string }
export type MilestoneStatus = 'completed' | 'active' | 'locked'

export interface WorkerProgress {
  completedJobs: number
  currentBadge: Milestone | null
  nextMilestone: Milestone | null
  progressToNext: number          // 0–100 %
  earnedBonuses: number
  pendingBonuses: number
  milestoneStatuses: MilestoneStatus[]
  completedMilestonesData: MilestoneRecord[]
  justUnlocked: Milestone | null
  clearJustUnlocked: () => void
}

export function useWorkerProgress(workerId: string): WorkerProgress {
  const [completedJobs, setCompletedJobs] = useState(0)
  const [completedMilestonesData, setCompletedMilestonesData] = useState<MilestoneRecord[]>([])
  const [justUnlocked, setJustUnlocked] = useState<Milestone | null>(null)
  const initialisedRef = useRef(false)

  useEffect(() => {
    if (!workerId) return

    loadData()

    const channel = supabase
      .channel(`worker-progress-${workerId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        async (payload) => {
          const n = payload.new as Record<string, unknown>
          const o = payload.old as Record<string, unknown>
          if (
            n.worker_id === workerId &&
            n.status === 'completed' &&
            o?.status !== 'completed'
          ) {
            const newCount = await fetchCount()
            const hit = MILESTONES.find((m) => m.job === newCount)
            if (hit) {
              const key = `badge_shown_${workerId}_${hit.job}`
              if (!localStorage.getItem(key)) {
                setJustUnlocked(hit)
                saveMilestone(hit)
              }
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId])

  async function loadData() {
    if (initialisedRef.current) return
    initialisedRef.current = true

    const [countRes, workerRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('worker_id', workerId)
        .eq('status', 'completed'),
      supabase
        .from('workers')
        .select('completed_milestones')
        .eq('id', workerId)
        .single(),
    ])

    const n = countRes.count ?? 0
    setCompletedJobs(n)
    const records = (workerRes.data?.completed_milestones as MilestoneRecord[]) ?? []
    setCompletedMilestonesData(records)
  }

  async function fetchCount(): Promise<number> {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', workerId)
      .eq('status', 'completed')
    const n = count ?? 0
    setCompletedJobs(n)
    return n
  }

  async function saveMilestone(milestone: Milestone) {
    const earnedAt = new Date().toISOString()
    const { data } = await supabase
      .from('workers')
      .select('completed_milestones')
      .eq('id', workerId)
      .single()
    const current = (data?.completed_milestones as MilestoneRecord[]) ?? []
    if (!current.find((m) => m.job === milestone.job)) {
      const updated = [...current, { job: milestone.job, earnedAt }]
      await supabase
        .from('workers')
        .update({ completed_milestones: updated })
        .eq('id', workerId)
      setCompletedMilestonesData(updated)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const completedList = MILESTONES.filter((m) => m.job <= completedJobs)
  const currentBadge = completedList[completedList.length - 1] ?? null
  const nextMilestone = (MILESTONES.find((m) => m.job > completedJobs) ?? null) as Milestone | null

  let progressToNext = 100
  if (nextMilestone) {
    const prevJob = currentBadge?.job ?? 0
    progressToNext = Math.round(
      ((completedJobs - prevJob) / (nextMilestone.job - prevJob)) * 100
    )
  }

  const earnedBonuses = completedList.reduce((s, m) => s + m.bonus, 0)
  const pendingBonuses = MILESTONES.filter((m) => m.job > completedJobs).reduce(
    (s, m) => s + m.bonus,
    0
  )

  const milestoneStatuses: MilestoneStatus[] = MILESTONES.map((m) => {
    if (m.job <= completedJobs) return 'completed'
    if (m === nextMilestone)    return 'active'
    return 'locked'
  })

  function clearJustUnlocked() {
    if (justUnlocked) {
      localStorage.setItem(`badge_shown_${workerId}_${justUnlocked.job}`, '1')
    }
    setJustUnlocked(null)
  }

  return {
    completedJobs,
    currentBadge,
    nextMilestone,
    progressToNext,
    earnedBonuses,
    pendingBonuses,
    milestoneStatuses,
    completedMilestonesData,
    justUnlocked,
    clearJustUnlocked,
  }
}
