import { useFrame } from "@react-three/fiber";
import {Quaternion, Euler, Vector3} from "three";
import * as THREE from "three"

let rotateAngle = new THREE.Vector3(0, 1, 0);
let rotateQuaternion = new THREE.Quaternion();
const cameraPosition = new THREE.Vector3(0, 0, 0);
let cameraOffset = new THREE.Vector3(0, 4, 5.5);
const smoothCameraPosition = new THREE.Vector3(0, 0, 0);

const MobileController = ({joystickAngle, knightBody, speed, setKnightAnimation}) => {

    /**
     *  Character Settings
    **/
    useFrame((state, delta) => {
  
       /**
         * Camera Movement
         */
    
        cameraPosition.addVectors(knightBody.current.translation(), cameraOffset);
        smoothCameraPosition.lerp(cameraPosition, 5 * delta);

        state.camera.position.copy(smoothCameraPosition); // A REACTIVER PÖUR SUIVRE PERSO

      /**
       * Model movement
       */

      if (joystickAngle) {
  
        const impulse = {
          x: 220 * delta * Math.cos(joystickAngle),
          y: knightBody.current.linvel().y,
          z: 220 * delta *Math.sin(joystickAngle) * -1,
        };

        // Set model current linear velocity
        knightBody.current.setLinvel(impulse);
        setKnightAnimation("Run"); 
      }
      else {
        knightBody.current.setLinvel({x: 0, y:knightBody.current.linvel().y, z: 0});
        setKnightAnimation("Idle");
      }
  
      /**
       * Model orentation
       */
      
      // Lock X and Z model rotations and update rotation Y
      const quaternionRotation = new Quaternion();
      if (joystickAngle) {
        quaternionRotation.setFromEuler(new Euler(0, joystickAngle - Math.PI / 2 , 0));
        knightBody.current.setRotation(quaternionRotation);
      }
    });
};

export default MobileController;