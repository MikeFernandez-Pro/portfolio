import { MagicBooks } from './MagicBooks';
import { MagicGlyphs } from './MagicGlyphs';
import { Cauldron } from './Cauldron';
// PROTOTYPE (skills TextGeometry) - throwaway branch only
import { FloatingSkillsTextPrototype } from './FloatingSkillsText.prototype';

const SkillsIsland = props => {
  const { island } = props;

  return (
    <>
      <Cauldron island={island} />
      <MagicBooks island={island} />
      <FloatingSkillsTextPrototype island={island} />
      <MagicGlyphs island={island} />
    </>
  );
};

export { SkillsIsland };
