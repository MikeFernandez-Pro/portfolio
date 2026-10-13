import { useEffect, useRef, useState } from 'react';

import { subscribeWhenSet, useStore } from '#store';

/**
 * Mobile movement joystick: a fixed base (size and place from style.css,
 * per orientation) and a knob dragged inside it. Publishes the drag
 * direction as `joystickAngle` (radians, counterclockwise from screen
 * right, screen up = PI / 2), undefined at rest. Appears once the intro
 * pan unlocks the controls.
 */
const Joystick = () => {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const dragRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let unsubUnlock;
    const unsubExperienceStarted = subscribeWhenSet(
      state => state.experienceStarted,
      () => {
        // The camera sets introControlsLocked in its own experienceStarted
        // listener, which may run after this one: read it once they all ran
        queueMicrotask(() => {
          unsubUnlock = subscribeWhenSet(
            state => !state.introControlsLocked,
            () => setVisible(true)
          );
        });
      }
    );

    return () => {
      unsubExperienceStarted();
      unsubUnlock?.();
      useStore.setState({ joystickAngle: undefined });
    };
  }, []);

  const moveKnob = (event, animate) => {
    const { centerX, centerY, radius } = dragRef.current;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) {
      dx *= radius / distance;
      dy *= radius / distance;
    }
    // Snaps to the touch point on press, then tracks the finger 1:1
    knobRef.current.style.transition = animate ? '' : 'none';
    knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;

    if (distance > 0) {
      const angle = Math.atan2(-dy, dx);
      useStore.setState({
        joystickAngle: angle < 0 ? angle + 2 * Math.PI : angle,
      });
    }
  };

  const onPointerDown = event => {
    if (dragRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
      radius: rect.width / 2,
    };
    baseRef.current.setPointerCapture(event.pointerId);
    setActive(true);
    moveKnob(event, true);
  };

  const onPointerMove = event => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    moveKnob(event, false);
  };

  const onPointerEnd = event => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    knobRef.current.style.transition = '';
    knobRef.current.style.transform = '';
    setActive(false);
    useStore.setState({ joystickAngle: undefined });
  };

  return (
    <div
      ref={baseRef}
      className={`joystick${visible ? ' is-visible' : ''}${active ? ' is-active' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
    >
      <div ref={knobRef} className="joystick-knob" />
    </div>
  );
};

export default Joystick;
