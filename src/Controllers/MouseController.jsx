import { useFrame } from "@react-three/fiber";
import {Quaternion, Euler, Vector3} from "three";

let mouseAngle = 0;

const MouseController = ({mousePressed, knightBody, speed, setKnightAnimation}) => {

    window.addEventListener("mousemove", (event) => {
        let mouseX = event.clientX / window.innerWidth * 2 - 1
        let mouseY = - (event.clientY / window.innerHeight) * 2 + 1

        mouseAngle = Math.atan2( mouseY,mouseX)
    })

    /**
     *  Character Settings
    **/
    useFrame((state, delta) => {
  
      /**
       * Model movement
       */

      if (mousePressed) {
        const normalizedSpeed = speed * delta;
  
        const impulse = {
          x: normalizedSpeed * Math.cos(mouseAngle),
          y: knightBody.current.linvel().y,
          z: normalizedSpeed *Math.sin(mouseAngle) * -1,
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
      if (mousePressed) {
        quaternionRotation.setFromEuler(new Euler(0, mouseAngle + Math.PI / 2 , 0));
        knightBody.current.setRotation(quaternionRotation);
      }
      
      /**
       * Camera Movement
       */
        const knightPosition = knightBody.current.translation();
  
        const cameraPosition = new Vector3(knightPosition.x, knightPosition.y + 3, knightPosition.z + 4);
  
        const cameraTarget = new Vector3();
        cameraTarget.copy(knightPosition);
        cameraTarget.z -= 5
        // cameraTarget.y += 0.25;
  
        state.camera.position.copy(cameraPosition);
        state.camera.lookAt(cameraTarget) 
    });
};
    
export default MouseController;