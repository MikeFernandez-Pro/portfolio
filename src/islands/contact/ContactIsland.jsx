import { Well } from './Well';
import { Forge } from './forge/Forge';
import { XSign } from './XSign';

const ContactIsland = props => {
  const { islandAnimations } = props;

  return (
    <>
      <Well />
      <Forge islandAnimations={islandAnimations} />
      <XSign />
    </>
  );
};

export { ContactIsland };
