import * as THREE from "three"

// Canvas-drawn sprite textures. Generated once and shared by every star, so a
// 60-star constellation costs one texture upload rather than sixty.

let glowTexture: THREE.Texture | null = null
let flareTexture: THREE.Texture | null = null

/** A soft round falloff — the bloom halo that makes a star feel like light. */
export function getGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture

  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")!

  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  // A tight white core bleeding into a long, very faint skirt. The long tail is
  // what reads as atmosphere rather than a sticker.
  g.addColorStop(0.0, "rgba(255,255,255,1)")
  g.addColorStop(0.12, "rgba(255,250,235,0.85)")
  g.addColorStop(0.28, "rgba(255,230,180,0.32)")
  g.addColorStop(0.55, "rgba(255,210,150,0.09)")
  g.addColorStop(1.0, "rgba(255,200,140,0)")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  glowTexture = new THREE.CanvasTexture(canvas)
  glowTexture.colorSpace = THREE.SRGBColorSpace
  return glowTexture
}

/** A four-point diffraction flare, for the brightest stars only. */
export function getFlareTexture(): THREE.Texture {
  if (flareTexture) return flareTexture

  const size = 128
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")!
  const c = size / 2

  const spike = (w: number, h: number) => {
    const g = ctx.createLinearGradient(c - w, 0, c + w, 0)
    g.addColorStop(0, "rgba(255,240,210,0)")
    g.addColorStop(0.5, "rgba(255,248,232,0.55)")
    g.addColorStop(1, "rgba(255,240,210,0)")
    ctx.fillStyle = g
    ctx.fillRect(c - w, c - h, w * 2, h * 2)
  }

  spike(c, 1.1) // horizontal
  ctx.save()
  ctx.translate(c, c)
  ctx.rotate(Math.PI / 2)
  ctx.translate(-c, -c)
  spike(c, 1.1) // vertical
  ctx.restore()

  flareTexture = new THREE.CanvasTexture(canvas)
  flareTexture.colorSpace = THREE.SRGBColorSpace
  return flareTexture
}
