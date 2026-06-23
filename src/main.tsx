import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// StrictMode intentionally double-mounts effects in dev. With p5 (and its
// deferred async setup) that race-creates a second, frozen canvas that can
// sit on top of the live one. It's a no-op in production anyway, so we
// render without it to keep exactly one p5 instance alive.
createRoot(document.getElementById('root')!).render(<App />)
