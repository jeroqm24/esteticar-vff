import React, { useRef, useEffect, useState, useMemo } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import * as THREE from "three";
import { BRAND } from "../lib/constants";

// ═══════════════════════════════════════
// CINEMATIC WEBGL — GOLD NEBULA
// ═══════════════════════════════════════
const VERTEX = `
  attribute float size;
  attribute float alpha;
  attribute float speed;
  varying float vAlpha;
  varying float vDist;
  uniform float time;
  uniform vec2 mouse;

  void main() {
    vAlpha = alpha;
    vec3 pos = position;
    
    // Organic flowing motion
    float wave1 = sin(time * 0.15 + pos.y * 0.08 + pos.x * 0.05) * 4.0;
    float wave2 = cos(time * 0.12 + pos.x * 0.06 + pos.z * 0.04) * 3.0;
    float wave3 = sin(time * 0.2 + pos.z * 0.1) * 2.0;
    pos.x += wave1 * speed;
    pos.y += wave2 * speed;
    pos.z += wave3 * speed * 0.5;
    
    // Mouse reactivity
    float mouseInfluence = smoothstep(40.0, 0.0, length(pos.xy - mouse * 50.0));
    pos.z += mouseInfluence * 15.0;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vDist = -mvPosition.z;
    gl_PointSize = size * (400.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAG = `
  varying float vAlpha;
  varying float vDist;
  
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if(d > 0.5) discard;
    
    // Soft glow with warm gold
    float fade = 1.0 - smoothstep(0.0, 0.5, d);
    float glow = exp(-d * 4.0) * 0.5;
    float combined = fade + glow;
    
    // Depth fade
    float depthFade = smoothstep(150.0, 30.0, vDist);
    
    // Warm gold with subtle color variation
    vec3 goldBright = vec3(0.98, 0.82, 0.28);
    vec3 goldWarm = vec3(0.95, 0.70, 0.15);
    vec3 color = mix(goldWarm, goldBright, fade);
    
    gl_FragColor = vec4(color, vAlpha * combined * depthFade * 0.7);
  }
