import ReactNipple from 'react-nipple';
import { useStore } from "./ZustandStorage.jsx";
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import nipplejs from 'nipplejs';


const OPTIONS = {
    mode: 'dynamic',
    position: { top: '50%', left: '50%' },
    size: 200,
    dynamicPage: true,
    follow: false,
    restOpacity: 1,
    maxNumberOfNipples: 1,

}



const Joystick = () => {

    const isMobile = useStore(state => state.isMobile);
    const joystickRef = useRef(false)

    var manager = nipplejs.create(OPTIONS);

    // window.addEventListener('resize', () => {
    //     if (managerRef.current) {
    //         managerRef.current.destroy();
    //         managerRef.current = undefined;
    //         console.log(managerRef.current)
    //         managerRef.current = nipplejs.create({
    //             mode: 'dynamic',
    //             position: { top: '50%', left: '50%' },
    //             size: window.innerWidth < window.innerHeight ?
    //                 Math.min(100, window.innerWidth / 4) :
    //                 Math.min(100, window.innerHeight / 4),
    //             dynamicPage: true,
    //             follow: false,
    //             restOpacity: 1,
    //             maxNumberOfNipples: 1,
    //         });
    //     }
    // })

    manager.on('move', function (evt, data) {
        useStore.setState({ joystickAngle: data.angle.radian })
    })

    manager.on('end', function (evt, data) {

        useStore.setState({ joystickAngle: undefined })
    })


    return (
        <>
        </>
        // <ReactNipple
        //     options={{
        //         mode: 'dynamic',
        //         position: { top: '50%', left: '50%' },
        //         size:  window.innerWidth < window.innerHeight ?
        //             Math.min(150, window.innerWidth / 4) :
        //             Math.min(150, window.innerHeight / 4),
        //         dynamicPage: true,
        //         // follow: false,
        //         // restOpacity: 0.5,
        //     }}
        //     style={{
        //         position: 'absolute',
        //         bottom: window.innerWidth < window.innerHeight ? "5vw" : "-5vh",
        //         left:  window.innerWidth < window.innerHeight ? "50%" : "5vw",
        //         transform:  window.innerWidth < window.innerHeight ? "translate(-50%, -50%)" : "",
        //         //       outline: '1px dashed red',
        //         width: 150,
        //         height: 150,
        //         zIndex: 4,
        //         visibility:  "visible" 
        //     }}
        //     onMove={(evt, data) => {
        //         useStore.setState({ joystickAngle: data.angle.radian })
        //     }}
        //     onEnd={() => {
        //         useStore.setState({ joystickAngle: undefined })
        //     }}
        // />
    );
};

export default Joystick;