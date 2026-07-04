import {
  ArrowRight,
  BadgeCheck,
  Building2,
  ClipboardCheck,
  FileText,
  Gauge,
  LockKeyhole,
  LogOut,
  MailCheck,
  ShieldCheck,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { isSupabaseConfigured, supabase } from './lib/supabase'

const roles = ['Client', 'Vendor', 'Internal'] as const
const roleValues = {
  Client: 'client',
  Vendor: 'vendor',
  Internal: 'internal',
} as const

type PortalRole = (typeof roleValues)[keyof typeof roleValues]

type PortalProfile = {
  id: string
  email: string
  full_name: string | null
  company: string | null
  role: PortalRole
}

type AccessRequest = {
  id: string
  email: string
  requested_role: PortalRole
  company: string | null
  status: string
  created_at: string
}

const accessLanes = [
  {
    icon: Building2,
    title: 'Client Portal',
    description: 'Project status, intake requests, deliverables, and decision logs.',
    status: 'Auth ready',
  },
  {
    icon: UsersRound,
    title: 'Vendor Access',
    description: 'Qualification, documents, bid packages, and project communications.',
    status: 'Approval gated',
  },
  {
    icon: ShieldCheck,
    title: 'Internal Admin',
    description: 'Deal rooms, approvals, operating priorities, and account controls.',
    status: 'Admin queue live',
  },
]

const operatingQueue = [
  'Review pending access requests',
  'Monitor intake drafts',
  'Approve client and vendor portal roles',
  'Keep internal accounts restricted',
]

const readinessItems = [
  { label: 'Domain', value: 'Connected through Vercel DNS' },
  { label: 'Backend', value: 'Supabase forms, auth, and profiles' },
  { label: 'Control', value: 'Internal approval workflow' },
]

function App() {
  const [selectedRole, setSelectedRole] = useState<(typeof roles)[number]>('Client')
  const [accessEmail, setAccessEmail] = useState('')
  const [accessCompany, setAccessCompany] = useState('')
  const [accessStatus, setAccessStatus] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authName, setAuthName] = useState('')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [authStatus, setAuthStatus] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<PortalProfile | null>(null)
  const [profileStatus, setProfileStatus] = useState('')
  const [intakeStatus, setIntakeStatus] = useState('')
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([])
  const [adminStatus, setAdminStatus] = useState('')

  const isInternal = profile?.role === 'internal'

  const roleMessage = useMemo(() => {
    if (selectedRole === 'Vendor') {
      return 'Vendor accounts open qualification, documents, bid packages, and project communication after approval.'
    }

    if (selectedRole === 'Internal') {
      return 'Internal accounts require owner-controlled approval before admin records are visible.'
    }

    return 'Client accounts open requests, project status, deliverables, and decision logs after approval.'
  }, [selectedRole])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setProfile(null)
      setAuthStatus('')
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !session?.user) {
      setProfile(null)
      return
    }

    const client = supabase

    const loadProfile = async () => {
      setProfileStatus('Loading portal profile...')
      const { data, error } = await client
        .from('portal_profiles')
        .select('id,email,full_name,company,role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        setProfileStatus('Profile could not load. Apply the latest Supabase schema update.')
        return
      }

      setProfile(data)
      setProfileStatus(data ? '' : 'Account created. Waiting for profile approval.')
    }

    loadProfile()
  }, [session])

  useEffect(() => {
    if (isInternal) {
      loadAccessRequests()
    }
  }, [isInternal])

  const loadAccessRequests = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    setAdminStatus('Loading access queue...')
    const { data, error } = await supabase
      .from('access_requests')
      .select('id,email,requested_role,company,status,created_at')
      .order('created_at', { ascending: false })

    if (error) {
      setAdminStatus('Access queue could not load. Confirm the admin RLS policies were applied.')
      return
    }

    setAccessRequests(data ?? [])
    setAdminStatus('')
  }

  const handleAccessRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAccessStatus('Saving access request...')

    if (!isSupabaseConfigured || !supabase) {
      setAccessStatus('Access request staged. Supabase env vars are not connected yet.')
      return
    }

    const { error } = await supabase.from('access_requests').insert({
      email: accessEmail,
      requested_role: roleValues[selectedRole],
      company: accessCompany || null,
    })

    setAccessStatus(
      error
        ? 'Access request could not be saved. Check Supabase table policies and env vars.'
        : `Access request saved for ${accessEmail}.`,
    )
  }

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthStatus(authMode === 'signin' ? 'Signing in...' : 'Creating account...')

    if (!isSupabaseConfigured || !supabase) {
      setAuthStatus('Supabase env vars are not connected yet.')
      return
    }

    const authPayload = {
      email: authEmail,
      password: authPassword,
      options: {
        data: {
          full_name: authName,
          requested_role: roleValues[selectedRole],
          company: accessCompany,
        },
      },
    }

    const { error } =
      authMode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
        : await supabase.auth.signUp(authPayload)

    setAuthStatus(
      error
        ? error.message
        : authMode === 'signin'
          ? 'Signed in.'
          : 'Account created. Check email confirmation if Supabase requires it.',
    )
  }

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    setSession(null)
    setProfile(null)
  }

  const handleIntakeSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setIntakeStatus('Saving intake draft...')

    if (!isSupabaseConfigured || !supabase) {
      setIntakeStatus('Draft staged. Supabase env vars are not connected yet.')
      return
    }

    const { error } = await supabase.from('intake_requests').insert({
      requester_id: session?.user.id ?? null,
      request_type: String(formData.get('requestType')),
      company: String(formData.get('company')),
      summary: String(formData.get('summary')),
      status: 'draft',
    })

    setIntakeStatus(
      error ? 'Draft could not be saved. Sign in or check intake policies.' : 'Intake draft saved to Supabase.',
    )
  }

  const updateAccessRequest = async (request: AccessRequest, status: 'approved' | 'denied') => {
    if (!supabase) {
      return
    }

    setAdminStatus(`${status === 'approved' ? 'Approving' : 'Denying'} ${request.email}...`)
    const { error } = await supabase.from('access_requests').update({ status }).eq('id', request.id)

    if (error) {
      setAdminStatus('Request update failed. Confirm this account has internal role.')
      return
    }

    setAdminStatus(`Request ${status} for ${request.email}.`)
    await loadAccessRequests()
  }

  return (
    <main className="portal-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="AM Premier Connect home">
          <span className="brand-mark">AP</span>
          <span>
            <strong>AM Premier Connect</strong>
            <small>Client and vendor operations portal</small>
          </span>
        </a>
        <div className="nav-actions">
          <a href="#access">Request Portal Approval</a>
          <a href="#intake">Start Intake</a>
          {session ? (
            <button type="button" className="icon-button" aria-label="Sign out" onClick={handleSignOut}>
              <LogOut size={18} />
            </button>
          ) : (
            <a className="icon-button" aria-label="Secure login" href="#login">
              <LockKeyhole size={18} />
            </a>
          )}
        </div>
      </nav>

      <section className="hero-band">
        <div className="hero-copy">
          <p className="eyebrow">ampremierconnect.com</p>
          <h1>Secure operating portal for AM Premier projects.</h1>
          <p className="hero-text">
            A controlled login hub for client requests, vendor coordination, project evidence, and internal
            deal-room execution.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#access">
              Request Portal Approval <ArrowRight size={18} />
            </a>
            <a className="secondary-action" href="#intake">
              Start Intake <FileText size={18} />
            </a>
            <a className="secondary-action" href="#login">
              Portal Login <LockKeyhole size={18} />
            </a>
          </div>
        </div>

        <aside className="login-panel" id="login" aria-label="Portal login">
          <div className="panel-heading">
            <LockKeyhole size={20} />
            <div>
              <h2>{session ? 'Portal Session' : 'Portal Login'}</h2>
              <p>{session ? session.user.email : 'Sign in or request a new account.'}</p>
            </div>
          </div>

          {session ? (
            <div className="session-card">
              <strong>{profile?.full_name || session.user.email}</strong>
              <span>{profile ? `${profile.role} access` : profileStatus}</span>
              <button type="button" className="full-button" onClick={handleSignOut}>
                Sign out <LogOut size={18} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuth}>
              <div className="role-tabs" role="tablist" aria-label="Authentication mode">
                <button
                  aria-selected={authMode === 'signin'}
                  className={authMode === 'signin' ? 'active' : ''}
                  onClick={() => setAuthMode('signin')}
                  role="tab"
                  type="button"
                >
                  Sign in
                </button>
                <button
                  aria-selected={authMode === 'signup'}
                  className={authMode === 'signup' ? 'active' : ''}
                  onClick={() => setAuthMode('signup')}
                  role="tab"
                  type="button"
                >
                  Sign up
                </button>
              </div>
              {authMode === 'signup' && (
                <label>
                  Full name
                  <input
                    onChange={(event) => setAuthName(event.target.value)}
                    placeholder="Full name"
                    required
                    type="text"
                    value={authName}
                  />
                </label>
              )}
              <label>
                Work email
                <input
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="name@company.com"
                  required
                  type="email"
                  value={authEmail}
                />
              </label>
              <label>
                Password
                <input
                  minLength={6}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  placeholder="Password"
                  required
                  type="password"
                  value={authPassword}
                />
              </label>
              <button type="submit" className="full-button">
                {authMode === 'signin' ? 'Sign in' : 'Create account'} <ArrowRight size={18} />
              </button>
            </form>
          )}

          {authStatus && (
            <div className="success-note" role="status">
              <MailCheck size={18} />
              <span>{authStatus}</span>
            </div>
          )}
        </aside>
      </section>

      <section className="metrics-row" aria-label="Portal readiness">
        {readinessItems.map((item, index) => (
          <div key={item.label}>
            <strong>{String(index + 1).padStart(2, '0')}</strong>
            <span>{item.label}</span>
            <small>{item.value}</small>
          </div>
        ))}
      </section>

      <section className="access-section" id="access-lanes">
        <div className="section-heading">
          <p className="eyebrow">Access lanes</p>
          <h2>Approval gates now sit in front of AM Premier portal access.</h2>
        </div>
        <div className="lane-grid">
          {accessLanes.map((lane) => {
            const Icon = lane.icon
            return (
              <article className="lane-card" key={lane.title}>
                <div className="lane-icon">
                  <Icon size={22} />
                </div>
                <h3>{lane.title}</h3>
                <p>{lane.description}</p>
                <span>{lane.status}</span>
              </article>
            )
          })}
        </div>
      </section>

      <section className="workspace-band" id="intake">
        <div className="intake-panel">
          <div className="panel-heading">
            <ClipboardCheck size={20} />
            <div>
              <h2>New Request Intake</h2>
              <p>{session ? 'Saved against the active portal session.' : 'Public draft intake remains available.'}</p>
            </div>
          </div>
          <form onSubmit={handleIntakeSave}>
            <div className="intake-grid">
              <label>
                Request type
                <select defaultValue="power" name="requestType">
                  <option value="power">Power infrastructure</option>
                  <option value="generator">Generator / backup power</option>
                  <option value="vendor">Vendor onboarding</option>
                  <option value="project">Project update</option>
                </select>
              </label>
              <label>
                Company
                <input name="company" type="text" placeholder="Company name" required />
              </label>
              <label className="wide">
                Request summary
                <textarea
                  name="summary"
                  placeholder="Describe the need, deadline, location, and decision owner."
                  required
                />
              </label>
            </div>
            <button type="submit" className="full-button">
              Save intake draft <BadgeCheck size={18} />
            </button>
          </form>
          {intakeStatus && (
            <div className="success-note" role="status">
              <ClipboardCheck size={18} />
              <span>{intakeStatus}</span>
            </div>
          )}
        </div>

        <div className="queue-panel">
          <div className="panel-heading">
            <Zap size={20} />
            <div>
              <h2>{isInternal ? 'Admin Approval Queue' : 'Operating Queue'}</h2>
              <p>{isInternal ? 'Approve or deny portal access requests.' : 'Admin dashboard unlocks for internal users.'}</p>
            </div>
          </div>

          {isInternal ? (
            <div className="request-list">
              {accessRequests.length === 0 ? (
                <p className="panel-note">No access requests are waiting in the queue.</p>
              ) : (
                accessRequests.map((request) => (
                  <article className="request-row" key={request.id}>
                    <div>
                      <strong>{request.email}</strong>
                      <span>
                        {request.company || 'No company'} · {request.requested_role} · {request.status}
                      </span>
                    </div>
                    <div className="row-actions">
                      <button type="button" onClick={() => updateAccessRequest(request, 'approved')}>
                        Approve
                      </button>
                      <button type="button" onClick={() => updateAccessRequest(request, 'denied')}>
                        Deny
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : (
            <ul>
              {operatingQueue.map((item) => (
                <li key={item}>
                  <span />
                  {item}
                </li>
              ))}
            </ul>
          )}

          <div className="owner-row">
            <UserRound size={18} />
            <span>{profile ? `Signed in as ${profile.email}` : 'Owner: AM Premier admin'}</span>
          </div>
          <div className="system-status">
            <Gauge size={18} />
            <div>
              <strong>Deployment mode</strong>
              <span>{isInternal ? 'Internal admin controls enabled.' : 'Auth and approval workflow ready.'}</span>
            </div>
          </div>
          {(adminStatus || profileStatus) && (
            <div className="success-note" role="status">
              <ShieldCheck size={18} />
              <span>{adminStatus || profileStatus}</span>
            </div>
          )}
        </div>
      </section>

      <section className="access-request-band" id="access">
        <div className="intake-panel">
          <div className="panel-heading">
            <MailCheck size={20} />
            <div>
              <h2>Request Portal Approval</h2>
              <p>Submit the account lane an internal admin should approve.</p>
            </div>
          </div>
          <form onSubmit={handleAccessRequest}>
            <div className="role-tabs" role="tablist" aria-label="Access role">
              {roles.map((role) => (
                <button
                  aria-selected={selectedRole === role}
                  className={selectedRole === role ? 'active' : ''}
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  role="tab"
                  type="button"
                >
                  {role}
                </button>
              ))}
            </div>
            <div className="intake-grid">
              <label>
                Work email
                <input
                  onChange={(event) => {
                    setAccessEmail(event.target.value)
                    setAccessStatus('')
                  }}
                  placeholder="name@company.com"
                  required
                  type="email"
                  value={accessEmail}
                />
              </label>
              <label>
                Company
                <input
                  onChange={(event) => {
                    setAccessCompany(event.target.value)
                    setAccessStatus('')
                  }}
                  placeholder="Company name"
                  type="text"
                  value={accessCompany}
                />
              </label>
            </div>
            <button type="submit" className="full-button">
              Request secure access <ArrowRight size={18} />
            </button>
          </form>
          <p className="panel-note">{roleMessage}</p>
          {accessStatus && (
            <div className="success-note" role="status">
              <MailCheck size={18} />
              <span>{accessStatus}</span>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

export default App
