"use client"
import {
  EffectComposer,
  Bloom,
  Vignette,
} from "@react-three/postprocessing"
import { BlendFunction } from "postprocessing"
import { useSceneStore } from "@/lib/store/sceneStore"

/**
 * Minimal, robust post chain. The previous version blacked out the whole
 * canvas: DepthOfField (with a near-zero focusDistance) collapsed the frame,
 * and without a ToneMapping pass the EffectComposer output was crushed dark.
 * We keep just Bloom + Vignette and apply ACES tone mapping inside the
 * composer so exposure matches the rest of the scene.
 */
export function PostProcessing() {
  const phase = useSceneStore((s) => s.phase)
  const rose = useSceneStore((s) => s.rose)

  const bloomIntensity =
    phase === "CARING" ? 1.2 :
    phase === "REVIVAL" ? 2.0 :
    phase === "FINAL_DEATH" ? 0.15 :
    rose?.isDead ? 0.25 :
    0.45

  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom
        intensity={bloomIntensity}
        luminanceThreshold={0.9}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <Vignette darkness={0.55} offset={0.3} blendFunction={BlendFunction.NORMAL} />
    </EffectComposer>
  )
}
