"use client";

import { useEffect, useRef, useState } from "react";
import { BUNDLE_PROGRESS_CAP } from "@/lib/bootLoadingProgress";

function loadingStageLabel(progress: number): string {
  if (progress < BUNDLE_PROGRESS_CAP) return "앱 준비 중…";
  if (progress < 45) return "3D 지구본 엔진 로드…";
  if (progress < 78) return "지도·데이터 받는 중…";
  if (progress < 95) return "레이어 연결 중…";
  return "거의 다 됐어요…";
}

const VERT = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/** 블랙 어스 · 야경(도시 불빛) · 우주 배경 */
const FRAG = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * snoise(p);
    p = p * 2.02 + vec3(1.7, 9.2, 3.4);
    a *= 0.5;
  }
  return v;
}

vec3 rotateY(vec3 p, float a) {
  float cs = cos(a);
  float sn = sin(a);
  return vec3(p.x * cs + p.z * sn, p.y, -p.x * sn + p.z * cs);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 spaceBackground(vec2 uv) {
  vec3 col = vec3(0.0, 0.0, 0.0);
  vec2 grid = floor(uv * vec2(640.0, 360.0));
  float star = hash21(grid);
  if (star > 0.9965) {
    float twinkle = 0.55 + 0.45 * sin(uTime * 2.4 + star * 40.0);
    col += vec3(0.85, 0.9, 1.0) * twinkle * smoothstep(0.9965, 0.999, star);
  }
  return col;
}

float landMask(vec3 n) {
  return smoothstep(0.06, 0.48, fbm(n * 3.35 + vec3(2.1, 0.0, 4.3)));
}

vec3 cityLights(vec3 n, float land) {
  float coarse = fbm(n * 5.5 + vec3(0.4, 1.2, 2.8));
  float fine = fbm(n * 14.0 + vec3(3.1, 0.7, 5.2));
  float density = smoothstep(0.38, 0.82, coarse * 0.65 + fine * 0.55);
  density *= land;
  density *= smoothstep(0.92, 0.35, abs(n.y));
  vec3 warm = vec3(1.0, 0.72, 0.32);
  vec3 cool = vec3(0.55, 0.78, 1.0);
  return mix(warm, cool, fine * 0.35) * density * 1.35;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / min(uResolution.x, uResolution.y);
  vec3 col = spaceBackground(uv);

  vec3 ro = vec3(uv * 1.12, 3.85);
  vec3 rd = normalize(vec3(uv, -1.32));
  float spin = uTime * 0.11;

  float b = dot(ro, rd);
  float c = dot(ro, ro) - 1.0;
  float disc = b * b - c;

  if (disc >= 0.0) {
    float tHit = -b - sqrt(disc);
    if (tHit > 0.0) {
      vec3 p = ro + rd * tHit;
      vec3 n = normalize(rotateY(p, spin));
      vec3 lightDir = normalize(vec3(-0.42, 0.18, 0.88));
      float ndl = dot(n, lightDir);
      float night = smoothstep(0.22, -0.42, ndl);
      float twilight = smoothstep(0.35, -0.05, ndl) * (1.0 - night);

      float land = landMask(n);
      vec3 ocean = vec3(0.012, 0.022, 0.045);
      vec3 terrain = vec3(0.025, 0.032, 0.028);
      vec3 polar = vec3(0.08, 0.09, 0.11);
      float polarW = smoothstep(0.8, 0.94, abs(n.y));
      vec3 surface = mix(ocean, terrain, land * 0.92);
      surface = mix(surface, polar, polarW * 0.65);

      vec3 lights = cityLights(n, land) * (night + twilight * 0.35);
      float dayGlow = clamp(ndl, 0.0, 1.0);
      vec3 daySide = surface * (0.04 + dayGlow * 0.12);
      vec3 nightSide = surface * 0.025 + lights;

      col = mix(daySide, nightSide, smoothstep(0.08, -0.12, ndl));

      float rim = pow(1.0 - max(dot(n, -rd), 0.0), 2.8);
      col += vec3(0.15, 0.38, 0.72) * rim * 0.42;
      col += vec3(0.45, 0.62, 0.95) * rim * rim * 0.18;

      float spec = pow(clamp(dot(reflect(-lightDir, n), -rd), 0.0, 1.0), 24.0);
      col += vec3(0.7, 0.82, 1.0) * spec * 0.08 * (0.3 + dayGlow);
    }
  }

  col = pow(col, vec3(1.05));
  gl_FragColor = vec4(col, 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader create failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!program) throw new Error("program create failed");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown";
    throw new Error(log);
  }
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return program;
}

type GlobeLoadingScreenProps = {
  progress: number;
  fading?: boolean;
};

export function GlobeLoadingScreen({ progress, fading = false }: GlobeLoadingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(progress);
  const displayRef = useRef(progress);
  const [displayProgress, setDisplayProgress] = useState(progress);
  progressRef.current = progress;

  useEffect(() => {
    let raf = 0;
    const smooth = () => {
      const target = progressRef.current;
      const current = displayRef.current;
      const next = current + (target - current) * 0.12;
      displayRef.current = Math.abs(target - next) < 0.2 ? target : next;
      setDisplayProgress(displayRef.current);
      raf = requestAnimationFrame(smooth);
    };
    raf = requestAnimationFrame(smooth);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
    });
    if (!gl) return;

    let program: WebGLProgram;
    try {
      program = createProgram(gl);
    } catch {
      return;
    }

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW,
    );

    const aPos = gl.getAttribLocation(program, "aPos");
    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");

    let raf = 0;
    const start = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      const t = (now - start) * 0.001;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
    };
  }, []);

  const clamped = Math.min(100, Math.max(0, Math.round(displayProgress)));
  const stage = loadingStageLabel(clamped);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black transition-opacity duration-700 ease-out"
      style={{
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "auto",
      }}
      aria-live="polite"
      aria-busy={!fading}
      aria-label={`로딩 중, ${clamped}퍼센트`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      <div className="pointer-events-none relative z-10 flex flex-col items-center px-4">
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: "min(58vw, 19rem)",
            height: "min(58vw, 19rem)",
          }}
        >
          <div
            className="absolute inset-[6%] rounded-full border border-white/10 shadow-[inset_0_0_48px_rgba(80,140,220,0.12),0_0_60px_rgba(20,60,120,0.35)]"
            aria-hidden
          />
          <div className="relative flex flex-col items-center justify-center text-center">
            <span
              className="font-mono text-6xl font-extrabold tabular-nums tracking-tight text-white sm:text-7xl"
              style={{
                textShadow:
                  "0 0 32px rgba(120,180,255,0.35), 0 2px 12px rgba(0,0,0,0.85), 0 0 1px rgba(255,255,255,0.9)",
              }}
            >
              {clamped}
              <span className="ml-1 text-3xl font-bold text-white/90 sm:text-4xl">%</span>
            </span>
          </div>
        </div>

        <p
          className="mt-10 max-w-xs text-center text-lg font-bold tracking-[0.12em] text-white sm:text-xl"
          style={{
            textShadow: "0 2px 16px rgba(0,0,0,0.9), 0 0 24px rgba(100,160,255,0.2)",
          }}
        >
          {stage}
        </p>
        <p
          className="mt-3 text-sm font-semibold tracking-wide text-slate-300 sm:text-base"
          style={{ textShadow: "0 1px 8px rgba(0,0,0,0.85)" }}
        >
          잠시만 기다려 주세요
        </p>
      </div>
    </div>
  );
}
