import { ProjectsPortals } from './ProjectsPortals.jsx';
import { PressurePlates } from './PressurePlates.jsx';

const ProjectIsland = props => {
  const { island } = props;

  return (
    <>
      <ProjectsPortals island={island} />
      <PressurePlates island={island} />
    </>
  );
};

export { ProjectIsland };
