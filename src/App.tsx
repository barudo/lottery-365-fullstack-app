import {
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useState,
} from 'react'
import './App.css'

type LoginForm = {
  email: string
  password: string
}

type RegistrationForm = {
  name: string
  lastname: string
  email: string
  password: string
  confirmPassword: string
}

type ApiErrorResponse = {
  detail?: string
  errors?: Record<string, string[]>
  message?: string
  title?: string
}

type LoginResponse = {
  accessToken: string
  expiresAt: string
  tokenType: string
  user: {
    email: string
    id: string
    lastname: string
    name: string
    role: string
  }
}

type DrawResponse = {
  drawnAt: string
  id: string
  numbers: number[]
  roundNumber: number
}

type DrawBroadcast = {
  currentDraw: DrawResponse
  previousDraws: DrawResponse[]
}

type MeResponse = {
  createdAt: string
  email: string
  id: string
  lastname: string
  name: string
  role: string
}

type TicketHistoryResponse = {
  createdAt: string
  drawNumbers: number[] | null
  drawStatus: string
  id: string
  numbers: number[]
  roundId: number
}

const initialForm: LoginForm = {
  email: '',
  password: '',
}

const initialRegistrationForm: RegistrationForm = {
  name: '',
  lastname: '',
  email: '',
  password: '',
  confirmPassword: '',
}

const ticketNumbers = Array.from({ length: 45 }, (_, index) => index + 1)

function App() {
  const [path, setPath] = useState(window.location.pathname)
  const [isAuthenticated, setIsAuthenticated] = useState(hasActiveSession)
  const [userRole, setUserRole] = useState(getCurrentUserRole)
  const [latestDraw, setLatestDraw] = useState<DrawBroadcast | null>(null)

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const socket = new WebSocket(getWebSocketUrl('/ws'))

    socket.addEventListener('message', (event) => {
      const payload = JSON.parse(event.data) as { data?: DrawBroadcast; event?: string }

      if (payload.event === 'admin-draw' && payload.data) {
        setLatestDraw(payload.data)
      }
    })

    return () => {
      socket.close()
    }
  }, [isAuthenticated])

  const navigate =
    (nextPath: string) =>
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      setCurrentPath(nextPath, setPath)
    }

  if (path === '/register') {
    return <RegistrationPage onNavigateLogin={navigate('/')} />
  }

  if (path === '/profile') {
    return (
      <ProtectedRoute isAuthenticated={isAuthenticated} setPath={setPath}>
        <ProfilePage onNavigate={navigate} onLogout={() => logout(setIsAuthenticated, setUserRole, setPath)} />
      </ProtectedRoute>
    )
  }

  if (path === '/tickets') {
    return (
      <ProtectedRoute isAuthenticated={isAuthenticated} setPath={setPath}>
        <TicketsPage onNavigate={navigate} onLogout={() => logout(setIsAuthenticated, setUserRole, setPath)} />
      </ProtectedRoute>
    )
  }

  if (path === '/draw') {
    return (
      <ProtectedRoute isAuthenticated={isAuthenticated} setPath={setPath}>
        <DrawPage
          isAdmin={userRole === 'Admin'}
          latestDraw={latestDraw}
          onNavigate={navigate}
          onLogout={() => logout(setIsAuthenticated, setUserRole, setPath)}
        />
      </ProtectedRoute>
    )
  }

  return (
    <LoginPage
      onLogin={() => {
        setIsAuthenticated(true)
        setUserRole(getCurrentUserRole())
        setCurrentPath('/profile', setPath)
      }}
      onNavigateRegister={navigate('/register')}
    />
  )
}

type LoginPageProps = {
  onLogin: () => void
  onNavigateRegister: (event: MouseEvent<HTMLAnchorElement>) => void
}

