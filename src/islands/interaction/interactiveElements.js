import { useStore } from '#store';
import { PROJECTS } from '#islands/projects/projects.js';

// The projects portal opens whichever project is selected (none before the
// first plate press: no indicator, nothing to open)
const selectedProjectUrl = () => {
  const projectId = useStore.getState().selectedProject;
  return projectId ? PROJECTS[projectId].url : undefined;
};

/**
 * Every interactive element, as plain data. `sensor`: the box sensor zone
 * (world-space position, rotation, scale) the character steps into. `kind`:
 * - link: an indicator (`indicator`: position, rotationY) floats above it;
 *   Enter or a tap on it opens `href` (a URL, or a function returning one)
 * - plate: a project plate, selects project `id`
 * - glyph: the skills glyph, awakens the Skills island
 * The order of the links and plates is also their point lights' order.
 */
export const INTERACTIVE_ELEMENTS = [
  {
    id: 'mailBox',
    kind: 'link',
    href: 'mailto:contact@mike-fernandez.dev',
    indicator: { position: [-4.45, 2.5, -8.55], rotationY: 0.45 },
    sensor: {
      position: [-4.24, 0.55, -8.07],
      rotation: [0, 0.49, 0],
      scale: [0.9, 0.9, 0.9],
    },
  },
  {
    id: 'linkedIn',
    kind: 'link',
    href: 'https://www.linkedin.com/in/mike-fernandez-front-end-dev/',
    indicator: { position: [-3.4, 2.2, -9.09], rotationY: 0.47 },
    sensor: {
      position: [-3.11, 0.5, -8.64],
      rotation: [0, 0.49, 0],
      scale: [0.9, 0.9, 0.9],
    },
  },
  {
    id: 'xSign',
    kind: 'link',
    href: 'https://x.com/Rahzell83',
    indicator: { position: [-2.26, 2.2, -9.65], rotationY: 0.47 },
    sensor: {
      position: [-2.03, 0.5, -9.2],
      rotation: [0, 0.48, 0],
      scale: [0.9, 0.9, 0.9],
    },
  },
  {
    id: 'projectsPortal',
    kind: 'link',
    href: selectedProjectUrl,
    indicator: { position: [-16.14, 5.9, -37.3], rotationY: 0 },
    sensor: {
      position: [-16.1, 5.72, -37.26],
      rotation: [0.43, 0, 0],
      scale: [1.9, 0.97, 3],
    },
  },
  {
    id: 'statue',
    kind: 'link',
    href: '/CV_Portfolio_Mike.pdf',
    indicator: { position: [-9.77, 7.9, -58.8], rotationY: 0 },
    sensor: {
      position: [-9.76, 6.43, -58.2],
      rotation: [0, 0, 0],
      scale: [1.5, 1, 1.5],
    },
  },
  {
    id: 'skillsGlyph',
    kind: 'glyph',
    sensor: {
      position: [6.34, 2.69, -33.53],
      rotation: [0, -0.15, 0],
      scale: [2.85, 0.35, 2.85],
    },
  },
  {
    id: 'hoHoNo',
    kind: 'plate',
    sensor: {
      position: [-15.085, 4.4, -32.45],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },
  {
    id: 'doanTenConVat',
    kind: 'plate',
    sensor: {
      position: [-15.085, 4.4, -34.495],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },
  {
    id: 'halloweenChallenge',
    kind: 'plate',
    sensor: {
      position: [-17.14, 4.4, -34.495],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    },
  },
];

export const ELEMENTS_BY_ID = Object.fromEntries(
  INTERACTIVE_ELEMENTS.map(element => [element.id, element])
);

// The URL a link opens now (undefined: nothing to open yet)
export const linkHref = element =>
  typeof element.href === 'function' ? element.href() : element.href;
