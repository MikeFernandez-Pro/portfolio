import { useStore } from "./ZustandStorage.jsx";
import { useEffect } from "react";
import nipplejs from "nipplejs";

// ScreenOrientation constants
const PORTRAIT_ORIENTATION = "portrait-primary";

// Joystick configuration constants
const DEFAULT_CONFIGURATION = {
    mode: "static",
    position: { bottom: "8rem", left: "50%" },
    dynamicPage: true,
    follow: false,
    restOpacity: 1,
    maxNumberOfNipples: 1,
};

// Joystick events constants
const MOVE_EVENT = "move";
const END_EVENT = "end";

const createJoystick = (orientationType) => {
    return nipplejs.create({
        ...DEFAULT_CONFIGURATION,
        size:
            orientationType === PORTRAIT_ORIENTATION
                ? screen.width * 0.2
                : screen.height * 0.2,
        position:
            orientationType === PORTRAIT_ORIENTATION
                ? { bottom: "10%", left: "50%" }
                : { bottom: "10vw", left: "10vw" },
    });
};

const setupJoystickEvents = (joystick) => {
    joystick.on("move", function (evt, data) {
        if (data.angle.radian !== Math.PI) {
            useStore.setState({ joystickAngle: data.angle.radian });
        }
    });

    joystick.on("end", function (evt, data) {
        useStore.setState({ joystickAngle: undefined });
    });
};

const resetJoystick = (joystick) => {
    joystick.off(MOVE_EVENT);
    joystick.off(END_EVENT);
    joystick.destroy();
};

const handleOrientationChange = (joystick) => {
    return function curriedFunction(event) {
        resetJoystick(joystick);
        joystick = createJoystick(event.target.type);
        setupJoystickEvents(joystick);
    }
};

let joystick = undefined;

const Joystick = () => {
    useEffect(() => {
        const unsubIsMobile = useStore.subscribe(
            (state) => state.isMobile,
            (isMobile) => {
                // Initialize joystick
                joystick = createJoystick(screen.orientation.type);
                setupJoystickEvents(joystick);

                // Trigger screen rotation and update joystick size and position


                screen.orientation.addEventListener("change", handleOrientationChange(joystick));
            }
        );

        // Cleanup subscriber and event listener
        return () => {
            console.log("cleanup");
            screen.orientation.removeEventListener("change", handleOrientationChange(joystick));
            unsubIsMobile();
        };
    }, []);
};

export default Joystick;
