import { useEffect } from 'react';
import nipplejs from 'nipplejs';
import gsap from 'gsap';

import { useStore } from '#store';
import { IS_MOBILE_DEVICE } from '#utils/utils.js';

// ScreenOrientation constants
const PORTRAIT_ORIENTATION = 'portrait-primary';

// Joystick configuration constants
const DEFAULT_CONFIGURATION = {
  mode: 'static',
  position: { bottom: '8rem', left: '50%' },
  dynamicPage: true,
  follow: false,
  restOpacity: 0.5,
  maxNumberOfJoysticks: 1,
};

// Joystick events constants
const MOVE_EVENT = 'move';
const END_EVENT = 'end';

const createJoystick = orientationType => {
  return nipplejs.create({
    ...DEFAULT_CONFIGURATION,
    size:
      orientationType === PORTRAIT_ORIENTATION
        ? window.innerWidth * 0.2
        : window.innerHeight * 0.3,
    position:
      orientationType === PORTRAIT_ORIENTATION
        ? { bottom: '10%', left: '50%' }
        : { bottom: '10vw', left: '10vw' },
  });
};

const setupJoystickEvents = joystick => {
  joystick.on('move', function (evt) {
    if (evt.data.angle.radian !== Math.PI) {
      useStore.setState({ joystickAngle: evt.data.angle.radian });
    }
  });

  joystick.on('end', function () {
    useStore.setState({ joystickAngle: undefined });
  });
};

const resetJoystick = joystick => {
  joystick.off(MOVE_EVENT);
  joystick.off(END_EVENT);
  joystick.destroy();
};

const handleOrientationChange = joystick => {
  return function curriedFunction(event) {
    resetJoystick(joystick);
    joystick = createJoystick(event.target.type);
    setupJoystickEvents(joystick);
  };
};

let joystick = undefined;

const Joystick = () => {
  useEffect(() => {
    // Hooks must run unconditionally; the mobile gate lives inside instead
    if (!IS_MOBILE_DEVICE) return;

    // Kept so cleanup removes the listener that was actually registered
    let orientationHandler;
    let setupTimeout;

    const unsubExperienceStarted = useStore.subscribe(
      state => state.experienceStarted,
      experienceStarted => {
        if (!experienceStarted) return;

        setupTimeout = setTimeout(() => {
          // Initialize joystick
          joystick = createJoystick(screen.orientation.type);
          setupJoystickEvents(joystick);

          // Fade Joystick opacity
          const joystickInstance = joystick.all.values().next().value;
          if (joystickInstance) {
            gsap.to(joystickInstance.ui.el.style, { opacity: 1, duration: 1 });
          }

          // Trigger screen rotation and update joystick size and position
          orientationHandler = handleOrientationChange(joystick);
          screen.orientation.addEventListener('change', orientationHandler);
        }, 5000);
      }
    );

    // Cleanup subscriber and event listener
    return () => {
      unsubExperienceStarted();
      clearTimeout(setupTimeout);
      if (orientationHandler) {
        screen.orientation.removeEventListener('change', orientationHandler);
      }
    };
  }, []);

  return null;
};

export default Joystick;
