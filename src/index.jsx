import App from './App';
import './style.css'
import ReactDOM from 'react-dom/client'
import { StrictMode } from "react";

import LegendaryCursor from "legendary-cursor";


const root = ReactDOM.createRoot(document.querySelector('#root'))

document.addEventListener('contextmenu', event => event.preventDefault());
// window.addEventListener("load", () => {
//     LegendaryCursor.init({
//         lineSize:         0.15,
//         opacityDecrement: 0.55,
//         speedExpFactor:   0.,
//         lineExpFactor:    0.6,
//         sparklesCount:    65,
//         maxOpacity:       0.99,  // should be a number between [0 ... 1]
//         texture1: "/textures/galaxyPortalTexture.jpg"
//         // texture1:         "http://path_to_texture",      // texture displayed on mouse hover
//         // texture2:         "http://path_to_texture",      // texture displayed on mouse click
//         // texture3:         "http://path_to_texture",      // texture displayed on sparkles
//     });
// });

root.render(
        <App />
)