function LoginPage({ onLogin, onNavigateRegister }: LoginPageProps) {
  const [form, setForm] = useState(initialForm)
  const [messages, setMessages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField =
    (field: keyof LoginForm) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessages([])
    setIsSubmitting(true)

    try {
      const response = await apiFetch('/api/auth/login', {
        body: JSON.stringify(form),
        method: 'POST',
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as ApiErrorResponse | null
        setMessages(getErrorMessages(error, 'Invalid email or password.'))
        return
      }

      const payload = (await response.json()) as LoginResponse
      localStorage.setItem('lottery365.accessToken', payload.accessToken)
      localStorage.setItem('lottery365.tokenExpiresAt', payload.expiresAt)
      localStorage.setItem('lottery365.userRole', payload.user.role)
      setForm(initialForm)
      setMessages([`Logged in as ${payload.user.email}.`])
      onLogin()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-header">
          <h1>LUTRIJA365</h1>
          <p>LOG IN</p>
        </div>

        <div className="login-fields">
          <input
            aria-label="Email"
            autoComplete="email"
            onChange={updateField('email')}
            placeholder="Email"
            required
            type="email"
            value={form.email}
          />
          <input
            aria-label="Password"
            autoComplete="current-password"
            onChange={updateField('password')}
            placeholder="Password"
            required
            type="password"
            value={form.password}
          />
        </div>

        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'PRIJAVLJUJEM...' : 'PRIJAVI SE'}
        </button>

        {messages.length > 0 && (
          <div className="login-messages" role="alert">
            {messages.map((currentMessage) => (
              <p key={currentMessage}>{currentMessage}</p>
            ))}
          </div>
        )}

        <a className="auth-link" href="/register" onClick={onNavigateRegister}>
          Create account
        </a>
      </form>
    </main>
  )
}

type ProtectedRouteProps = {
  children: ReactNode
  isAuthenticated: boolean
  setPath: (path: string) => void
}

function ProtectedRoute({ children, isAuthenticated, setPath }: ProtectedRouteProps) {
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentPath('/', setPath)
    }
  }, [isAuthenticated, setPath])

  if (!isAuthenticated) {
    return null
  }

  return children
}

type ProtectedPageProps = {
  onLogout: () => void
  onNavigate: (path: string) => (event: MouseEvent<HTMLAnchorElement>) => void
}

type DrawPageProps = ProtectedPageProps & {
  isAdmin: boolean
  latestDraw: DrawBroadcast | null
}

type EditProfileForm = {
  name: string
  lastname: string
  email: string
}

