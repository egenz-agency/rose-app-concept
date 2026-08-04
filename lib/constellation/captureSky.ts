"use client"

// Capturing the finished sky so it can leave the app — as a still, or as a short
// clip of the cinematic. Both read straight off the WebGL canvas.
//
// The canvas is created with `preserveDrawingBuffer: true` (see SceneRoot), which
// is what makes `toBlob` return pixels rather than an empty frame.

/**
 * The scene's canvas. Picks the largest one on the page rather than the first:
 * other canvases can and do exist in the document, and grabbing the wrong one
 * would silently produce a blank capture.
 */
function skyCanvas(): HTMLCanvasElement | null {
  const all = [...document.querySelectorAll("canvas")]
  if (all.length === 0) return null
  return all.reduce((best, c) => (c.width * c.height > best.width * best.height ? c : best))
}

/** Can this browser record the canvas at all? Safari lacked it for a long time. */
export function canRecord(): boolean {
  if (typeof window === "undefined") return false
  const c = document.createElement("canvas")
  return (
    typeof window.MediaRecorder !== "undefined" &&
    typeof (c as HTMLCanvasElement & { captureStream?: unknown }).captureStream === "function"
  )
}

/** The best container this browser will actually give us. */
function pickMimeType(): string | null {
  const candidates = [
    "video/mp4;codecs=avc1",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}

/**
 * Hand the file to the OS share sheet where there is one, and fall back to a
 * download everywhere else. Sharing a File needs `canShare` — asking without it
 * throws on desktop Safari.
 */
export async function deliver(blob: Blob, filename: string, title: string): Promise<"shared" | "saved"> {
  const file = new File([blob], filename, { type: blob.type })
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean
    share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>
  }

  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title, text: title })
      return "shared"
    } catch (err) {
      // A cancelled share sheet is not a failure — don't then force a download.
      if ((err as DOMException)?.name === "AbortError") return "shared"
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return "saved"
}

/** A still of exactly what is on screen right now. */
export function captureImage(): Promise<Blob | null> {
  const canvas = skyCanvas()
  if (!canvas) return Promise.resolve(null)
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"))
}

/**
 * Record the canvas for `durationMs`. The caller is responsible for making
 * something worth watching happen during that window.
 */
export function recordClip(durationMs: number): Promise<Blob | null> {
  const canvas = skyCanvas() as (HTMLCanvasElement & { captureStream(fps?: number): MediaStream }) | null
  if (!canvas || !canRecord()) return Promise.resolve(null)

  const mimeType = pickMimeType()
  if (!mimeType) return Promise.resolve(null)

  return new Promise((resolve) => {
    let recorder: MediaRecorder
    try {
      recorder = new MediaRecorder(canvas.captureStream(30), { mimeType, videoBitsPerSecond: 6_000_000 })
    } catch {
      resolve(null)
      return
    }

    const chunks: BlobPart[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    recorder.onstop = () => {
      resolve(chunks.length ? new Blob(chunks, { type: mimeType }) : null)
    }
    recorder.onerror = () => resolve(null)

    recorder.start()
    window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop()
    }, durationMs)
  })
}

/** `video/webm;codecs=vp9` → `webm`. */
export function extensionFor(blob: Blob): string {
  const base = blob.type.split(";")[0]
  if (base === "video/mp4") return "mp4"
  if (base === "video/webm") return "webm"
  if (base === "image/png") return "png"
  return "bin"
}
