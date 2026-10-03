"use client";

import { Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useMemo, useRef } from "react";
import styles from "@/shared/ui/Topography.module.css";

const colorModes = ["elevation", "uniform", "alternating"] as const;

type TopographyColorMode = (typeof colorModes)[number];

type TopographyProps = Readonly<{
  lowColor?: string;
  midColor?: string;
  highColor?: string;
  lightMode?: boolean;
  speed?: number;
  morphAmount?: number;
  morphSpeed?: number;
  bands?: number;
  thickness?: number;
  scale?: number;
  pixelSize?: number;
  glow?: number;
  colorMode?: TopographyColorMode;
  contrast?: number;
  brightness?: number;
  fillBands?: boolean;
  opacity?: number;
  grain?: boolean;
  grainIntensity?: number;
  mouseInteraction?: boolean;
  mouseRadius?: number;
  mouseStrength?: number;
  className?: string;
}>;

type Uniform = { value: Float32Array | number };

type TopographyUniforms = {
  iResolution: Uniform;
  iTime: Uniform;
  uBands: Uniform;
  uBrightness: Uniform;
  uColorMode: Uniform;
  uContrast: Uniform;
  uCtrlA: Uniform;
  uCtrlB: Uniform;
  uCtrlC: Uniform;
  uCtrlD: Uniform;
  uFillBands: Uniform;
  uGlow: Uniform;
  uGrain: Uniform;
  uGrainIntensity: Uniform;
  uHigh: Uniform;
  uLightMode: Uniform;
  uLow: Uniform;
  uMid: Uniform;
  uMorphAmount: Uniform;
  uMorphSpeed: Uniform;
  uMouse: Uniform;
  uMouseActive: Uniform;
  uMouseEnabled: Uniform;
  uMouseRadius: Uniform;
  uMouseStrength: Uniform;
  uOpacity: Uniform;
  uPixelSize: Uniform;
  uScale: Uniform;
  uSpeed: Uniform;
  uThickness: Uniform;
};

type TopographyContext = {
  uniforms: TopographyUniforms;
};

const defaultProps: Required<Omit<TopographyProps, "className">> = {
  lowColor: "#0B3A70",
  midColor: "#238DCA",
  highColor: "#6bb8d5",
  lightMode: false,
  speed: 0.12,
  morphAmount: 1.2,
  morphSpeed: 0.05,
  bands: 1.4,
  thickness: 0.058,
  scale: 1.05,
  pixelSize: 1,
  glow: 0.14,
  colorMode: "elevation",
  contrast: 1.55,
  brightness: 1.04,
  fillBands: false,
  opacity: 0.34,
  grain: false,
  grainIntensity: 0,
  mouseInteraction: false,
  mouseRadius: 0.3,
  mouseStrength: 0.4
};

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uMorphAmount;
uniform float uBands;
uniform float uThickness;
uniform float uScale;
uniform float uPixelSize;
uniform float uGlow;
uniform float uColorMode;
uniform float uContrast;
uniform float uBrightness;
uniform float uFillBands;
uniform float uOpacity;
uniform float uLightMode;
uniform vec3 uLow;
uniform vec3 uMid;
uniform vec3 uHigh;
uniform vec2 uMouse;
uniform float uMouseEnabled;
uniform float uMouseRadius;
uniform float uMouseStrength;
uniform float uMouseActive;
uniform float uGrain;
uniform float uGrainIntensity;
uniform vec4 uCtrlA;
uniform vec4 uCtrlB;
uniform vec4 uCtrlC;
uniform vec4 uCtrlD;
out vec4 fragColor;

float bez(float t, vec4 c) {
  float w = 6.2831853 * t;
  return 0.5 * (c.x * sin(w) + c.y * cos(w) + c.z * sin(2.0 * w) + c.w * cos(2.0 * w));
}

float field(vec2 uv) {
  vec2 a = vec2(bez(uv.x, uCtrlA), bez(uv.x, uCtrlB));
  vec2 b = vec2(bez(uv.y, uCtrlC), bez(uv.y, uCtrlD));
  return distance(a, b);
}

vec3 elevationColor(float elevation) {
  vec3 color = mix(uLow, uMid, smoothstep(0.0, 0.5, elevation));
  return mix(color, uHigh, smoothstep(0.5, 1.0, elevation));
}

