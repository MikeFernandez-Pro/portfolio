import { MagicBooks } from './MagicBooks';
import { FloatingSkills } from './FloatingSkills';
import { MagicGlyphs } from './MagicGlyphs';

const SkillsIsland = props => {
  const { island } = props;

  return (
    <>
      <MagicBooks island={island} />
      <FloatingSkills island={island} />
      <MagicGlyphs island={island} />
    </>
  );
};

export { SkillsIsland };
