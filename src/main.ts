import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as ThreeManga from 'three-manga';
import { EffectComposer, Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { KawaseBlurPassGen } from 'three-kawase-blur';
import { LensFlareEffect } from './LensFlare';

/**
 * Base Three Setup
 */
// Canvas
const canvas = document.querySelector('canvas.webgl') as HTMLCanvasElement;

// Scene
const scene = new THREE.Scene();

// Lighting
const mangaDirectionalLight = new ThreeManga.MangaDirectionalLight(-2, 2, 2, -2, 1, 5);
scene.add(mangaDirectionalLight); // Add light to scene

// Camera
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
camera.position.z = 3;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', (event) => {
  mouse.x = (event.clientX / sizes.width) * 2 - 1;
  mouse.y = -(event.clientY / sizes.height) * 2 + 1;
});

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Manga Shader Manager Setup
const mangaShaderManager = new ThreeManga.MangaShaderManager({
  renderer: renderer,
  scene: scene,
  camera: camera,
  lightList: [mangaDirectionalLight],
  resolution: new THREE.Vector2(sizes.width, sizes.height),
});
