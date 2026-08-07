// group-violations.ts - works with the raw API Violation shape (not the shared/types frontend shape)

export interface RawViolation {
  id:             string
  violation_code: string
  track_id:       number
  camera_id:      string
  shift:          string
  status:         'pending' | 'confirmed' | 'rejected'
  rejected_by?:   string | null
  rejected_at?:   string | null
  reject_reason?: string | null
  missing_helm:   boolean
  missing_vest:   boolean
  missing_shoes:  boolean
  helm_color_detected?: string
  frame_key?:     string | null
  frame_path?:    string | null
  links?:         { personnel_id: string; personnel?: { full_name: string } }[]
  detected_at:    string
  created_at?:    string
}

export interface ViolationBatch {
  key:        string
  camera_id:  string
  start_time: string
  end_time:   string
  violations: RawViolation[]
}

const BATCH_GAP_MS = 120_000  // 2 minutes

/**
 * Group violations by camera_id + time proximity.
 * Violations within 2 minutes of each other on the same camera form a batch.
 */
export function groupViolationsByBatch(violations: RawViolation[]): ViolationBatch[] {
  if (!violations.length) return []

  // Group by camera first
  const byCamera = new Map<string, RawViolation[]>()
  for (const v of violations) {
    const cam = v.camera_id
    if (!byCamera.has(cam)) byCamera.set(cam, [])
    byCamera.get(cam)!.push(v)
  }

  const batches: ViolationBatch[] = []

  for (const [cameraId, cameraViolations] of byCamera) {
    // Sort by detected_at ascending
    const sorted = [...cameraViolations].sort(
      (a, b) => new Date(a.detected_at).getTime() - new Date(b.detected_at).getTime()
    )

    let currentBatch: RawViolation[] = [sorted[0]]
    let batchStartMs = new Date(sorted[0].detected_at).getTime()

    for (let i = 1; i < sorted.length; i++) {
      const prevMs = new Date(sorted[i - 1].detected_at).getTime()
      const currMs = new Date(sorted[i].detected_at).getTime()

      if (currMs - prevMs <= BATCH_GAP_MS) {
        currentBatch.push(sorted[i])
      } else {
        batches.push(makeBatch(cameraId, currentBatch))
        currentBatch  = [sorted[i]]
        batchStartMs  = currMs
      }
    }

    if (currentBatch.length > 0) {
      batches.push(makeBatch(cameraId, currentBatch))
    }
  }

  // Sort batches descending by start_time
  batches.sort((a, b) => b.start_time.localeCompare(a.start_time))

  return batches
}

function makeBatch(cameraId: string, violations: RawViolation[]): ViolationBatch {
  const startIso = violations[0].detected_at
  const endIso   = violations[violations.length - 1].detected_at
  return {
    key:        `${cameraId}-${startIso}-${violations[0]?.violation_code ?? ''}`,
    camera_id:  cameraId,
    start_time: startIso,
    end_time:   endIso,
    violations: [...violations],
  }
}

export function formatBatchTime(startIso: string, endIso: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const s = fmt(startIso)
  const e = fmt(endIso)
  return s === e ? s : `${s} – ${e}`
}
