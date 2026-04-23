import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { getCardCode } from './lib/api'
import AdminPage from './pages/admin'
import CardEntry from './pages/user/CardEntry'
import Home from './pages/user/Home'
import Analysis from './pages/user/Analysis'
import EmotionalChat from './pages/user/EmotionalChat'
import ConflictAnalysis from './pages/user/ConflictAnalysis'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!getCardCode()) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CardEntry />} />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/analysis" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
        <Route path="/emotional" element={<ProtectedRoute><EmotionalChat /></ProtectedRoute>} />
        <Route path="/conflict" element={<ProtectedRoute><ConflictAnalysis /></ProtectedRoute>} />
        <Route path="/x9f3k1" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  )
}
