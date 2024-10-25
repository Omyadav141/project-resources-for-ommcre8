import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";

console.clear();

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(
  45 * 0.4,
  innerWidth / innerHeight,
  1,
  1000
);
camera.position.set(1, -5, 8).setLength(21);
let renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);

document.body.appendChild(renderer.domElement);

window.addEventListener("resize", (event) => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = controls.getDistance();
controls.maxDistance = controls.getDistance();

let gu = {
  time: { value: 0 }
};

let loader = new GLTFLoader();
let model = (
  await loader.loadAsync(
    "https://threejs.org/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb"
  )
).scene.children[0];
model.position.y = -0.75;

let box = new THREE.Box3().setFromBufferAttribute(
  model.geometry.attributes.position
);
let size = new THREE.Vector3();
box.getSize(size);

let presets = {
  transitionLevel: {value: 0.5},
  black: {value: (() => {
    let c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    let ctx = c.getContext("2d");

    let unit = (val) => val * c.height * 0.01;

    ctx.fillStyle = "#222222";
    ctx.fillRect(0, 0, c.width, c.height);

    ctx.lineCap = "round";

    ctx.strokeStyle = "#ddd";
    ctx.filter = `blur(${unit(0.5)}px)`;

    let rows = 8;
    let cols = 4;
    let colFactor = 0.75;
    let colAngle = Math.PI / cols;
    let colAngleHalf = colAngle * 0.5;
    for (let row = 0; row < rows; row++) {
      ctx.lineWidth = unit(10 - row) * 0.25;
      let r = 47 - row * 5;
      for (let col = 0; col < cols; col++) {
        ctx.beginPath();
        let centralAngle = -colAngleHalf - colAngle * col;
        ctx.arc(
          unit(50),
          unit(50),
          unit(r),
          centralAngle - colAngleHalf * colFactor,
          centralAngle + colAngleHalf * colFactor
        );
        ctx.stroke();
      }
    }
    
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(unit(50), unit(50));
    ctx.arc(unit(50), unit(50), unit(50), Math.PI * 0.25, Math.PI * 0.75);
    ctx.fill();

    let tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.center.setScalar(0.5);
    return tex;
  })()},
  neon: {value: (() => {
    let c = document.createElement("canvas");
    c.width = 1024;
    c.height = 1024;
    let ctx = c.getContext("2d");

    let unit = (val) => val * c.height * 0.01;
    
    let grd = ctx.createLinearGradient(0, 0, 0, c.height);
    grd.addColorStop(0.25, "#ff00ff");
    grd.addColorStop(0.5, "#ff88ff");
    grd.addColorStop(0.75, "#0044ff");
    grd.addColorStop(1, "#ffff00");
    
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, c.width, c.height);
    
    let tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.center.setScalar(0.5);
    return tex;
  })()}
};


model.material = new THREE.MeshMatcapMaterial({
  matcap: presets.black.value,
  onBeforeCompile: shader => {
    shader.uniforms.transitionLevel = presets.transitionLevel;
    shader.uniforms.matcap2 = presets.neon;
    shader.vertexShader = `
      varying vec4 vClipPos;
      ${shader.vertexShader}
    `.replace(
      `vViewPosition = - mvPosition.xyz;`,
      `vViewPosition = - mvPosition.xyz;
        vClipPos = gl_Position;
      `
    );
    //console.log(shader.vertexShader);
    shader.fragmentShader = `
      uniform float transitionLevel;
      uniform sampler2D matcap2;
      varying vec4 vClipPos;
      ${shader.fragmentShader}
    `.replace(
      `vec4 matcapColor = texture2D( matcap, uv );`,
      `
      vec4 mc1 = texture( matcap, uv );
      vec4 mc2 = texture( matcap2, uv );
      
      vec2 clipUV = (vClipPos.xy / vClipPos.w) * 0.5 + 0.5;
      
      vec4 matcapColor = mix(mc1, mc2, smoothstep(transitionLevel-0.1, transitionLevel+0.1, clipUV.y));
      `
    );
    //console.log(shader.fragmentShader);
  }
});
scene.add(model);

let simplex = new SimplexNoise();

let clock = new THREE.Clock();
let t = 0;

renderer.setAnimationLoop(() => {
  let dt = clock.getDelta();
  t += dt;
  
  let n = simplex.noise(t * 0.25, Math.PI) * 0.5 + 0.5;
  presets.transitionLevel.value = n;
  
  controls.update();
  renderer.render(scene, camera);
});