function ProfilePage({ onLogout, onNavigate }: ProtectedPageProps) {
  const [profile, setProfile] = useState<MeResponse | null>(null)
  const [tickets, setTickets] = useState<TicketHistoryResponse[]>([])
  const [message, setMessage] = useState('Loading profile...')
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<EditProfileForm>({
    name: '',
    lastname: '',
    email: '',
  })
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    let isMounted = true

    Promise.all([apiFetch('/api/me'), apiFetch('/api/tickets')])
      .then(async ([profileResponse, ticketsResponse]) => {
        if (!profileResponse.ok || !ticketsResponse.ok) {
          throw new Error('Profile request failed.')
        }

        const nextProfile = (await profileResponse.json()) as MeResponse
        const nextTickets = (await ticketsResponse.json()) as TicketHistoryResponse[]

        if (isMounted) {
          setProfile(nextProfile)
          setTickets(nextTickets)
          setMessage('')
        }
      })
      .catch(() => {
        if (isMounted) {
          setMessage('Profile could not be loaded.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name,
        lastname: profile.lastname,
        email: profile.email,
      })
    }
  }, [profile])

  const openEditModal = () => {
    setSaveError('')
    setIsEditModalOpen(true)
  }

  const closeEditModal = () => setIsEditModalOpen(false)

  const handleEditChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setEditForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!profile) {
      return
    }

    setSaveError('')

    try {
      const response = await apiFetch('/api/me', {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        const errorMessage =
          errorBody?.message ?? errorBody?.detail ??
          (typeof errorBody === 'object' && errorBody !== null
            ? Object.values(errorBody).flat().join(' ')
            : null) ??
          'Unable to update profile.'

        setSaveError(errorMessage)
        return
      }

      const updatedProfile = (await response.json()) as MeResponse
      setProfile(updatedProfile)
      setIsEditModalOpen(false)
    } catch {
      setSaveError('Unable to update profile. Please try again.')
    }
  }

  return (
    <AppShell activePath="/profile" onLogout={onLogout} onNavigate={onNavigate}>
      <section className="profile-page">
        <div className="profile-summary">
          <div className="profile-photo" aria-label="Profile photo" />
          <div className="profile-details">
            <dl>
              <div>
                <dt>IME:</dt>
                <dd>{profile?.name ?? '-'}</dd>
              </div>
              <div>
                <dt>PREZIME:</dt>
                <dd>{profile?.lastname ?? '-'}</dd>
              </div>
              <div>
                <dt>E MAIL:</dt>
                <dd>{profile?.email ?? '-'}</dd>
              </div>
            </dl>
            <button type="button" onClick={openEditModal}>EDIT PROFILE</button>
          </div>
        </div>

        {isEditModalOpen && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title" onClick={closeEditModal}>
            <div className="edit-profile-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <h2 id="edit-profile-title">Edit Profile</h2>
                <button type="button" className="modal-close-button" onClick={closeEditModal} aria-label="Close">
                  ×
                </button>
              </div>
              <form onSubmit={saveProfile} className="modal-content">
                <div className="modal-field">
                  <label htmlFor="edit-name">First Name</label>
                  <input
                    id="edit-name"
                    name="name"
                    type="text"
                    value={editForm.name}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="modal-field">
                  <label htmlFor="edit-lastname">Last Name</label>
                  <input
                    id="edit-lastname"
                    name="lastname"
                    type="text"
                    value={editForm.lastname}
                    onChange={handleEditChange}
                  />
                </div>
                <div className="modal-field">
                  <label htmlFor="edit-email">Email</label>
                  <input
                    id="edit-email"
                    name="email"
                    type="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                  />
                </div>
                {saveError && <p className="modal-error">{saveError}</p>}
                <div className="modal-actions">
                  <button type="button" className="modal-secondary-button" onClick={closeEditModal}>
                    Cancel
                  </button>
                  <button type="submit" className="modal-primary-button">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <h2 className="profile-table-title">ODIGRANI LISTIĆI:</h2>

        {message ? (
          <p className="profile-message" role="status">
            {message}
          </p>
        ) : (
          <div className="profile-table-wrap">
            <table className="profile-ticket-table">
              <thead>
                <tr>
                  <th>TICEKT ID</th>
                  <th>ROUND ID</th>
                  <th>YOUR NUMBERS</th>
                  <th>DRAW NUMBERS</th>
                  <th>STATUS</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>{formatTicketId(ticket.id)}</td>
                    <td>{ticket.roundId}</td>
                    <td>{formatNumbers(ticket.numbers)}</td>
                    <td>{ticket.drawNumbers ? formatNumbers(ticket.drawNumbers) : ''}</td>
                    <td className={`ticket-status ticket-status-${ticket.drawStatus.toLowerCase()}`}>
                      {formatDrawStatus(ticket.drawStatus)}
                    </td>
                    <td>
                      <button className="print-ticket-button" type="button" aria-label="Print ticket" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  )
}

function TicketsPage({ onLogout, onNavigate }: ProtectedPageProps) {
  const [manualNumbers, setManualNumbers] = useState<number[]>([])
  const [randomNumbers, setRandomNumbers] = useState<number[]>([])
  const [message, setMessage] = useState('')

  const toggleManualNumber = (number: number) => {
    setMessage('')
    setManualNumbers((currentNumbers) => {
      if (currentNumbers.includes(number)) {
        return currentNumbers.filter((currentNumber) => currentNumber !== number)
      }

      if (currentNumbers.length >= 6) {
        return currentNumbers
      }

      return [...currentNumbers, number]
    })
  }

  const resetManualTicket = () => {
    setManualNumbers([])
    setMessage('')
  }

  const generateRandomTicket = () => {
    setMessage('')

    setRandomNumbers((currentNumbers) => {
      if (currentNumbers.length >= 6) {
        return []
      }

      return [...currentNumbers, getRandomDrawNumber(currentNumbers)]
    })
  }

  const saveTicket = async (numbers: number[]) => {
    if (numbers.length !== 6) {
      setMessage('Choose 6 numbers before saving.')
      return
    }

    const response = await apiFetch('/tickets', {
      body: JSON.stringify({ numbers }),
      method: 'POST',
    })

    if (!response.ok) {
      setMessage('Ticket could not be saved.')
      return
    }

    setMessage(`Ticket saved: ${numbers.join(', ')}`)
  }

  return (
    <AppShell activePath="/tickets" onLogout={onLogout} onNavigate={onNavigate}>
      <section className="ticket-page">
        <div className="ticket-section">
          <div className="ticket-left">
            <h2>MAKE YOUR OWN TICKET</h2>
            <div className="number-grid" aria-label="Ticket numbers">
              {ticketNumbers.map((number) => (
                <button
                  aria-pressed={manualNumbers.includes(number)}
                  key={number}
                  onClick={() => toggleManualNumber(number)}
                  type="button"
                >
                  {number}
                </button>
              ))}
            </div>
          </div>

          <TicketCircles numbers={manualNumbers} />

          <div className="ticket-buttons">
            {manualNumbers.length === 6 && (
              <button className="reset-ticket-button" onClick={resetManualTicket} type="button">
                RESET
              </button>
            )}

            <button className="save-ticket-button" onClick={() => saveTicket(manualNumbers)} type="button">
              SAVE
            </button>
          </div>
        </div>

        <div className="ticket-section random-ticket-section">
          <div className="ticket-left">
            <h2>RANDOM TICKET</h2>
            <button className="random-ticket-button" onClick={generateRandomTicket} type="button">
              {randomNumbers.length >= 6 ? 'RESET' : 'RANDOM'}
            </button>
          </div>

          <TicketCircles numbers={randomNumbers} />

          <div className="ticket-buttons">
            <button className="save-ticket-button" onClick={() => saveTicket(randomNumbers)} type="button">
              SAVE
            </button>
          </div>
        </div>

        {message && (
          <p className="ticket-message" role="status">
            {message}
          </p>
        )}
      </section>
    </AppShell>
  )
}

type TicketCirclesProps = {
  numbers: number[]
}

function TicketCircles({ numbers }: TicketCirclesProps) {
  return (
    <div className="ticket-circles" aria-label="Selected ticket numbers">
      {Array.from({ length: 6 }, (_, index) => (
        <span className="ticket-circle" key={index}>
          {numbers[index] ?? ''}
        </span>
      ))}
    </div>
  )
}

function DrawPage({ isAdmin, latestDraw, onLogout, onNavigate }: DrawPageProps) {
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (isAdmin || !latestDraw) {
      return
    }

    const timeouts: number[] = []
    setDrawnNumbers([])
    setMessage(`Round ${latestDraw.currentDraw.roundNumber}`)

    latestDraw.currentDraw.numbers.forEach((number, index) => {
      const timeout = window.setTimeout(() => {
        setDrawnNumbers((currentNumbers) => [...currentNumbers, number])
      }, index * 500)

      timeouts.push(timeout)
    })

    return () => {
      timeouts.forEach((timeout) => {
        window.clearTimeout(timeout)
      })
    }
  }, [isAdmin, latestDraw])

  const handleDraw = async () => {
    setMessage('')

    if (drawnNumbers.length >= 6) {
      setDrawnNumbers([])
      return
    }

    setIsDrawing(true)

    const nextNumbers = [...drawnNumbers, getRandomDrawNumber(drawnNumbers)]
    setDrawnNumbers(nextNumbers)

    if (nextNumbers.length < 6) {
      setIsDrawing(false)
      return
    }

    try {
      const response = await apiFetch('/api/draws', {
        body: JSON.stringify({ numbers: nextNumbers }),
        method: 'POST',
      })

      setMessage(response.ok ? 'Draw published.' : 'Draw could not be saved.')
    } finally {
      setIsDrawing(false)
    }
  }

  return (
    <AppShell activePath="/draw" onLogout={onLogout} onNavigate={onNavigate}>
      <section className="admin-draw">
        {isAdmin ? (
          <>
            <h2>ADMIN DRAW NUMBERS</h2>
            <div className="draw-circles" aria-label="Drawn numbers">
              {Array.from({ length: 6 }, (_, index) => (
                <span className="draw-circle" key={index}>
                  {drawnNumbers[index] ?? ''}
                </span>
              ))}
            </div>
            <button className="draw-button" disabled={isDrawing} onClick={handleDraw} type="button">
              {drawnNumbers.length >= 6 ? 'RESET' : 'DRAW'}
            </button>
            {message && (
              <p className="draw-message" role="status">
                {message}
              </p>
            )}
          </>
        ) : (
          <>
            <h2>DRAW NUMBERS</h2>
            <div className="draw-circles" aria-label="Latest drawn numbers">
              {Array.from({ length: 6 }, (_, index) => (
                <span className="draw-circle" key={index}>
                  {drawnNumbers[index] ?? ''}
                </span>
              ))}
            </div>
            <p className="draw-message" role="status">
              {message || 'Waiting for admin draw.'}
            </p>
          </>
        )}
      </section>
    </AppShell>
  )
}