void main() {
  vec2 resolution = iResolution.xy;
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 scaledUv = (uv - 0.5) / max(uScale, 0.001) + 0.5;
  vec2 sampleUv = scaledUv;

  if (uPixelSize > 1.0) {
    vec2 pixels = resolution / uPixelSize;
    sampleUv = (floor(scaledUv * pixels) + 0.5) / pixels;
  }

  float fieldValue = field(sampleUv);
  if (uMouseEnabled > 0.5) {
    vec2 distanceFromMouse = uv - uMouse;
    distanceFromMouse.x *= resolution.x / max(resolution.y, 1.0);
    float radius = max(uMouseRadius, 0.001);
    fieldValue += exp(-dot(distanceFromMouse, distanceFromMouse) / (radius * radius)) * uMouseStrength * uMouseActive;
  }

  float contour = fieldValue * uBands;
  float contourFraction = fract(contour);
  float lineDistance = min(contourFraction, 1.0 - contourFraction);
  float antialias = fwidth(contour) + 0.0001;
  float lineMask = 1.0 - smoothstep(uThickness - antialias, uThickness + antialias, lineDistance);
  float glowRadius = uThickness + uGlow * 0.5 + antialias;
  float glowMask = (1.0 - smoothstep(uThickness, glowRadius, lineDistance)) * step(0.0001, uGlow);
  float elevation = clamp(fieldValue / (uMorphAmount * 2.5 + 0.001), 0.0, 1.0);

  vec3 lineColor = uColorMode < 0.5
    ? elevationColor(elevation)
    : uColorMode < 1.5
      ? uMid
      : mix(uMid, uHigh, mod(floor(contour), 2.0));

  float coverage = pow(clamp(lineMask + glowMask * 0.28, 0.0, 1.0), max(uContrast, 0.001));
  vec3 outputColor = lineColor;
  float outputAlpha = coverage;

  if (uFillBands > 0.5) {
    outputColor = mix(elevationColor(elevation), lineColor, coverage);
    outputAlpha = clamp(coverage + 0.1 * elevation, 0.0, 1.0);
  }

  if (uGrain > 0.5) {
    float noise = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233)) + iTime) * 43758.5453);
    outputAlpha += (noise - 0.5) * uGrainIntensity;
  }

  outputColor = clamp(outputColor * uBrightness, 0.0, 1.0);
  float alpha = clamp(outputAlpha, 0.0, 1.0) * uOpacity;
  if (uLightMode > 0.5) {
    float peak = max(outputColor.r, max(outputColor.g, outputColor.b));
    vec3 chroma = pow(clamp(outputColor / max(peak, 0.0001), 0.0, 1.0), vec3(1.18));
    fragColor = vec4(mix(vec3(1.0), chroma, alpha * 0.94), 1.0);
  } else {
    fragColor = vec4(outputColor * alpha, alpha);
  }
}`;

const controlIndices = [
  [1, -2, 3, -4],
  [9, -8, 7, -6],
  [5, 2, 5, -5],
  [-1, -3, 8, 9]
] as const;

function hexToRgb(color: string): Float32Array {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/iu.exec(color);
  const redValue = match?.[1];
  const greenValue = match?.[2];
  const blueValue = match?.[3];
  if (!redValue || !greenValue || !blueValue) return new Float32Array([1, 1, 1]);

  const red = Number.parseInt(redValue, 16) / 255;
  const green = Number.parseInt(greenValue, 16) / 255;
  const blue = Number.parseInt(blueValue, 16) / 255;
  return new Float32Array([red, green, blue]);
}

function colorModeToFloat(mode: TopographyColorMode): number {
  if (mode === "uniform") return 1;
  if (mode === "alternating") return 2;
  return 0;
}

function numberUniform(value: number): Uniform {
  return { value };
}

function vectorUniform(values: number[]): Uniform {
  return { value: new Float32Array(values) };
}

function setTopographyUniforms(uniforms: TopographyUniforms, props: Required<Omit<TopographyProps, "className">>): void {
  uniforms.uSpeed.value = props.speed;
  uniforms.uMorphAmount.value = props.morphAmount;
  uniforms.uMorphSpeed.value = props.morphSpeed;
  uniforms.uBands.value = props.bands;
  uniforms.uThickness.value = props.thickness;
  uniforms.uScale.value = props.scale;
  uniforms.uPixelSize.value = props.pixelSize;
  uniforms.uGlow.value = props.glow;
  uniforms.uColorMode.value = colorModeToFloat(props.colorMode);
  uniforms.uContrast.value = props.contrast;
  uniforms.uBrightness.value = props.brightness;
  uniforms.uFillBands.value = props.fillBands ? 1 : 0;
  uniforms.uOpacity.value = props.opacity;
  uniforms.uGrain.value = props.grain ? 1 : 0;
  uniforms.uGrainIntensity.value = props.grainIntensity;
  uniforms.uLow.value = hexToRgb(props.lowColor);
  uniforms.uMid.value = hexToRgb(props.midColor);
  uniforms.uHigh.value = hexToRgb(props.highColor);
  uniforms.uLightMode.value = props.lightMode ? 1 : 0;
  uniforms.uMouseEnabled.value = props.mouseInteraction ? 1 : 0;
  uniforms.uMouseRadius.value = props.mouseRadius;
  uniforms.uMouseStrength.value = props.mouseStrength;
}

export function Topography({ className, ...props }: TopographyProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<TopographyContext | null>(null);
  const resolvedProps = useMemo<Required<Omit<TopographyProps, "className">>>(() => ({
    lowColor: props.lowColor ?? defaultProps.lowColor,
    midColor: props.midColor ?? defaultProps.midColor,
    highColor: props.highColor ?? defaultProps.highColor,
    lightMode: props.lightMode ?? defaultProps.lightMode,
    speed: props.speed ?? defaultProps.speed,
    morphAmount: props.morphAmount ?? defaultProps.morphAmount,
    morphSpeed: props.morphSpeed ?? defaultProps.morphSpeed,
    bands: props.bands ?? defaultProps.bands,
    thickness: props.thickness ?? defaultProps.thickness,
    scale: props.scale ?? defaultProps.scale,
    pixelSize: props.pixelSize ?? defaultProps.pixelSize,
    glow: props.glow ?? defaultProps.glow,
    colorMode: props.colorMode ?? defaultProps.colorMode,
    contrast: props.contrast ?? defaultProps.contrast,
    brightness: props.brightness ?? defaultProps.brightness,
    fillBands: props.fillBands ?? defaultProps.fillBands,
    opacity: props.opacity ?? defaultProps.opacity,
    grain: props.grain ?? defaultProps.grain,
    grainIntensity: props.grainIntensity ?? defaultProps.grainIntensity,
    mouseInteraction: props.mouseInteraction ?? defaultProps.mouseInteraction,
    mouseRadius: props.mouseRadius ?? defaultProps.mouseRadius,
    mouseStrength: props.mouseStrength ?? defaultProps.mouseStrength
  }), [
    props.bands,
    props.brightness,
    props.colorMode,
    props.contrast,
    props.fillBands,
    props.glow,
    props.grain,
    props.grainIntensity,
    props.highColor,
    props.lightMode,
    props.lowColor,
    props.midColor,
    props.morphAmount,
    props.morphSpeed,
    props.mouseInteraction,
    props.mouseRadius,
    props.mouseStrength,
    props.opacity,
    props.pixelSize,
    props.scale,
    props.speed,
    props.thickness
  ]);
  const resolvedPropsRef = useRef(resolvedProps);
  resolvedPropsRef.current = resolvedProps;

  useEffect(() => {
    const context = contextRef.current;
    if (context) setTopographyUniforms(context.uniforms, resolvedProps);
  }, [resolvedProps]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const initialProps = resolvedPropsRef.current;

    const renderer = new Renderer({
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      premultipliedAlpha: true,
      webgl: 2
    });
    const gl = renderer.gl;
    const canvas = gl.canvas;
    canvas.setAttribute("aria-hidden", "true");
    canvas.tabIndex = -1;
    container.appendChild(canvas);
    gl.clearColor(0, 0, 0, 0);

    const uniforms: TopographyUniforms = {
      iResolution: vectorUniform([1, 1]),
      iTime: numberUniform(0),
      uBands: numberUniform(defaultProps.bands),
      uBrightness: numberUniform(defaultProps.brightness),
      uColorMode: numberUniform(colorModeToFloat(defaultProps.colorMode)),
      uContrast: numberUniform(defaultProps.contrast),
      uCtrlA: vectorUniform([0, 0, 0, 0]),
      uCtrlB: vectorUniform([0, 0, 0, 0]),
      uCtrlC: vectorUniform([0, 0, 0, 0]),
      uCtrlD: vectorUniform([0, 0, 0, 0]),
      uFillBands: numberUniform(0),
      uGlow: numberUniform(defaultProps.glow),
      uGrain: numberUniform(0),
      uGrainIntensity: numberUniform(0),
      uHigh: vectorUniform([1, 1, 1]),
      uLightMode: numberUniform(0),
      uLow: vectorUniform([1, 1, 1]),
      uMid: vectorUniform([1, 1, 1]),
      uMorphAmount: numberUniform(defaultProps.morphAmount),
      uMorphSpeed: numberUniform(defaultProps.morphSpeed),
      uMouse: vectorUniform([0.5, 0.5]),
      uMouseActive: numberUniform(0),
      uMouseEnabled: numberUniform(0),
      uMouseRadius: numberUniform(defaultProps.mouseRadius),
      uMouseStrength: numberUniform(defaultProps.mouseStrength),
      uOpacity: numberUniform(defaultProps.opacity),
      uPixelSize: numberUniform(defaultProps.pixelSize),
      uScale: numberUniform(defaultProps.scale),
      uSpeed: numberUniform(defaultProps.speed),
      uThickness: numberUniform(defaultProps.thickness)
    };
    setTopographyUniforms(uniforms, initialProps);

    const program = new Program(gl, { fragment, uniforms, vertex });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    contextRef.current = { uniforms };

    const controlArrays = [uniforms.uCtrlA, uniforms.uCtrlB, uniforms.uCtrlC, uniforms.uCtrlD].map((uniform) => {
      if (!(uniform.value instanceof Float32Array)) throw new Error("Topography control uniforms must be vectors.");
      return uniform.value;
    });
    let currentMouseX = 0.5;
    let currentMouseY = 0.5;
    let targetMouseX = 0.5;
    let targetMouseY = 0.5;
    let mouseActive = 0;
    let mouseActiveTarget = 0;
    let animationFrame = 0;
    let isInViewport = true;
    let isPageVisible = !document.hidden;
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = performance.now();

    const render = (time: number) => {
      const elapsed = (time - startedAt) * 0.001;
      uniforms.iTime.value = elapsed;
      const morphAmount = uniforms.uMorphAmount.value;
      const speed = uniforms.uSpeed.value;
      const morphSpeed = uniforms.uMorphSpeed.value;
      if (typeof morphAmount !== "number" || typeof speed !== "number" || typeof morphSpeed !== "number") return;

      controlArrays.forEach((control, groupIndex) => {
        const indices = controlIndices[groupIndex];
        if (!indices) return;
        indices.forEach((index, valueIndex) => {
          control[valueIndex] = morphAmount * Math.sin(elapsed * speed * Math.sin(index * morphSpeed) + index);
        });
      });

      if (!reducedMotion) {
        currentMouseX += 0.05 * (targetMouseX - currentMouseX);
        currentMouseY += 0.05 * (targetMouseY - currentMouseY);
        uniforms.uMouse.value = new Float32Array([currentMouseX, currentMouseY]);
        mouseActive += 0.05 * (mouseActiveTarget - mouseActive);
        uniforms.uMouseActive.value = mouseActive;
      }

      renderer.render({ scene: mesh });
    };

    const stop = () => {
      if (animationFrame !== 0) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };
    const start = () => {
      if (reducedMotion || !isInViewport || !isPageVisible || animationFrame !== 0) return;
      animationFrame = requestAnimationFrame(function frame(time) {
        render(time);
        animationFrame = requestAnimationFrame(frame);
      });
    };
    const renderStaticFrame = () => {
      uniforms.uMouseEnabled.value = 0;
      uniforms.uMouseActive.value = 0;
      render(startedAt);
    };
    const resize = () => {
      const { height, width } = container.getBoundingClientRect();
      renderer.setSize(Math.max(1, Math.floor(width)), Math.max(1, Math.floor(height)));
      const resolution = uniforms.iResolution.value;
      if (resolution instanceof Float32Array) {
        resolution[0] = gl.drawingBufferWidth;
        resolution[1] = gl.drawingBufferHeight;
      }
      renderStaticFrame();
    };
    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotion || !resolvedPropsRef.current.mouseInteraction) return;
      const bounds = canvas.getBoundingClientRect();
      targetMouseX = (event.clientX - bounds.left) / bounds.width;
      targetMouseY = 1 - (event.clientY - bounds.top) / bounds.height;
      mouseActiveTarget = 1;
    };
    const onPointerLeave = () => {
      mouseActiveTarget = 0;
    };
    const onVisibilityChange = () => {
      isPageVisible = !document.hidden;
      if (isPageVisible) start(); else stop();
    };
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      if (reducedMotion) {
        stop();
        renderStaticFrame();
      } else {
        start();
      }
    };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isInViewport = entry?.isIntersecting ?? false;
      if (isInViewport) start(); else stop();
    });

    resizeObserver.observe(container);
    intersectionObserver.observe(container);
    document.addEventListener("visibilitychange", onVisibilityChange);
    motionQuery.addEventListener("change", onMotionPreferenceChange);
    if (initialProps.mouseInteraction) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave);
    }
    resize();
    if (reducedMotion) renderStaticFrame(); else start();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      motionQuery.removeEventListener("change", onMotionPreferenceChange);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      contextRef.current = null;
      program.remove();
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div aria-hidden="true" className={[styles.container, className].filter(Boolean).join(" ")} ref={containerRef} />;
}
