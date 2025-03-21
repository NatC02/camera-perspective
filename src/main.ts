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

/**
 * Kawase Blur Setup
 */
// Generate KawaseBlurPass class
const KawaseBlurPass = KawaseBlurPassGen({ THREE, EffectComposer, Pass, FullScreenQuad });

// Create KawaseBlurPass instance
const myKawaseBlurPass = new KawaseBlurPass({ renderer, kernels: [0] });

// Add to EffectComposer
const fx = new EffectComposer(renderer);
fx.addPass(new RenderPass(scene, camera));
fx.addPass(myKawaseBlurPass);

// Set the initial blur effect
myKawaseBlurPass.setKernels([1]); // Set the blur kernels to start with

/**
 * Load GLTF Model
 */
const loader = new GLTFLoader();
let gltfModel = null;
let mixer = null;
let actions = [];

// Modify loader to save original materials
loader.load('/cam.glb', (gltf) => {
  gltfModel = gltf.scene;
  scene.add(gltfModel);
  scene.background = new THREE.Color('#30323D');

  // Apply Manga Shader Material to Model
  const material = mangaShaderManager.getMangaMaterial({ outlineThreshold: 0.1 });

  gltfModel.traverse((child) => {
    if (child.isMesh) {
      // Store original material for later restoration
      child.userData.originalMaterial = child.material;
      child.material = material; // Apply manga shader material
    }
  });

  // Lighting Setup
  mangaDirectionalLight.position.set(2, 2, 2);
  mangaDirectionalLight.lookAt(gltfModel.position);
  scene.add(mangaDirectionalLight);

  // Animation Setup
  if (gltf.animations.length > 0) {
    mixer = new THREE.AnimationMixer(gltfModel);
    actions = gltf.animations.map((clip) => mixer.clipAction(clip));
  }
}, undefined, (error) => {
  console.error('Error loading GLTF model:', error);
});

/**
 * Resize Handling
 */
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  mangaShaderManager.setResolution(new THREE.Vector2(sizes.width, sizes.height));
});

/**
 * Audio setup for animation toggle
 */
const sound = new Audio('/focus.mp3'); // Load the sound file

// Function to remove manga shader material
const removeMangaShaderMaterial = () => {
  if (gltfModel) {
    gltfModel.traverse((child) => {
      if (child.isMesh) {
        // Restore the original material if available
        if (child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial;
        }
      }
    });
  }
};

// Function to reapply manga shader material
const applyMangaShaderMaterial = () => {
  if (gltfModel) {
    gltfModel.traverse((child) => {
      if (child.isMesh) {
        // Reapply the manga shader material
        const material = mangaShaderManager.getMangaMaterial({ outlineThreshold: 0.1 });
        child.material = material;
      }
    });
  }
};

// Function to remove the blur effect from the scene
const removeBlur = () => {
  // Remove the KawaseBlurPass from the EffectComposer's pass list
  fx.passes = fx.passes.filter(pass => !(pass instanceof KawaseBlurPass));

  // Optionally, you can also reset any blur-related settings or state here if needed.
};

// Function to apply the blur effect to the scene
const applyBlur = () => {
  // Check if the blur pass is already in the passes array to avoid duplicates
  if (!fx.passes.some(pass => pass instanceof KawaseBlurPass)) {
    // Add the KawaseBlurPass back to the EffectComposer's passes
    fx.addPass(myKawaseBlurPass);
  }
};

const lensFlareEffect = LensFlareEffect();

/**
 * UseState-like Toggle
 */
let isOpen = false; // Simulating the useState toggle
const toggleAnimation = () => {
  if (actions.length > 0) {
    if (isOpen) {
      console.log('Closing animation (0 seconds)');
      applyBlur();
      applyMangaShaderMaterial();
      removeLensFlare();
      actions.forEach(action => {
        action.reset().play();
        action.time = 0; // Reset to start (closed state)
      });
      mixer.setTime(0);
    } else {
      console.log('Opening animation (6.049 seconds)');
      removeBlur();
      applyLensFlare();
      removeMangaShaderMaterial();
      actions.forEach(action => {
        action.reset().play();
        action.time = 0; // Start playing
      });
      mixer.setTime(6.049);
    }

    // Pause the animation at the target time
    actions.forEach(action => {
      action.paused = true;
    });

    // Play sound when animation state toggles
    sound.play();

    // Toggle state
    isOpen = !isOpen;
  }
};

// Function to apply the lens flare effect to the scene
const applyLensFlare = () => {  
  // Add the lens flare effect to the scene
  scene.add(lensFlareEffect);
};

// Function to remove the lens flare effect from the scene
const removeLensFlare = () => {
  // Remove the lens flare effect from the scene
  scene.remove(lensFlareEffect);
};

/**
 * Mouse Interaction
 */
let currentIntersect = null;
const onClick = () => {
  if (currentIntersect && gltfModel && actions.length > 0) {
    let object = currentIntersect.object;
    while (object) {
      if (object === gltfModel) {
        console.log('Clicked on GLTF model, toggling animation');
        toggleAnimation(); // Call toggle function when GLTF model is clicked
      }
      object = object.parent;
    }
  }
};

window.addEventListener('click', onClick);

/**
 * Animation Loop
 */
const clock = new THREE.Clock();

const tick = () => {
  const delta = clock.getDelta();

  controls.update();

  if (mixer) {
    mixer.update(delta);
  }

  raycaster.setFromCamera(mouse, camera);
  const objectsToTest = [];
  if (gltfModel) {
    objectsToTest.push(gltfModel);
  }
  const intersects = raycaster.intersectObjects(objectsToTest, true);

  if (intersects.length) {
    if (!currentIntersect) {
      console.log('Mouse enter');
    }
    currentIntersect = intersects[0];
  } else {
    if (currentIntersect) {
      console.log('Mouse leave');
    }
    currentIntersect = null;
  }

  mangaShaderManager.update(); // Ensure manga shader updates every frame

  // Use EffectComposer to render the scene with the blur effect applied
  fx.render();

  window.requestAnimationFrame(tick);
};

tick();
