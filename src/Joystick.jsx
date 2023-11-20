import ReactNipple from 'react-nipple';
import { useStore } from "./ZustandStorage.jsx";
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const Joystick = () => {

    const isMobile = useStore(state => state.isMobile);
    
    return (
        <ReactNipple
                    options={{
                        mode: 'static',
                        position: { top: '50%', left: '50%' },
                        size: 70,
                        dynamicPage: true,
                    }}
                    style={{
                        position: 'absolute',
                        top: "90%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        // outline: '1px dashed red',
                        width: 150,
                        height: 150,
                        zIndex: 4,
                        visibility: isMobile ? "visible" : "hidden"
                    }}
                    onMove={(evt, data) => {
                        useStore.setState({ joystickAngle: data.angle.radian })
                    }}
                    onEnd={() => {
                        useStore.setState({ joystickAngle: null })
                    }}             
                />
    );
};

export default Joystick;