import { MagicBooks } from './MagicBooks';
import { FloatingSkills } from './FloatingSkills';
import { MagicGlyphs } from './MagicGlyphs';
import { Cauldron } from './Cauldron';

const SkillsIsland = props => {
  const { island } = props;

  return (
    <>
      <Cauldron island={island} />
      <MagicBooks island={island} />
      <FloatingSkills island={island} />
      <MagicGlyphs island={island} />
    </>
  );
};

export { SkillsIsland };
