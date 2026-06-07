# NeuralTranslate | Full-Stack AI Linguistic Engine

**Version 3.0.0 (Full-Stack Architecture)**

NeuralTranslate is a complete full-stack language translation application built with a Node.js backend and a vanilla frontend using HTML, CSS, and JavaScript.

## 🧩 What is used in this project
- `frontend/index.html`: user interface and translation controls.
- `frontend/style.css`: visual theme, layout, buttons, and animations.
- `frontend/script.js`: client-side logic for translation, voice input, text-to-speech, and history.
- `backend/server.js`: Express server, translation API endpoint, and external MyMemory API proxy.
- `package.json` (root): manages the concurrent startup of frontend and backend.
- `backend/package.json`: installs backend dependencies and starts the Express server.
- `frontend/package.json`: starts the static frontend server using `npx serve`.

## 🛠 Technologies used
- Node.js / Express
- Axios for HTTP requests
- CORS middleware
- dotenv for environment variables
- SpeechRecognition (browser API) for voice input
- SpeechSynthesis (browser API) for text-to-speech output
- MyMemory translation API (`https://api.mymemory.translated.net`)
- `concurrently` for running both backend and frontend together
- `npx serve` for serving the frontend locally

## 📁 Project structure
- `frontend/`
  - `index.html` - UI layout, language selectors, buttons, and display areas.
  - `style.css` - neon cyber theme, responsive layout, particles, and transitions.
  - `script.js` - handles input events, translation requests, audio, copy, and history.
  - `package.json` - frontend start script.
- `backend/`
  - `server.js` - backend translation API and health check.
  - `package.json` - backend dependencies and start scripts.
- `package.json` - root scripts to run frontend and backend together.

## 🚦 Full flow of the application
1. User opens the frontend in a browser.
2. The app loads `frontend/index.html` and applies styles from `frontend/style.css`.
3. `frontend/script.js` initializes UI controls and status indicators.
4. User selects source and target languages, then types text in the source textarea.
5. When typing stops for 1.5 seconds or the user clicks `INITIALIZE TRANSLATION`, `script.js` sends a POST request to the backend.
6. The backend endpoint `/api/translate` receives the request in `backend/server.js`.
7. Backend validates the request body for `text`, `sourceLang`, and `targetLang`.
8. Backend forwards the request to MyMemory translation API using Axios.
9. MyMemory returns translated text to the backend.
10. Backend sends the translated text back to the frontend.
11. The frontend displays the translated output in the output box using a typewriter effect.
12. The frontend stores the translation in the history terminal and optionally speaks the output aloud.

## 🎯 Step-by-step usage
1. Install dependencies in the root folder:
   ```bash
   npm install
   ```
2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   cd ..
   ```
3. Start the full application from the root folder:
   ```bash
   npm run dev
   ```
4. Open the frontend URL shown by `npx serve` or visit the local frontend address in your browser.
5. Enter text in the source field.
6. Select languages from the source and target dropdowns.
7. Click `INITIALIZE TRANSLATION`, or type and wait for auto-translate.
8. Use the audio buttons to speak the source or translated text.
9. Use the microphone button for voice input when supported by the browser.
10. View past translations in the terminal-style history panel.

## 🔌 Backend details
- Endpoint: `POST /api/translate`
- Input payload:
  - `text`
  - `sourceLang`
  - `targetLang`
- Backend uses:
  - Express to create the API server
  - CORS to allow browser requests
  - Axios to call MyMemory translation service
  - dotenv for optional `PORT` environment variable
- Health endpoint: `GET /health`

## 🖥 Frontend features
- Auto-translation while typing with debounce
- Manual translation button
- Language swap button
- Speech-to-text voice input
- Text-to-speech output
- Copy source/target text to clipboard
- Clear input text
- Translation history log
- System status indicator

## 💡 Notes
- `frontend/script.js` uses `window.location.hostname` to select the backend address:
  - `http://localhost:5001` for local development
  - remote fallback for deployed backend
- If you want a custom backend port, set `PORT` in `.env` inside `backend/`.

---
*made by rajnish kumar*
