"use client";

/* Thin typed entries over the vendored, SHA-verified ThreeUI sources.
   The authored files under src/vendor/threeui are byte-identical to the
   registered bundles; only these entry wrappers are ours. */
import "../../vendor/threeui/src/shaders/threeui.css";

export { SelectedButtonStudies } from "../../vendor/threeui/src/shaders/shader-buttons/SelectedButtonStudies";
export type { SelectedButtonStudyVariant } from "../../vendor/threeui/src/shaders/shader-buttons/SelectedButtonStudies";

export { RectangleButtons } from "../../vendor/threeui/src/shaders/rectangle-buttons/RectangleButtons";
export type { RectangleButtonVariant } from "../../vendor/threeui/src/shaders/rectangle-buttons/RectangleButtons";

export { LiquidMetalButton } from "../../vendor/threeui/src/shaders/liquid-metal-button/LiquidMetalButton";
export type { LiquidMetalButtonVariant } from "../../vendor/threeui/src/shaders/liquid-metal-button/LiquidMetalButton";
