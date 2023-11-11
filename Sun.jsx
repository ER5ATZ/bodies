import * as THREE from 'three';

const sunTexture = new THREE.TextureLoader().load('sun.jpg');
const normalTexture = new THREE.TextureLoader().load('sunno.png');
const centralAnchor = new THREE.Vector3();

class Sun {
    constructor(size, color, scene, position) {
        this.velocity = new THREE.Vector3();
        this.rotation = new THREE.Vector3(0, 1, 0);
        this.rotationSpeed = 3 / size;
        this.mass = size;

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(size, 32, 32),
            new THREE.MeshStandardMaterial({
                map: sunTexture,
                normalMap: normalTexture
            })
        );

        this.light = new THREE.PointLight(color, 3000 / size, size * 3, size);
        this.light.position.copy(position);
        this.light.intensity = size * 300;
        this.light.distance = size * 300;
        this.light.decay = 1;
        this.light.castShadow = true;
        this.light.shadow.mapSize.width = 256;
        this.light.shadow.mapSize.height = 256;
        this.light.shadow.bias = 0.001;
        this.mesh.add(this.light);

        this.mesh.scale.set(size, size, size);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.position.copy(position);
        this.mesh.rotation.copy(this.rotation);

        const distanceToAnchor = position.distanceTo(centralAnchor);
        const gravitationalForce = this.mass * 0.001 / distanceToAnchor;
        const initialSpeed = Math.sqrt(gravitationalForce * distanceToAnchor);
        const velocityDirection = centralAnchor.clone().sub(position).normalize();
        this.velocity.copy(velocityDirection.multiplyScalar(initialSpeed));

        this.trailPoints = [];
        this.trailMaxLength = 100 * size;
        this.trailGeometry = new THREE.BufferGeometry();
        this.trailMaterial = new THREE.LineBasicMaterial({ color: color });
        this.trail = new THREE.Line(this.trailGeometry, this.trailMaterial);
        scene.add(this.mesh,this.light,this.trail);
    }

    applyGravityTo(...args) {
        const gravitationalConstant = 0.0001;
        const softeningFactor = 0.1;
        const deltaTime = 0.016;

        for (const sun of args) {
            const distance = this.mesh.position.distanceTo(sun.mesh.position) + softeningFactor;
            const combinedMass = this.mass * sun.mass;
            const gravitationalForce = (gravitationalConstant * combinedMass) / (distance ** 2);

            const forceDirection = sun.mesh.position.clone().sub(this.mesh.position).normalize();
            const gravityForce = forceDirection.multiplyScalar(gravitationalForce);

            this.velocity.add(gravityForce.multiplyScalar(deltaTime));
        }

        const newPosition = this.mesh.position.clone().add(this.velocity.clone().multiplyScalar(deltaTime));

        for (const sun of args) {
            const distance = newPosition.distanceTo(sun.mesh.position);
            const combinedRadius = this.mass + sun.mass;
            const collisionThreshold = 9;

            if (distance < collisionThreshold * combinedRadius) {
                const avoidDirection = newPosition.clone().sub(sun.mesh.position).normalize();
                const separationDistance = collisionThreshold * combinedRadius - distance;
                const separationVector = avoidDirection.multiplyScalar(separationDistance * 0.0025 * (this.mass / 2 + sun.mass));
                newPosition.add(separationVector);
            }
        }

        this.mesh.position.copy(newPosition);
    }

    toggleLight() {
        this.light.visible = !this.light.visible;
    }

    toggleTrail() {
        this.trail.visible = !this.trail.visible;
    }

    updateTrail() {
        const newPosition = this.mesh.position.clone();
        if (!isNaN(newPosition.x) && !isNaN(newPosition.y) && !isNaN(newPosition.z)) {
            this.trailPoints.push(newPosition);
        }
        if (this.trailPoints.length > this.trailMaxLength) {
            this.trailPoints.shift();
        }

        this.trailGeometry.setFromPoints(this.trailPoints);
        this.trail.geometry.attributes.position.needsUpdate = true;
    }

    updateOrbit(elapsedTime) {
        const orbitalPeriod = 5 * this.mass;
        const semiMajorAxis = 500 / this.mass;
        const eccentricity = 0.21 * this.mass;
        const angle = (Math.PI * 2 * elapsedTime) / orbitalPeriod;
        const inclinationAngle = (Math.PI * 3) / orbitalPeriod;
        const distanceToCentralAnchor = semiMajorAxis * (this.mass - eccentricity * eccentricity) / (this.mass + eccentricity * Math.cos(angle));
        const x = distanceToCentralAnchor * Math.cos(angle) * this.velocity.x * this.mass * 17;
        const y = distanceToCentralAnchor * Math.sin(angle) * Math.cos(inclinationAngle) * this.velocity.y * this.mass * 17;
        const z = distanceToCentralAnchor * Math.sin(angle) * Math.sin(inclinationAngle) * this.velocity.z * this.mass * 17;

        this.mesh.position.set(x, y, z);
    }

    updateRotation(elapsedTime) {
        this.updateOrbit(elapsedTime);
        this.rotation.x += this.rotationSpeed;
        this.rotation.y += this.rotationSpeed;
        this.rotation.z += this.rotationSpeed;
        this.mesh.rotation.copy(this.rotation);
        this.mesh.position.add(this.velocity);
        this.updateTrail();
    }
}

export default Sun;
