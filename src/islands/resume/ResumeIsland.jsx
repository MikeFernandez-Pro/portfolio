import SleepText from './SleepText.jsx';
import BonfireSmoke from './BonfireSmoke.jsx';
import { Grass } from './grass/Grass.jsx';

// The Resume island's world-space props (the flags are island-space GLB
// meshes: they stay under the island group, see Islands.jsx)
const ResumeIsland = () => (
  <>
    <SleepText />
    <BonfireSmoke />
    <Grass />
  </>
);

export { ResumeIsland };
