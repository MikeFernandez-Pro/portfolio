const CameraUpdate = ({knightBody, state}) => {

    if (knightBody.current) {
        const knightPosition = knightBody.current.translation();
    
        const cameraPosition = new THREE.Vector3(knightPosition.x, knightPosition.y + 3, knightPosition.z + 4);

        const cameraTarget = new THREE.Vector3();
        cameraTarget.copy(knightPosition);
        cameraTarget.z -= 5
        // cameraTarget.y += 0.25;

        state.camera.position.copy(cameraPosition);
        state.camera.lookAt(cameraTarget)
    }
};

export default CameraUpdate;