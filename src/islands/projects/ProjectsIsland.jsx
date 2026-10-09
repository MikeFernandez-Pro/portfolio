import { ProjectsPortal } from './ProjectsPortal.jsx';
import { ProjectPlates } from './ProjectPlates.jsx';

const ProjectsIsland = props => {
  const { island } = props;

  return (
    <>
      <ProjectsPortal island={island} />
      <ProjectPlates island={island} />
    </>
  );
};

export { ProjectsIsland };