type AppShellProps = ProtectedPageProps & {
  activePath: string
  children: ReactNode
}

function AppShell({ activePath, children, onLogout, onNavigate }: AppShellProps) {
  return (
    <main className="app-page">
      <header className="app-header">
        <h1>LUTRIJA365</h1>
        <nav aria-label="Main navigation">
          <a
            aria-current={activePath === '/profile' ? 'page' : undefined}
            href="/profile"
            onClick={onNavigate('/profile')}
          >
            PROFILE
          </a>
          <a
            aria-current={activePath === '/tickets' ? 'page' : undefined}
            href="/tickets"
            onClick={onNavigate('/tickets')}
          >
            NEW TICKET
          </a>
          <a
            aria-current={activePath === '/draw' ? 'page' : undefined}
            href="/draw"
            onClick={onNavigate('/draw')}
          >
            DRAW
          </a>
          <button type="button" onClick={onLogout}>
            LOGOUT
          </button>
        </nav>
      </header>

      {children}
    </main>
  )
}

type RegistrationPageProps = {
  onNavigateLogin: (event: MouseEvent<HTMLAnchorElement>) => void
}

function RegistrationPage({ onNavigateLogin }: RegistrationPageProps) {
  const [form, setForm] = useState(initialRegistrationForm)
  const [messages, setMessages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField =
    (field: keyof RegistrationForm) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value,
      }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessages([])
    setIsSubmitting(true)

    try {
      const response = await apiFetch('/users', {
        body: JSON.stringify(form),
        method: 'POST',
      })

      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as ApiErrorResponse | null
        setMessages(getErrorMessages(error, 'Registration failed.'))
        return
      }

      setForm(initialRegistrationForm)
      setMessages(['Registration successful.'])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <form className="login-card registration-card" onSubmit={handleSubmit}>
        <div className="login-header registration-header">
          <h1>LUTRIJA365</h1>
          <p>REGISTRATION</p>
        </div>

        <div className="login-fields">
          <input
            aria-label="Name"
            autoComplete="given-name"
            onChange={updateField('name')}
            placeholder="Name"
            required
            type="text"
            value={form.name}
          />
          <input
            aria-label="Lastname"
            autoComplete="family-name"
            onChange={updateField('lastname')}
            placeholder="Lastname"
            required
            type="text"
            value={form.lastname}
          />
          <input
            aria-label="Email"
            autoComplete="email"
            onChange={updateField('email')}
            placeholder="Email"
            required
            type="email"
            value={form.email}
          />
          <input
            aria-label="Password"
            autoComplete="new-password"
            onChange={updateField('password')}
            placeholder="Password"
            required
            type="password"
            value={form.password}
          />
          <input
            aria-label="Confirm password"
            autoComplete="new-password"
            onChange={updateField('confirmPassword')}
            placeholder="Password"
            required
            type="password"
            value={form.confirmPassword}
          />
        </div>

        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? 'REGISTERING' : 'REGISTER'}
        </button>

        {messages.length > 0 && (
          <div className="login-messages" role="alert">
            {messages.map((currentMessage) => (
              <p key={currentMessage}>{currentMessage}</p>
            ))}
          </div>
        )}

        <a className="auth-link" href="/" onClick={onNavigateLogin}>
          Back to login
        </a>
      </form>
    </main>
  )
}

