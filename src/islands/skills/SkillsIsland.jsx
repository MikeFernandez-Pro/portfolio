import { MagicBooks } from './MagicBooks';
import { SkillsGlyph } from './SkillsGlyph';
import { Cauldron } from './cauldron/Cauldron';
import { FloatingSkills } from './FloatingSkills';

const SkillsIsland = props => {
  const { island } = props;

  return (
    <>
      <Cauldron island={island} />
      <MagicBooks island={island} />
      <FloatingSkills />
      <SkillsGlyph island={island} />
    </>
  );
};

export { SkillsIsland };
