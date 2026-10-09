import {
  triggerInteractiveLink,
  untriggerInteractiveLink,
  activateInteractiveElementLink,
  activateMagicGlyph,
  selectProject,
} from './interactiveElementsUtils.js';
import { useStore } from '#store';
import { PROJECTS } from '#islands/projects/projects.js';

const MAIL_BOX_ID = 'mailBox';
const LINKEDIN_ID = 'linkedIn';
const VERCEL_ID = 'vercel';
const PORTAL_ID = 'portal';
const STATUE_ID = 'statue';
const MAGIC_GLYPH_ID = 'magicGlyph';

const MAIL_BOX_URL = 'mailto:contact@mike-fernandez.dev';
const LINKEDIN_URL =
  'https://www.linkedin.com/in/mike-fernandez-front-end-dev/';
const VERCEL_URL = 'https://x.com/Rahzell83';
const STATUE_URL = '/CV_Portfolio_Mike.pdf';

const interactiveElementsData = {
  [MAIL_BOX_ID]: {
    userData: {
      id: MAIL_BOX_ID,
      interactiveLinkPosition: [-4.45, 2.5, -8.55],
      interactiveLinkRotationY: 0.45,
      href: MAIL_BOX_URL,
      startInteraction: triggerInteractiveLink,
      closeInteraction: untriggerInteractiveLink,
      activateLink: () => {
        activateInteractiveElementLink(MAIL_BOX_URL, true);
      },
    },
    position: [-4.24, 0.55, -8.07],
    rotation: [0, 0.49, 0],
    scale: [0.9, 0.9, 0.9],
  },
  [LINKEDIN_ID]: {
    userData: {
      id: LINKEDIN_ID,
      interactiveLinkPosition: [-3.4, 2.2, -9.09],
      interactiveLinkRotationY: 0.47,
      href: LINKEDIN_URL,
      startInteraction: triggerInteractiveLink,
      closeInteraction: untriggerInteractiveLink,
      activateLink: () => {
        activateInteractiveElementLink(LINKEDIN_URL);
      },
    },
    position: [-3.11, 0.5, -8.64],
    rotation: [0, 0.49, 0],
    scale: [0.9, 0.9, 0.9],
  },
  [VERCEL_ID]: {
    userData: {
      id: VERCEL_ID,
      interactiveLinkPosition: [-2.26, 2.2, -9.65],
      interactiveLinkRotationY: 0.47,
      href: VERCEL_URL,
      startInteraction: triggerInteractiveLink,
      closeInteraction: untriggerInteractiveLink,
      activateLink: () => {
        activateInteractiveElementLink(VERCEL_URL);
      },
    },
    position: [-2.03, 0.5, -9.2],
    rotation: [0, 0.48, 0],
    scale: [0.9, 0.9, 0.9],
  },
  [PORTAL_ID]: {
    userData: {
      id: PORTAL_ID,
      interactiveLinkPosition: [-16.14, 5.9, -37.3],
      interactiveLinkRotationY: 0,
      startInteraction: triggerInteractiveLink,
      closeInteraction: untriggerInteractiveLink,
      // Opens the selected project
      activateLink: selectedProjectRef => {
        const activatedInteractiveElement =
          useStore.getState().activatedInteractiveElement.current;

        if (activatedInteractiveElement && selectedProjectRef.current) {
          activateInteractiveElementLink(
            PROJECTS[selectedProjectRef.current].url
          );
        }
      },
    },
    position: [-16.1, 5.72, -37.26],
    rotation: [0.43, 0, 0],
    scale: [1.9, 0.97, 3],
  },
  [STATUE_ID]: {
    userData: {
      id: STATUE_ID,
      interactiveLinkPosition: [-9.77, 7.9, -58.8],
      interactiveLinkRotationY: 0,
      href: STATUE_URL,
      startInteraction: triggerInteractiveLink,
      closeInteraction: untriggerInteractiveLink,
      activateLink: () => {
        activateInteractiveElementLink(STATUE_URL);
      },
    },
    position: [-9.76, 6.43, -58.2],
    rotation: [0, 0, 0],
    scale: [1.5, 1, 1.5],
  },
  [MAGIC_GLYPH_ID]: {
    userData: {
      id: MAGIC_GLYPH_ID,
      startInteraction: activateMagicGlyph,
    },
    position: [6.34, 2.69, -33.53],
    rotation: [0, -0.15, 0],
    scale: [2.85, 0.35, 2.85],
  },
  // Project plates, keyed by the project they select
  hoHoNo: {
    userData: {
      id: 'hoHoNo',
      startInteraction: selectProject,
    },
    position: [-15.085, 4.4, -32.45],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  },
  doanTenConVat: {
    userData: {
      id: 'doanTenConVat',
      startInteraction: selectProject,
    },
    position: [-15.085, 4.4, -34.495],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  },
  halloweenChallenge: {
    userData: {
      id: 'halloweenChallenge',
      startInteraction: selectProject,
    },
    position: [-17.14, 4.4, -34.495],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
  },
};

export { PORTAL_ID, MAIL_BOX_URL, interactiveElementsData };
