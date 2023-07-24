import { useGLTF, useKeyboardControls, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useRef, useState } from "react";
import * as THREE from "three";

const keysCombinationsSolver = ({forward, backward, leftward, rightward}) => {

    const lookup = {
      "0001" : {direction: "right", impulse: {x: 1, z: 0}, count: 1},
      "0010" : {direction: "left", impulse: {x: -1, z: 0}, count: 1},
      "0011" : {direction: "right", impulse: {x: 1, z: 0}, count: 1},
      "0100" : {direction: "backward", impulse: {x: 0, z: 1}, count: 1},
      "0101" : {direction: "backwardRight", impulse: {x: 1, z: 1}, count: 2},
      "0110" : {direction: "backwardLeft", impulse: {x: -1, z: 1}, count: 2},
      "0111" : {direction: "backward", impulse: {x: 0, z: 1}, count: 1},
      "1000" : {direction: "forward", impulse: {x: 0, z: -1}, count: 1},
      "1001" : {direction: "forwardRight", impulse: {x: 1, z: -1}, count: 2},
      "1010" : {direction: "forwardLeft", impulse: {x: -1, z: -1}, count: 2},
      "1011" : {direction: "forward", impulse: {x: 0, z: -1}, count: 1},
      "1100" : {direction: "forward", impulse: {x: 0, z: -1}, count: 1},
      "1101" : {direction: "forwardRight", impulse: {x: 1, z: -1}, count: 2},
      "1110" : {direction: "forwardLeft", impulse: {x: -1, z: -1}, count: 2},
      "1111" : {direction: "forward", impulse: {x: 0, z: -1} , count: 1}
    };
    
    const keyString = `${forward ? 1 : 0}${backward ? 1 : 0}${leftward ? 1 : 0}${rightward ? 1 : 0}`;
  
    return (lookup[keyString]) 
  };

const KeyboardController = ({knightBody, speed}) => {
    const [subscribeKeys, getKeys] = useKeyboardControls();

    /**
     *  Character Settings
    **/
    const [orientation, setOrientation] = useState(Math.PI);
  
    const deltaAngle = Math.PI / 16; // Angle subdivision during rotation (more divided => more smooth)
  
    const topLeftAngle = 3.927; // 3PI / 4
  
    const bottomLeftAngle = 5.498; // 5PI / 4
  
    const topRightAngle = 2.356; // 7PI / 4
  
    const bottomRightAngle = 0.785; // PI / 4   
    
  
    useFrame((state, delta) => {
  
      const keys = getKeys();
  
      // Retrieve direction according to keystroke
      const currentKeyStroke = keysCombinationsSolver(keys)
  
      /**
       * Model movement
       */
  
      if (currentKeyStroke) {
  
        // Reduce speed value if it's diagonal movement to always keep the same speed
        const normalizedSpeed =
          currentKeyStroke.count === 1 ? speed * delta : Math.sqrt(2) * (speed / 2) * delta;
  
        const impulse = {
          x: normalizedSpeed * currentKeyStroke.impulse.x,
          y: knightBody.current.linvel().y,
          z: normalizedSpeed * currentKeyStroke.impulse.z,
        };
  
        // Set model current linear velocity
        knightBody.current.setLinvel(impulse);
      }
      else {
        knightBody.current.setLinvel({x: 0, y:knightBody.current.linvel().y, z: 0});
      }
  
      /**
       * Model orentation
       */
      if (orientation <= 0 )
        setOrientation(prevState => prevState + Math.PI * 2)
  
      if (orientation >= 6.283)
        setOrientation(0)
      
      const roundedOrientation  = Math.round(orientation * 1000) / 1000
  
      const updateOrientation = (condition, deltaSign) => {
        if (condition) {
          setOrientation((prevState) => prevState + deltaAngle * deltaSign);
        }
      };
      
      const keysCombinations = {
        forwardRight: () => updateOrientation(roundedOrientation !== topRightAngle, roundedOrientation > topRightAngle ? -1 : 1),
        forwardLeft: () => updateOrientation(roundedOrientation !== topLeftAngle, roundedOrientation > topLeftAngle ? -1 : 1),
        backwardRight: () => updateOrientation(roundedOrientation !== bottomRightAngle, (roundedOrientation > bottomRightAngle && roundedOrientation < topLeftAngle) ? -1 : 1),
        backwardLeft: () => updateOrientation(roundedOrientation !== bottomLeftAngle, (roundedOrientation < topRightAngle || roundedOrientation > bottomLeftAngle) ? -1 : 1),
        forward: () => updateOrientation(Math.cos(orientation) !== -1, Math.sin(orientation) > 0 ? 1 : -1),
        right: () => updateOrientation(Math.sin(orientation) !== 1, Math.cos(orientation) > 0 ? 1 : -1),
        backward: () => updateOrientation(Math.cos(orientation) !== 1, Math.sin(orientation) > 0 ? -1 : 1),
        left: () => updateOrientation(Math.sin(orientation) !== -1, Math.cos(orientation) > 0 ? -1 : 1),
      };
  
      // set character direction
      // need to add default value for no keys stroke
      if (currentKeyStroke) {
        keysCombinations[currentKeyStroke.direction]()
      }
  
      // Lock X and Z model rotations and update rotation Y
      const quaternionRotation = new THREE.Quaternion();
      quaternionRotation.setFromEuler(new THREE.Euler(0, orientation, 0));
      knightBody.current.setRotation(quaternionRotation);
      
      /**
       * Camera Movement
       */
        const knightPosition = knightBody.current.translation();
  
        const cameraPosition = new THREE.Vector3(knightPosition.x, knightPosition.y + 3, knightPosition.z + 4);
  
        const cameraTarget = new THREE.Vector3();
        cameraTarget.copy(knightPosition);
        cameraTarget.z -= 5
        // cameraTarget.y += 0.25;
  
        state.camera.position.copy(cameraPosition);
        state.camera.lookAt(cameraTarget) 
    });
};

export default KeyboardController;