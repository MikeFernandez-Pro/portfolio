import { MagicBooks } from './MagicBooks';
import { MagicGlyphs } from './MagicGlyphs';
import { Cauldron } from './Cauldron';
import { FloatingSkills } from './FloatingSkills';

const SkillsIsland = props => {
  const { island } = props;

  return (
    <>
      <Cauldron island={island} />
      <MagicBooks island={island} />
      <FloatingSkills />
      <MagicGlyphs island={island} />
    </>
  );
};

export { SkillsIsland };
