// ========== CalendarCardScene3D (F1, Phase G: true 3D widget card) ==========

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const FALLBACK_CANVAS_SIZE = 100;
const CAMERA_Z = 6.8;
const CARD_WIDTH = 2.18;
const CARD_HEIGHT = 2.5;
const CARD_DEPTH = 0.16;
const HEADER_HEIGHT = 0.74;
const HEADER_Y = 0.9;
const BODY_Y = -0.28;
const ROTATION_SPEED = 0.0018;

interface CalendarCardScene3DProps {
  isInteractive?: boolean;
}

function createRoundedBoxShape(width: number, height: number, radius: number): THREE.Shape {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
}

function createRoundedExtrude(width: number, height: number, radius: number, depth: number): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(createRoundedBoxShape(width, height, radius), {
    depth,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    bevelSegments: 8,
    curveSegments: 16,
  });
}

function createPlane(width: number, height: number, color: string, opacity = 1): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.42,
    metalness: 0.02,
    clearcoat: 0.45,
    clearcoatRoughness: 0.28,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  });

  return new THREE.Mesh(geometry, material);
}

/**
 * Renders the floating widget as a small 3D tear-off calendar block.
 * Date text remains DOM-rendered above the canvas for crisp small UI labels.
 */
const CalendarCardScene3D: React.FC<CalendarCardScene3DProps> = ({ isInteractive = true }) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.05, CAMERA_Z);

    const updateRendererSize = () => {
      const width = Math.max(host.clientWidth, FALLBACK_CANVAS_SIZE);
      const height = Math.max(host.clientHeight, FALLBACK_CANVAS_SIZE);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    updateRendererSize();

    const resizeObserver = new ResizeObserver(updateRendererSize);
    resizeObserver.observe(host);

    const card = new THREE.Group();
    card.position.y = -0.06;
    card.rotation.set(-0.12, 0.16, -0.025);
    scene.add(card);

    const baseGeometry = createRoundedExtrude(CARD_WIDTH, CARD_HEIGHT, 0.22, CARD_DEPTH);
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: '#f8fbff',
      roughness: 0.36,
      metalness: 0.02,
      clearcoat: 0.7,
      clearcoatRoughness: 0.2,
      sheen: 0.25,
      sheenColor: new THREE.Color('#dbeafe'),
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.z = -CARD_DEPTH / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    card.add(base);

    const header = createPlane(CARD_WIDTH * 0.94, HEADER_HEIGHT, '#4f6bed', 0.97);
    header.position.set(0, HEADER_Y, CARD_DEPTH + 0.01);
    card.add(header);

    const headerGlow = createPlane(CARD_WIDTH * 0.86, HEADER_HEIGHT * 0.52, '#8fb7ff', 0.28);
    headerGlow.position.set(-0.08, HEADER_Y + 0.11, CARD_DEPTH + 0.018);
    card.add(headerGlow);

    const bodyGlow = createPlane(CARD_WIDTH * 0.86, CARD_HEIGHT * 0.52, '#eaf2ff', 0.5);
    bodyGlow.position.set(0.08, BODY_Y - 0.06, CARD_DEPTH + 0.012);
    card.add(bodyGlow);

    const pageLineMaterial = new THREE.MeshBasicMaterial({
      color: '#cbd5e1',
      transparent: true,
      opacity: 0.58,
    });
    const lineGeometry = new THREE.PlaneGeometry(CARD_WIDTH * 0.72, 0.018);
    const pageLine = new THREE.Mesh(lineGeometry, pageLineMaterial);
    pageLine.position.set(0, 0.45, CARD_DEPTH + 0.02);
    card.add(pageLine);

    const ringMaterial = new THREE.MeshPhysicalMaterial({
      color: '#e2e8f0',
      roughness: 0.22,
      metalness: 0.18,
      clearcoat: 0.5,
    });
    [-0.42, 0.42].forEach(x => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 12, 32), ringMaterial);
      ring.position.set(x, HEADER_Y + 0.35, CARD_DEPTH + 0.055);
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = true;
      card.add(ring);
    });

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.32, 64),
      new THREE.MeshBasicMaterial({
        color: '#1e293b',
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      }),
    );
    shadow.position.set(0.1, -1.38, -0.28);
    shadow.scale.set(1, 0.22, 1);
    card.add(shadow);

    scene.add(new THREE.AmbientLight('#eff6ff', 2.1));

    const keyLight = new THREE.DirectionalLight('#ffffff', 4.4);
    keyLight.position.set(-2.4, 3.1, 4.2);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight('#93c5fd', 1.4);
    fillLight.position.set(2.4, -1.4, 2.6);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight('#bfdbfe', 5.2, 7);
    rimLight.position.set(1.8, 1.6, 2.8);
    scene.add(rimLight);

    let raf = 0;
    let frame = 0;
    const render = () => {
      if (isInteractive) {
        frame += ROTATION_SPEED;
        card.rotation.y = 0.16 + Math.sin(frame) * 0.035;
        card.rotation.x = -0.12 + Math.cos(frame * 0.7) * 0.012;
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      baseGeometry.dispose();
      baseMaterial.dispose();
      lineGeometry.dispose();
      pageLineMaterial.dispose();
      ringMaterial.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [isInteractive]);

  return <div ref={hostRef} className="calendar-card-scene-3d" aria-hidden="true" />;
};

export default CalendarCardScene3D;
