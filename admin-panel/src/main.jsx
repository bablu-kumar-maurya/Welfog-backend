import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import welfog from "./assets/welfog.png";

const link = document.querySelector("link[rel='icon']");
if (link) {
  link.href = welfog;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
