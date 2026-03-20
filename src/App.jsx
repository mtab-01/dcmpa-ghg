import { useState } from 'react'
import { colors } from './theme'
import { useIsMobile } from './hooks/useWindowWidth'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import VideoLibrary from './pages/VideoLibrary'
import PracticeCalendar from './pages/PracticeCalendar'
import ExpenseTracker from './pages/ExpenseTracker'
import Settings from './pages/Settings'

const PAGES = {
  videos: VideoLibrary,
  calendar: PracticeCalendar,
  expenses: ExpenseTracker,
  settings: Settings,
}

export default function App() {
  const [activePage, setActivePage] = useState('videos')
  const isMobile = useIsMobile()

  const PageComponent = PAGES[activePage] || VideoLibrary

  return (
    <div style={{
      display: 'flex',
      height: '100dvh',
      background: colors.bg,
      overflow: 'hidden',
    }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
      )}

      {/* Main content */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: isMobile ? '70px' : '0',
        // iOS momentum scrolling
        WebkitOverflowScrolling: 'touch',
      }}>
        <PageComponent />
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <BottomNav activePage={activePage} onNavigate={setActivePage} />
      )}
    </div>
  )
}
