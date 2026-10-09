import { Well } from './Well';
import { Forge } from './forge/Forge';
import { XSign } from './XSign';

const ContactIsland = props => {
  const { islandNodes, islandAnimations } = props;

  return (
    <>
      <Well islandNodes={islandNodes} />
      <Forge islandAnimations={islandAnimations} />
      <XSign />
    </>
  );
};

export { ContactIsland };
