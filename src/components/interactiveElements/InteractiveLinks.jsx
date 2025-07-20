import { Instances, Instance } from '@react-three/drei';
import { useTexture } from '@react-three/drei';
import InteractionImage from '/textures/Enter.webp';

import { IS_MOBILE_DEVICE } from '../../utils/utils.js';
import { interactiveElementsIds } from './interactiveElementsConstants.js';

const InteractiveLinks = props => {
  const { activeLink, activePlateRef, interactionPromptRef } = props;

  const texture = useTexture(InteractionImage);

  return (
    <Instances ref={interactionPromptRef} count={5} limit={5} range={5}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        alphaTest={0.5}
        color={[15, 1.5, 1]}
        toneMapped={false}
      />
      <Instance
        position={[-4.47, 2.45, -8.14]}
        rotation-y={0.4}
        scale={0.1}
        name={interactiveElementsIds.mailBox}
        onClick={() => {
          if (
            activeLink.current &&
            activeLink.current.id === interactiveElementsIds.mailBox &&
            IS_MOBILE_DEVICE
          ) {
            window.location.href = 'mailto:mike.fernandez.pro@gmail.com';
          }
        }}
      />
      <Instance
        position={[-3.37, 2.45, -8.63]}
        rotation-y={0.4}
        scale={0.1}
        name={interactiveElementsIds.linkedIn}
        onClick={() => {
          if (
            activeLink.current &&
            activeLink.current.id === interactiveElementsIds.linkedIn &&
            IS_MOBILE_DEVICE
          ) {
            window.open(LINKED_IN_URL, '_blank');
          }
        }}
      />
      <Instance
        position={[-2.26, 2.45, -9.27]}
        rotation-y={0.4}
        scale={0.1}
        name={interactiveElementsIds.vercel}
        onClick={() => {
          if (
            activeLink.current &&
            activeLink.current.id === interactiveElementsIds.vercel &&
            IS_MOBILE_DEVICE
          ) {
            window.open(VERCEL_URL, '_blank');
          }
        }}
      />
      <Instance
        position={[-16.79, 6.16, -36.86]}
        rotation-y={0}
        scale={0.1}
        name={interactiveElementsIds.portal}
        onClick={() => {
          if (
            activeLink.current &&
            activeLink.current.id === interactiveElementsIds.portal &&
            IS_MOBILE_DEVICE
          ) {
            window.open(
              activeLink.current.href[activePlateRef.current],
              '_blank'
            );
          }
        }}
      />
      <Instance
        position={[-9.77, 8, -58.8]}
        rotation-y={0}
        scale={0.1}
        name={interactiveElementsIds.statue}
        onClick={() => {
          if (
            activeLink.current &&
            activeLink.current.id === STATUE_ID &&
            IS_MOBILE_DEVICE
          ) {
            window.open(STATUE_URL, '_blank');
          }
        }}
      />
    </Instances>
  );
};

export { InteractiveLinks };
