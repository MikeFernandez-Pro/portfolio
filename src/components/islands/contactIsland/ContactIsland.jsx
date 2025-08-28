import { Well } from './Well';
import { Forge } from './forge/Forge';

const ContactIsland = props => {
  const { islandNodes, islandAnimations } = props;

  return (
    <>
      {/* <LiquidsShaders
            well={island.scene.children[0].children[0].children[6]}
            cauldron={island.scene.children[0].children[0].children[7]}
          /> */}
      <Well islandNodes={islandNodes} />
      <Forge islandAnimations={islandAnimations} />
    </>
  );
};

export { ContactIsland };
