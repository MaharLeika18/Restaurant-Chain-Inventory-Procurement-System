import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import Login from './components/Login'
import CrudDashboard from './components/CrudDashboard'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CrudDashboard />
  </StrictMode>,
)
