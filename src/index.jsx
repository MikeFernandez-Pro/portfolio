import App from './App';
import './style.css'
import ReactDOM from 'react-dom/client'
import { StrictMode } from "react";


const root = ReactDOM.createRoot(document.querySelector('#root'))

// document.addEventListener('contextmenu', event => event.preventDefault());

root.render(
    <StrictMode>
        <App />
    </StrictMode>
)