function getErrorMessages(error: ApiErrorResponse | null, fallbackMessage: string) {
  if (!error) {
    return [fallbackMessage]
  }

  if (error.errors) {
    const validationMessages = Object.values(error.errors).flat()

    if (validationMessages.length > 0) {
      return validationMessages
    }
  }

  return [error.message ?? error.detail ?? error.title ?? fallbackMessage]
}

function hasActiveSession() {
  const token = localStorage.getItem('lottery365.accessToken')
  const expiresAt = localStorage.getItem('lottery365.tokenExpiresAt')

  if (!token || !expiresAt) {
    return false
  }

  return new Date(expiresAt).getTime() > Date.now()
}

function logout(
  setIsAuthenticated: (isAuthenticated: boolean) => void,
  setUserRole: (role: string | null) => void,
  setPath: (path: string) => void,
) {
  localStorage.removeItem('lottery365.accessToken')
  localStorage.removeItem('lottery365.tokenExpiresAt')
  localStorage.removeItem('lottery365.userRole')
  setIsAuthenticated(false)
  setUserRole(null)
  setCurrentPath('/', setPath)
}

function setCurrentPath(nextPath: string, setPath: (path: string) => void) {
  window.history.pushState(null, '', nextPath)
  setPath(nextPath)
}

function getCurrentUserRole() {
  const storedRole = localStorage.getItem('lottery365.userRole')

  if (storedRole) {
    return storedRole
  }

  const token = localStorage.getItem('lottery365.accessToken')

  if (!token) {
    return null
  }

  try {
    const encodedPayload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(encodedPayload)) as { role?: string }

    return payload.role ?? null
  } catch {
    return null
  }
}

function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5121'
}

function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const token = localStorage.getItem('lottery365.accessToken')

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  })
}

function getWebSocketUrl(path: string) {
  const apiUrl = new URL(getApiBaseUrl())
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  apiUrl.pathname = path

  return apiUrl.toString()
}

function getRandomDrawNumber(existingNumbers: number[]) {
  let number = crypto.getRandomValues(new Uint32Array(1))[0] % 49 + 1

  while (existingNumbers.includes(number)) {
    number = crypto.getRandomValues(new Uint32Array(1))[0] % 49 + 1
  }

  return number
}

function formatTicketId(id: string) {
  return id.replace(/-/g, '').slice(0, 6)
}

function formatNumbers(numbers: number[]) {
  return numbers.join(' ')
}

function formatDrawStatus(status: string) {
  return status === 'Loading' ? 'LOADING' : status.toUpperCase()
}

export default App
