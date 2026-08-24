/**
 * 煤场三维场景（Three.js）
 */
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { CoalPile, YardStacker } from '../data';

export interface HoverInfo {
  pile: CoalPile;
  heightM: number;
  posLabel: string;
  clientX: number;
  clientY: number;
}

interface Props {
  piles: CoalPile[];
  stackers: YardStacker[];
  onHover: (info: HoverInfo | null) => void;
  onSelectPile: (pile: CoalPile) => void;
}

export default function CoalYard3D({ piles, stackers, onHover, onSelectPile }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const hoverCb = useRef(onHover);
  const selectCb = useRef(onSelectPile);
  hoverCb.current = onHover;
  selectCb.current = onSelectPile;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 560;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd8dde3);
    scene.fog = new THREE.Fog(0xd8dde3, 60, 140);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 300);
    camera.position.set(48, 36, 48);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 2, 0);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 18;
    controls.maxDistance = 90;

    const amb = new THREE.AmbientLight(0xffffff, 0.72);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xfff2e0, 0.95);
    dir.position.set(30, 50, 20);
    dir.castShadow = true;
    scene.add(dir);

    // 地面
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 70),
      new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: 0.92, metalness: 0.05 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 网格
    const grid = new THREE.GridHelper(90, 18, 0x8a949e, 0xc5ccd4);
    grid.position.y = 0.02;
    scene.add(grid);

    // 地面皮带示意
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x3a4550 });
    const beltRun = new THREE.MeshStandardMaterial({ color: 0x2f9e44 });
    [[-28, 0], [0, 0], [28, 0]].forEach(([x], idx) => {
      const belt = new THREE.Mesh(new THREE.BoxGeometry(4, 0.35, 58), idx === 1 ? beltRun : beltMat);
      belt.position.set(x, 0.2, 0);
      belt.castShadow = true;
      scene.add(belt);
    });

    const pileMeshes: { mesh: THREE.Object3D; pile: CoalPile }[] = [];

    piles.forEach((pile) => {
      const group = new THREE.Group();
      group.position.set(pile.x, 0, pile.z);
      group.userData.pileId = pile.id;

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(pile.radius, pile.heightM * 0.85, 28),
        new THREE.MeshStandardMaterial({ color: pile.color, roughness: 0.88 }),
      );
      cone.position.y = (pile.heightM * 0.85) / 2;
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(pile.radius * 1.05, pile.radius * 1.15, 0.4, 28),
        new THREE.MeshStandardMaterial({ color: 0x3d3228, roughness: 0.95 }),
      );
      base.position.y = 0.2;
      group.add(base);

      scene.add(group);
      pileMeshes.push({ mesh: group, pile });
    });

    // 斗轮机简化模型
    stackers.forEach((sr, i) => {
      const g = new THREE.Group();
      const px = i === 0 ? -18 : 16;
      const pz = i === 0 ? -8 : 8;
      g.position.set(px, 0, pz);

      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 8, 2.2),
        new THREE.MeshStandardMaterial({ color: 0xe8a317 }),
      );
      tower.position.y = 4;
      g.add(tower);

      const boom = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.6, 1.2),
        new THREE.MeshStandardMaterial({ color: sr.mode === '故障' ? 0xd4380d : 0xf0b429 }),
      );
      boom.position.set(5, 6.5, 0);
      boom.rotation.z = (-sr.boomAngle * Math.PI) / 180;
      g.add(boom);

      const wheel = new THREE.Mesh(
        new THREE.TorusGeometry(1.6, 0.35, 10, 24),
        new THREE.MeshStandardMaterial({ color: 0x333333 }),
      );
      wheel.position.set(11, 5.2, 0);
      wheel.rotation.y = Math.PI / 2;
      g.add(wheel);

      scene.add(g);
    });

    // 场区标注板
    const makeLabel = (text: string, x: number, z: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = '#1677ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 252, 60);
      ctx.fillStyle = '#1f1f1f';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, 128, 42);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sprite.scale.set(10, 2.5, 1);
      sprite.position.set(x, 14, z);
      scene.add(sprite);
    };
    makeLabel('A 煤场', -12, -16);
    makeLabel('B 煤场', 16, -16);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const objs = pileMeshes.map((p) => p.mesh);
      const hits = raycaster.intersectObjects(objs, true);
      if (hits.length) {
        let obj: THREE.Object3D | null = hits[0].object;
        while (obj && !obj.userData.pileId) obj = obj.parent;
        const found = pileMeshes.find((p) => p.mesh === obj);
        if (found) {
          const localY = hits[0].point.y;
          hoverCb.current({
            pile: found.pile,
            heightM: Number(Math.max(0, localY).toFixed(1)),
            posLabel: `X=${hits[0].point.x.toFixed(1)} Z=${hits[0].point.z.toFixed(1)}`,
            clientX: e.clientX,
            clientY: e.clientY,
          });
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      hoverCb.current(null);
      renderer.domElement.style.cursor = 'default';
    };

    const onClick = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(
        pileMeshes.map((p) => p.mesh),
        true,
      );
      if (!hits.length) return;
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData.pileId) obj = obj.parent;
      const found = pileMeshes.find((p) => p.mesh === obj);
      if (found) selectCb.current(found.pile);
    };

    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('click', onClick);

    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('click', onClick);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [piles, stackers]);

  return <div ref={mountRef} className="chf-yard3d" />;
}
