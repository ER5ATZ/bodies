import './style.css'
import * as THREE from 'three';
import Sun from './Sun';
import Moon from './Moon';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass';

const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#bg'),
    antialias: true
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const gridHelper = new THREE.GridHelper(500, 25);
//scene.add(gridHelper);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 200, 550);
camera.lookAt(scene.position);
scene.add(camera);

const sun1 = new Sun(4, 0xfffff0, scene, new THREE.Vector3(200, -100, 0));
const sun2 = new Sun(3.5, 0xff4500, scene, new THREE.Vector3(-100, 100, -100));
const sun3 = new Sun(4.5, 0xadd8e6, scene, new THREE.Vector3(100, 0, 200));

const moon = new Moon(1, new THREE.Vector3(0, 0, 0), [sun1, sun2, sun3]);
scene.add(moon.mesh);
const moonCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(moonCamera);
const moonPass = new RenderPass(scene, moonCamera);
let isMoonPov = false;

const ambientLight = new THREE.AmbientLight(0xffffff);
ambientLight.intensity = 2;
scene.add(ambientLight);

const controls = new OrbitControls(camera, renderer.domElement);
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
composer.addPass(bloomPass);

let barycenterWireframe;

function initializeBarycenterWireframe(moon) {
    const barycenterGeometry = new THREE.SphereGeometry(1, 16, 16);
    const barycenterMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });

    barycenterWireframe = new THREE.Mesh(barycenterGeometry, barycenterMaterial);
    barycenterWireframe.position.copy(moon.barycenter);

    scene.add(barycenterWireframe);
}

//initializeBarycenterWireframe(moon);

function updateMoonCamera(moon) {
    const directionToMoon = moon.mesh.position.clone().sub(moon.barycenter);
    directionToMoon.normalize();
    const linePosition = moon.mesh.position.clone().add(directionToMoon.multiplyScalar(8));

    moonCamera.position.copy(linePosition);
    moonCamera.lookAt(moon.barycenter);
}

function changeView() {
    if (isMoonPov) {
       composer.removePass(moonPass);
       composer.addPass(renderPass);
       controls.target.copy(scene.position);
   } else {
       composer.removePass(renderPass);
       composer.addPass(moonPass);
       controls.target.copy(moon.mesh.position);
   }
    isMoonPov = !isMoonPov;
}

camera.userData = {
    position: camera.position.clone(),
    rotation: camera.rotation.clone(),
    target: controls.target.clone()
};
moonCamera.userData = {
    position: moonCamera.position.clone(),
    rotation: moonCamera.rotation.clone(),
    target: controls.target.clone()
};

function addStar(radiusStart, radiusEnd) {
    const geometry = new THREE.SphereGeometry(0.25, 24, 24);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const star = new THREE.Mesh(geometry, material);

    const radius = THREE.MathUtils.randFloat(radiusStart, radiusEnd);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;

    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);

    star.position.set(x, y, z);
    scene.add(star);
}

const starsRadiusStart = 300;
const starsRadiusEnd = 750;
Array(300).fill().forEach(() => addStar(starsRadiusStart, starsRadiusEnd));


const spaceTexture = new THREE.TextureLoader().load('space.jpg');
scene.background = spaceTexture;
const startTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    const currentTime = performance.now();
    const elapsedTime = (currentTime - startTime) / 1000;

    sun1.applyGravityTo(sun2, sun3);
    sun2.applyGravityTo(sun1, sun3);
    sun3.applyGravityTo(sun1, sun2);
    sun1.updateRotation(elapsedTime);
    sun2.updateRotation(elapsedTime);
    sun3.updateRotation(elapsedTime);
    moon.updateVelocity([sun1, sun2, sun3]);

    controls.update();
    if (isMoonPov) {
        updateMoonCamera(moon);
        composer.render(scene, moonCamera);
    } else {
        composer.render(scene, camera);
    }
}

function moveCamera() {
    if (isMoonPov) {
        return;
    }

    const t = document.body.getBoundingClientRect().top * -0.05;
    camera.position.z = t;
    camera.position.x = t;
    camera.rotation.y = t * 0.002;
}

sun1.toggleTrail();
//sun1.toggleLight()
sun2.toggleTrail();
//sun2.toggleLight();
sun3.toggleTrail();
//sun3.toggleLight();

document.body.onscroll = moveCamera;
moveCamera();

const pov = document.getElementById('camera');
pov.addEventListener('click', () => {
    changeView();
});
const toggle = document.getElementById('toggle');
const textContainer = document.getElementById('text');
toggle.addEventListener('click', () => {
    sun1.toggleTrail();
    //sun1.toggleLight()
    sun2.toggleTrail();
    //sun2.toggleLight();
    sun3.toggleTrail();
    //sun3.toggleLight();
    textContainer.classList.toggle('hidden');
    pov.classList.toggle('hidden');

});

const light = document.querySelectorAll('.light');
light.forEach(button => {
    button.addEventListener('click', function() {
        const sunId = this.id;
        if (sunId === 'sun1') {
            sun1.toggleLight();
        } else if (sunId === 'sun2') {
            sun2.toggleLight();
        } else if (sunId === 'sun3') {
            sun3.toggleLight();
        }
    });
});

const equationElements = document.querySelectorAll('.eq');
equationElements.forEach((equationElement) => {
  const latexContent = equationElement.textContent.trim();
  equationElement.innerHTML = `\\[${latexContent}\\]`;
  MathJax.typeset([equationElement]);
});

animate();
document.body.appendChild(renderer.domElement);
