import { useFrame } from "@react-three/fiber";
import { Quaternion, Euler, Vector3 } from "three";
import * as THREE from "three"

let rotateAngle = new THREE.Vector3(0, 1, 0);
let rotateQuaternion = new THREE.Quaternion();
const cameraPosition = new THREE.Vector3(0, 0, 0);
let cameraOffset = new THREE.Vector3(0, 4, 5.5);
const smoothCameraPosition = new THREE.Vector3(0, 0, 0);

// animmations
const IDLE = "Idle"
const RUN = "Run"

const animationUpdate = (actions, currentAnimation) => {
  actions[currentAnimation].fadeOut(0.2);
  currentAnimation === IDLE ?
    currentAnimation = RUN :
    currentAnimation = IDLE

  actions[currentAnimation].reset().fadeIn(0.2).play();
}

const resetLinearVelocity = (characterBody, resetY = false) => {
  characterBody.setLinvel({
    x: 0,
    y: resetY ? 1.5 : characterBody.linvel.y,
    z: 0,
  });
}

const MobileController = ({ joystickAngle, knightBody, speed, knightAnimation, orbitControls, knightSleeping}) => {

  /**
   *  Character Settings
  **/
  useFrame((state, delta) => {


    if (orbitControls || (knightSleeping && knightSleeping.current)) return;

    if (knightBody.current) {
      knightPosition = knightBody.current.translation();


      // Reset Character Position if he falls
      if (knightPosition.y < 0) {
        resetLinearVelocity(knightBody.current, true);
      }

      // Retrieve Character Position to move lights accordingly
      useStore.setState({ characterPosition: knightPosition });

      // Update Camera Position
      cameraPosition.addVectors(knightPosition, cameraOffset);
      smoothCameraPosition.lerp(cameraPosition, 5 * delta);

      // Reset Character Velocity
      if (direction === undefined || !pageVisibiliy.current) {
        animationUpdate(knightAnimations.actions, knightAnimation.current)

        resetLinearVelocity(knightBody.current)
        return;
      }


      if (knightAnimation.current !== RUN) {
        knightAnimations.actions[knightAnimation.current].fadeOut(0.2);
        knightAnimation.current = RUN;
        knightAnimations.actions[knightAnimation.current].reset().fadeIn(0.2).play();
      }

      knightBody.current.setLinvel({
        x: speed * Math.cos(direction) * -1 /* * delta */,
        y: knightBody.current.linvel().y,
        z: speed * Math.sin(direction) /* * delta */,
      });

      rotateQuaternion.setFromAxisAngle(rotationAngle, direction - Math.PI / 2);
      knightMesh.current.quaternion.rotateTowards(rotateQuaternion, 0.3); //017 avant
    }
  });
};

export default MobileController;