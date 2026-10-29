"use client";
// "Light Through the Stencil": a laser-cut sheet floats over a wall; a spotlight projects
// the cut pattern as light/shadow, a roller sweeps paint through it, then the sheet peels
// away revealing the painted pattern. Any product SVG becomes the mask — no model files.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type HeroMode = "auto" | "peel" | "layers";

const SHEET = 3.4;

function svgMask(svg: string, keepLayer: number | null, size = 1024): Promise<HTMLCanvasElement> {
  // Paint target layer white on black. Other layers hidden via CSS custom properties.
  const vars = [1, 2, 3, 4].map((n) => `--l${n}:${keepLayer === null || keepLayer === n ? "#fff" : "rgba(0,0,0,0)"}`).join(";");
  const s = svg.replace("<svg ", `<svg width="${size}" height="${size}" style="${vars};color:#fff" `);
  return new Promise((resolve) => {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);
    const img = new Image();
    img.onload = () => {
      const pad = size * 0.08;
      ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
      resolve(c);
    };
    img.onerror = () => resolve(c);
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  });
}

function invert(c: HTMLCanvasElement) {
  const o = document.createElement("canvas");
  o.width = c.width;
  o.height = c.height;
  const ctx = o.getContext("2d")!;
  ctx.drawImage(c, 0, 0);
  ctx.globalCompositeOperation = "difference";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, o.width, o.height);
  return o;
}

const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a));

