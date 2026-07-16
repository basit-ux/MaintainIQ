import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ScanLine, LayoutGrid, Boxes, ListChecks, LogOut, User, MessageCircle } from 'lucide-react'
import { useChatUnread } from '../context/ChatContext'
import { useAuth } from '../context/AuthContext'

function NavItem({ to, icon: Icon, label, badge }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          isActive ? 'bg-amber/15 text-amber' : 'text-steel-200 hover:text-steel-50 hover:bg-steel-700'
        }`
      }
    >
      <Icon size={16} strokeWidth={2} />
      {label}
      {!!badge && (
        <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-mono leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const unread = useChatUnread()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-30 border-b border-steel-500 bg-steel-900/95 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-md bg-amber/15 border border-amber/30 flex items-center justify-center">
            <ScanLine size={18} className="text-amber" strokeWidth={2.2} />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight text-steel-50">
            Maintain<span className="text-amber">IQ</span>
          </span>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1">
            <NavItem to="/dashboard" icon={LayoutGrid} label="Dashboard" />
            <NavItem to="/assets" icon={Boxes} label="Assets" />
            <NavItem to="/issues" icon={ListChecks} label="Issues" />
            <NavItem to="/chat" icon={MessageCircle} label="Chat" badge={unread} />
          </nav>
        )}

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 pl-3 pr-1 py-1 rounded-md border border-steel-500">
              <div className="w-6 h-6 rounded-full bg-steel-600 flex items-center justify-center">
                <User size={13} className="text-steel-200" />
              </div>
              <span className="text-sm text-steel-100">{user.name}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-steel-700 text-steel-300">{user.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-steel-200 hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="px-3 py-2 text-sm font-medium text-steel-200 hover:text-steel-50">Log in</Link>
            <Link to="/signup" className="px-3 py-2 text-sm font-semibold rounded-md bg-amber text-steel-950 hover:bg-amber-light transition-colors">Sign up</Link>
          </div>
        )}
      </div>
      {user && (
        <nav className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
          <NavItem to="/dashboard" icon={LayoutGrid} label="Dashboard" />
          <NavItem to="/assets" icon={Boxes} label="Assets" />
          <NavItem to="/issues" icon={ListChecks} label="Issues" />
          <NavItem to="/chat" icon={MessageCircle} label="Chat" badge={unread} />
        </nav>
      )}
    </header>
  )
}
