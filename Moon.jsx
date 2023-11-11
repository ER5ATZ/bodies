import * as THREE from 'three';

const moonTexture = new THREE.TextureLoader().load('moon.jpg');
const moonNormalTexture = new THREE.TextureLoader().load('normal.jpg');

class Moon {
    constructor(size, position, suns) {
        this.velocity = new THREE.Vector3();
        this.barycenter = new THREE.Vector3();
        this.rotationAxis = new THREE.Vector3(0, 1, 0);
        this.rotationSpeed = 0.02 / size;
        this.mass = size;

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(size, 32, 32),
            new THREE.MeshStandardMaterial({
                map: moonTexture,
                normalMap: moonNormalTexture,
            })
        );
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.mesh.position.copy(position);
        this.updateVelocity(suns);
        this.updateBarycenter(suns);
    }

    updateVelocity(suns) {
        this.velocity.set(0, 0, 0);
        for (const sun of suns) {
            const distance = this.mesh.position.distanceTo(sun.mesh.position);
            const combinedRadius = this.mass + sun.mass;
            const gravitationalThreshold = 18;
            const minDistance = 6 * sun.mass;

            if (distance > gravitationalThreshold * combinedRadius && distance > minDistance) {
                const combinedMass = this.mass * sun.mass;
                const gravitationalForce = (1000 * combinedMass) / (distance ** 2);

                const forceDirection = sun.mesh.position.clone().sub(this.mesh.position).normalize();
                const gravityForce = forceDirection.multiplyScalar(gravitationalForce);

                this.velocity.add(gravityForce);
            } else {
                const sunVelocity = sun.velocity.clone();
                const deflectionDirection = sunVelocity.cross(this.mesh.position.clone().normalize());
                const deflectionForce = deflectionDirection.multiplyScalar(0.0009);

                this.velocity.add(deflectionForce);
            }
        }

        this.mesh.position.add(this.velocity);
        this.mesh.rotateOnWorldAxis(this.rotationAxis, this.rotationSpeed);
    }

    updateBarycenter(suns) {
        this.barycenter.set(0, 0, 0);

        for (const sun of suns) {
            this.barycenter.add(sun.mesh.position);
        }

        this.barycenter.divideScalar(suns.length);
    }
}

export default Moon;