function Stage({ svg, layers, paint, wall, mode, scrollRef }: { svg: string; layers: number; paint: string; wall: string; mode: HeroMode; scrollRef: React.MutableRefObject<number> }) {
  const { gl } = useThree();
  const sheetRef = useRef<THREE.Mesh>(null);
  const rollerRef = useRef<THREE.Group>(null);
  const paintMat = useRef<THREE.MeshStandardMaterial>(null);
  const layerGroup = useRef<THREE.Group>(null);
  const clip = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), -10), []);
  const sheetGeo = useMemo(() => new THREE.PlaneGeometry(SHEET, SHEET, 36, 36), []);
  const base = useMemo(() => Float32Array.from(sheetGeo.attributes.position.array as Float32Array), [sheetGeo]);
  const textures = useRef<{ cut?: THREE.Texture; sheet?: THREE.Texture; layers: THREE.Texture[] }>({ layers: [] });
  const ready = useRef(false);
  const t0 = useRef(performance.now());

  useEffect(() => {
    gl.localClippingEnabled = true;
    let alive = true;
    (async () => {
      const cut = await svgMask(svg, null);
      const layerCanvases = layers > 1 ? await Promise.all(Array.from({ length: layers }, (_, i) => svgMask(svg, i + 1, 512))) : [];
      if (!alive) return;
      const mk = (c: HTMLCanvasElement) => {
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.NoColorSpace;
        t.anisotropy = 4;
        return t;
      };
      textures.current = { cut: mk(cut), sheet: mk(invert(cut)), layers: layerCanvases.map(mk) };
      const sheet = sheetRef.current?.material as THREE.MeshPhysicalMaterial | undefined;
      if (sheet) {
        sheet.alphaMap = textures.current.sheet!;
        sheet.needsUpdate = true;
      }
      if (paintMat.current) {
        paintMat.current.alphaMap = textures.current.cut!;
        paintMat.current.needsUpdate = true;
      }
      layerGroup.current?.children.forEach((m, i) => {
        const mat = (m as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.alphaMap = textures.current.layers[i] ?? textures.current.cut!;
        mat.needsUpdate = true;
      });
      ready.current = true;
    })();
    return () => {
      alive = false;
    };
  }, [svg, layers, gl]);

  useEffect(() => {
    t0.current = performance.now();
  }, [mode]);

  useFrame((state) => {
    const sheet = sheetRef.current;
    if (!sheet || !ready.current) return;
    const el = (performance.now() - t0.current) / 1000;
    // timeline 0..1 over 11s (auto) — scroll can scrub it on desktop
    let t = mode === "peel" ? Math.min(1, 0.35 + el / 6) * 0.62 : (el % 11) / 11;
    if (mode === "auto" && scrollRef.current > 0.02) t = 0.12 + scrollRef.current * 0.5;
    const showLayers = mode === "layers";

    // gentle sway
    const sway = Math.sin(state.clock.elapsedTime * 0.6) * 0.12;
    const rollP = seg(t, 0.2, 0.42); // roller sweep
    const peelP = seg(t, 0.46, 0.62); // sheet peel
    const resetP = seg(t, 0.88, 1); // fade back

    // paint reveal follows roller (clip plane: x < rollerX visible)
    const rollerX = -SHEET / 2 - 0.4 + rollP * (SHEET + 0.8);
    clip.constant = resetP > 0 ? -10 : rollerX;
    if (paintMat.current) paintMat.current.opacity = showLayers ? 0 : 1 - resetP;

    // sheet: floats in, then peels (curl from bottom edge up and away)
    const pos = sheetGeo.attributes.position as THREE.BufferAttribute;
    const peel = showLayers ? 0 : peelP * (1 - resetP);
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      const v = (SHEET / 2 - y) / SHEET; // 0 top → 1 bottom
      const curl = peel * Math.pow(v, 1.6);
      pos.setXYZ(i, x, y + curl * 1.1, curl * 2.6 + Math.sin(x * 1.3 + state.clock.elapsedTime) * 0.015);
    }
    pos.needsUpdate = true;
    sheetGeo.computeVertexNormals();
    sheet.visible = !showLayers;
    sheet.position.set(0, 0.05 + peel * 1.4, 0.55 + peel * 1.6);
    sheet.rotation.set(-0.08 + peel * 0.9, sway, sway * 0.25);
    (sheet.material as THREE.MeshPhysicalMaterial).opacity = 0.92 * (1 - peel * 0.75);

    if (rollerRef.current) {
      const active = rollP > 0 && rollP < 1 && !showLayers;
      rollerRef.current.visible = active;
      rollerRef.current.position.set(rollerX, 0, 0.9);
      (rollerRef.current.children[0] as THREE.Mesh).rotation.x += 0.12;
    }

    if (layerGroup.current) {
      layerGroup.current.visible = showLayers;
      const spread = showLayers ? 0.35 + Math.sin(state.clock.elapsedTime * 0.8) * 0.12 : 0;
      layerGroup.current.children.forEach((m, i) => (m.position.z = 0.4 + i * spread * 1.6));
      layerGroup.current.rotation.set(-0.35 + Math.sin(state.clock.elapsedTime * 0.4) * 0.08, 0.55 + sway, 0);
    }
  });

  const layerColors = [paint, "#5EE6C0", "#F5C451", "#ffffff"];
  return (
    <>
      <ambientLight intensity={0.55} />
      <spotLight
        position={[0.6, 0.8, 7]}
        angle={0.42}
        penumbra={0.55}
        intensity={140}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-3, 4, 5]} intensity={0.4} />
      {/* wall */}
      <mesh receiveShadow position={[0, 0, -0.01]}>
        <planeGeometry args={[16, 10]} />
        <meshStandardMaterial color={wall} roughness={0.95} />
      </mesh>
      {/* painted pattern revealed by the roller */}
      <mesh position={[0, 0.05, 0.002]} receiveShadow>
        <planeGeometry args={[SHEET, SHEET]} />
        <meshStandardMaterial ref={paintMat} color={paint} transparent alphaTest={0.5} roughness={0.7} clippingPlanes={[clip]} />
      </mesh>
      {/* the stencil sheet (mylar) */}
      <mesh ref={sheetRef} geometry={sheetGeo} castShadow>
        <meshPhysicalMaterial color="#e9eef2" transparent opacity={0.92} alphaTest={0.5} roughness={0.25} metalness={0} clearcoat={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* foam roller */}
      <group ref={rollerRef} visible={false}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 1.6, 32]} />
          <meshStandardMaterial color={paint} roughness={0.9} />
        </mesh>
        <mesh position={[0.35, -0.95, 0.15]} rotation={[0, 0, -0.35]}>
          <cylinderGeometry args={[0.035, 0.035, 1.3, 12]} />
          <meshStandardMaterial color="#c8c8d0" metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
      {/* exploded layers */}
      <group ref={layerGroup} visible={false}>
        {Array.from({ length: Math.max(layers, 1) }, (_, i) => (
          <mesh key={i} castShadow>
            <planeGeometry args={[SHEET * 0.85, SHEET * 0.85]} />
            <meshStandardMaterial color={layerColors[i]} transparent alphaTest={0.5} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </>
  );
}

export default function Scene3D(props: { svg: string; layers: number; paint: string; wall: string; mode: HeroMode; onReady?: () => void }) {
  const wrap = useRef<HTMLDivElement>(null);
  const scrollRef = useRef(0);
  const visible = useRef(true);
  const invalidateRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting));
    io.observe(el);
    const onScroll = () => {
      if (window.innerWidth < 1024) return; // no scroll-scrub on mobile
      const r = el.getBoundingClientRect();
      scrollRef.current = Math.min(1, Math.max(0, -r.top / (r.height * 0.9)));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 6.4], fov: 42 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={() => props.onReady?.()}
        frameloop="always"
      >
        <PauseWhenHidden visible={visible} invalidateRef={invalidateRef} />
        <Stage {...props} scrollRef={scrollRef} />
      </Canvas>
    </div>
  );
}

function PauseWhenHidden({ visible }: { visible: React.MutableRefObject<boolean>; invalidateRef: React.MutableRefObject<() => void> }) {
  const set = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const tick = () => set(visible.current && document.visibilityState === "visible" ? "always" : "never");
    const id = setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [set, visible]);
  return null;
}