`;

function GoldNebula() {
  const mountRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 300);
    camera.position.z = 90;

    // Multi-layer particle system
    const createLayer = (count, spread, sizeRange, alphaRange) => {
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      const alphas = new Float32Array(count);
      const speeds = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        // Golden ratio spiral distribution for natural look
        const theta = i * 2.399963;
        const r = Math.sqrt(i / count) * spread;
        positions[i * 3] = Math.cos(theta) * r + (Math.random() - 0.5) * spread * 0.3;
        positions[i * 3 + 1] = Math.sin(theta) * r * 0.6 + (Math.random() - 0.5) * spread * 0.25;
        positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.8;
        sizes[i] = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
        alphas[i] = alphaRange[0] + Math.random() * (alphaRange[1] - alphaRange[0]);
        speeds[i] = 0.5 + Math.random() * 1.5;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
      geo.setAttribute("speed", new THREE.BufferAttribute(speeds, 1));
      return geo;
    };

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mouse: { value: new THREE.Vector2(0, 0) },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // Layer 1: Dense core
    const layer1 = new THREE.Points(createLayer(500, 70, [1, 4], [0.2, 0.8]), mat);
    scene.add(layer1);

    // Layer 2: Sparse outer halo
    const layer2 = new THREE.Points(createLayer(300, 120, [0.5, 2], [0.1, 0.4]), mat);
    scene.add(layer2);

    // Central glow
    const glowGeo = new THREE.SphereGeometry(18, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xF8C840,
      transparent: true,
      opacity: 0.015,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    // Secondary ambient glow
    const glow2Geo = new THREE.SphereGeometry(40, 32, 32);
    const glow2Mat = new THREE.MeshBasicMaterial({
      color: 0xF8C840,
      transparent: true,
      opacity: 0.008,
    });
    const glow2 = new THREE.Mesh(glow2Geo, glow2Mat);
    scene.add(glow2);

    let t = 0;
    let animId;
    const animate = () => {
      t += 0.004;
      mat.uniforms.time.value = t;

      // Smooth mouse interpolation
      const m = mouseRef.current;
      m.tx += (m.x - m.tx) * 0.03;
      m.ty += (m.y - m.ty) * 0.03;
      mat.uniforms.mouse.value.set(m.tx, m.ty);

      // Camera drift
      camera.position.x += (m.tx * 8 - camera.position.x) * 0.015;
      camera.position.y += (-m.ty * 4 - camera.position.y) * 0.015;
      camera.lookAt(0, 0, 0);

      // Subtle rotation
      layer1.rotation.y = t * 0.02;
      layer1.rotation.z = Math.sin(t * 0.3) * 0.02;
      layer2.rotation.y = -t * 0.01;
      layer2.rotation.x = Math.sin(t * 0.2) * 0.015;

      // Breathing glow
      glow.scale.setScalar(1 + Math.sin(t * 1.5) * 0.08);
      glow2.scale.setScalar(1 + Math.sin(t * 0.8) * 0.05);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
    };

    const handleMouse = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouse);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouse);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0" />;
}

// ═══════════════════════════════════════
// CINEMATIC TEXT REVEAL
// ═══════════════════════════════════════
function RevealLine({ children, delay = 0, className = "" }) {
  return (
    <div className="overflow-hidden">
      <motion.div
        initial={{ y: "120%", rotateX: 40 }}
        animate={{ y: 0, rotateX: 0 }}
        transition={{
          duration: 1.6,
          delay,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={className}
        style={{ transformOrigin: "bottom" }}
      >
        {children}
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN HERO
// ═══════════════════════════════════════
export default function HeroSection() {
  const containerRef = useRef(null);
  const [blurVal, setBlurVal] = useState(0);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const yParallax = useTransform(scrollYProgress, [0, 1], [0, -250]);
  const opacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.88]);
  const blur = useTransform(scrollYProgress, [0, 0.5], [0, 8]);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  useMotionValueEvent(blur, "change", (v) => setBlurVal(v));

  return (
    <section
      ref={containerRef}
      className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-black"
    >
      <GoldNebula />

      {/* Scanline */}
      <div className="scanline" />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black z-[1]" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30 z-[1]" />

      {/* Corner accents — thinner, more refined */}
      <div className="absolute bottom-24 left-8 w-48 h-48 border-l border-b border-ec-gold/[0.07] pointer-events-none z-[2]" />
      <div className="absolute top-32 right-8 w-48 h-48 border-r border-t border-ec-gold/[0.07] pointer-events-none z-[2]" />

      {/* Cross accent */}
      <div className="absolute top-1/2 left-8 w-4 h-px bg-ec-gold/20 pointer-events-none z-[2]" />
      <div className="absolute top-1/2 left-[9px] w-px h-4 bg-ec-gold/20 pointer-events-none z-[2] -translate-y-1/2 translate-x-[7px]" />

      <motion.div
        style={{
          y: yParallax,
          opacity,
          scale,
          filter: blurVal > 0 ? `blur(${blurVal}px)` : "none",
        }}
        className="relative z-10 text-center px-6 max-w-7xl mx-auto pb-24 md:pb-8 md:pt-12"
      >
        {/* Hero center logo — visible on lg size above main text */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, filter: "blur(30px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 2.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 lg:mb-8 hidden md:block"
        >
          <img
            src={BRAND.logo}
            alt="Esteticar"
            className="h-16 sm:h-20 md:h-24 mx-auto object-contain"
            style={{ filter: "drop-shadow(0 0 60px rgba(248,200,64,0.25)) drop-shadow(0 0 120px rgba(248,200,64,0.1))" }}
          />
        </motion.div>

        {/* Main title with 3D reveal */}
        <div className="space-y-0 mb-6">
          <RevealLine
            delay={0.6}
            className="font-heading text-5xl sm:text-7xl md:text-8xl lg:text-[7rem] text-white font-light tracking-[-0.03em] leading-[0.92]"
          >
            {BRAND.heroLines[0]}
          </RevealLine>
          <RevealLine
            delay={0.85}
            className="font-heading text-5xl sm:text-7xl md:text-8xl lg:text-[7rem] text-white font-light tracking-[-0.03em] leading-[0.92]"
          >
            {BRAND.heroLines[1]}
          </RevealLine>
        </div>

        {/* Subtitle with staggered reveal */}
        <motion.p
          initial={{ opacity: 0, y: 20, letterSpacing: "0.8em" }}
          animate={{ opacity: 1, y: 0, letterSpacing: "0.5em" }}
          transition={{ delay: 1.6, duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-ui text-xs md:text-sm uppercase text-ec-gold gold-text-glow"
        >
          {BRAND.heroSub}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 1 }}
          className="mt-10 lg:mt-12 flex items-center justify-center"
        >
          <button
            onClick={() => document.querySelector('#servicios')?.scrollIntoView({ behavior: 'smooth' })}
            className="btn-gold rounded-none group relative overflow-hidden"
            style={{ minWidth: 260 }}
          >
            <span className="relative z-10">RESERVAR TRATAMIENTO</span>
            <motion.div
              className="absolute inset-0 bg-white/20"
              initial={{ x: "-100%" }}
              whileHover={{ x: "100%" }}
              transition={{ duration: 0.6 }}
            />
          </button>
        </motion.div>
      </motion.div>

      {/* Scroll indicator with pulse — fades out on scroll */}
      <motion.div
        style={{ opacity: scrollIndicatorOpacity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-4 pointer-events-none"
      >
        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-px h-20 bg-gradient-to-b from-ec-gold/90 to-transparent" />
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <span className="font-ui text-xs md:text-sm tracking-[0.3em] md:tracking-[0.5em] text-ec-gold/90 uppercase font-black">Desliza</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
