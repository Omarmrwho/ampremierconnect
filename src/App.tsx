import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  Filter,
  FileText,
  Gauge,
  LockKeyhole,
  LogOut,
  MailCheck,
  Radio,
  ShieldCheck,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useRef, useState } from 'react'
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

type ProjectSessionStatus = {
  id: string
  project_name: string
  client_name: string | null
  status: 'active' | 'waiting' | 'blocked' | 'complete'
  health: 'green' | 'yellow' | 'red'
  source_session_key: string | null
  source_session_label: string | null
  owner: string | null
  last_update: string | null
  next_action: string | null
  blocker: string | null
  updated_at: string
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

const projectFilters = ['all', 'active', 'waiting', 'blocked', 'complete'] as const

type ProjectFilter = (typeof projectFilters)[number]
type ProjectOperatingStatus = ProjectSessionStatus['status']

const projectStats: Record<
  string,
  {
    summary: string
    metrics: { label: string; value: string; note: string }[]
    highlights: string[]
  }
> = {
  'Power Intelligence Reports': {
    summary: 'Latest power infrastructure scan covers AI/data center generator opportunities and commercial fit.',
    metrics: [
      { label: 'Tracked Opportunities', value: '7', note: 'Named AI/data center power opportunities' },
      { label: 'High Priority', value: '2', note: 'Delta Forge 1 and San Marcos Data Center I' },
      { label: 'Avg Fit Score', value: '71', note: 'Average final commercial score out of 100' },
      { label: 'Avg Confidence', value: '66', note: 'Average evidence confidence out of 100' },
    ],
    highlights: [
      'Delta Forge 1: 85 final score, 96 confidence, 3 to 12 month buying window.',
      'San Marcos Data Center I: 84 final score, 92 confidence, now to 6 month buying window.',
      '3 medium-priority opportunities need package-owner or permit validation.',
      '2 research opportunities look more like ancillary/displacement paths than primary generator sales.',
    ],
  },
}

const getActionPriority = (project: ProjectSessionStatus) => {
  if (project.status === 'blocked' || project.health === 'red') {
    return { label: 'Critical', score: 3, tone: 'critical' }
  }

  if (project.blocker) {
    return { label: 'Decision', score: 2, tone: 'decision' }
  }

  if (project.status === 'waiting') {
    return { label: 'Update', score: 1, tone: 'update' }
  }

  return { label: 'Watch', score: 0, tone: 'watch' }
}

const getActionReason = (project: ProjectSessionStatus) => {
  if (project.blocker) {
    return project.blocker
  }

  if (project.status === 'waiting') {
    return project.next_action || 'Waiting for outside input or owner direction.'
  }

  if (project.status === 'blocked') {
    return project.next_action || 'Blocked project needs a decision before it can move.'
  }

  return project.next_action || 'Needs updated next action.'
}

function App() {
  const [routePath, setRoutePath] = useState(() => window.location.pathname)
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
  const [projectStatuses, setProjectStatuses] = useState<ProjectSessionStatus[]>([])
  const [projectStatusMessage, setProjectStatusMessage] = useState('')
  const [projectFilter, setProjectFilter] = useState<ProjectFilter>('all')
  const [selectedActionProjectId, setSelectedActionProjectId] = useState<string | null>(null)
  const [customDecision, setCustomDecision] = useState('')
  const decisionDrawerRef = useRef<HTMLElement | null>(null)

  const isInternal = profile?.role === 'internal'
  const isCommandRoute = routePath === '/command'
  const activeProjects = projectStatuses.filter((project) => project.status === 'active').length
  const blockedProjects = projectStatuses.filter((project) => project.status === 'blocked').length
  const waitingProjects = projectStatuses.filter((project) => project.status === 'waiting').length
  const needsActionProjects = projectStatuses.filter(
    (project) => project.status === 'blocked' || Boolean(project.blocker),
  ).length
  const filteredProjects =
    projectFilter === 'all' ? projectStatuses : projectStatuses.filter((project) => project.status === projectFilter)
  const actionQueueProjects = [...projectStatuses]
    .filter((project) => project.status === 'waiting' || project.status === 'blocked' || Boolean(project.blocker))
    .sort((left, right) => getActionPriority(right).score - getActionPriority(left).score)
  const selectedActionProject = projectStatuses.find((project) => project.id === selectedActionProjectId) || null
  const selectedProjectStats = selectedActionProject ? projectStats[selectedActionProject.project_name] : null

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
    const handlePopState = () => {
      setRoutePath(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
      loadProjectStatuses()
    }
  }, [isInternal])

  useEffect(() => {
    if (!selectedActionProjectId) {
      return
    }

    window.setTimeout(() => {
      decisionDrawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [selectedActionProjectId])

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path)
    setRoutePath(path)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const loadAccessRequests = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    setAdminStatus('Loading access queue...')
    const { data, error } = await supabase
      .from('access_requests')
      .select('id,email,requested_role,company,status,created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      setAdminStatus('Access queue could not load. Confirm the admin RLS policies were applied.')
      return
    }

    setAccessRequests(data ?? [])
    setAdminStatus('')
  }

  const loadProjectStatuses = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    setProjectStatusMessage('Loading project command portal...')
    const { data, error } = await supabase
      .from('project_session_status')
      .select(
        'id,project_name,client_name,status,health,source_session_key,source_session_label,owner,last_update,next_action,blocker,updated_at',
      )
      .order('updated_at', { ascending: false })

    if (error) {
      setProjectStatusMessage('Project portal could not load. Apply the latest Supabase schema update.')
      return
    }

    setProjectStatuses(data ?? [])
    setProjectStatusMessage('')
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
        emailRedirectTo: window.location.origin,
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
    if (isCommandRoute) {
      navigateTo('/')
    }
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
    const { error } = await supabase
      .from('access_requests')
      .update({ status })
      .eq('id', request.id)
      .eq('status', 'pending')

    if (error) {
      setAdminStatus('Request update failed. Confirm this account has internal role.')
      return
    }

    setAdminStatus(`Request ${status} for ${request.email}.`)
    await loadAccessRequests()
  }

  const requestProjectUpdate = async (project: ProjectSessionStatus) => {
    setProjectStatusMessage(`Logging update request for ${project.project_name}...`)

    if (!isSupabaseConfigured || !supabase) {
      setProjectStatusMessage('Update request staged. Supabase env vars are not connected yet.')
      return
    }

    const { error } = await supabase.from('intake_requests').insert({
      requester_id: session?.user.id ?? null,
      request_type: 'project_update',
      company: project.client_name || project.project_name,
      summary: `Update requested for ${project.project_name}. Current status: ${project.status}. Next action: ${
        project.next_action || 'Needs next action.'
      }`,
      status: 'draft',
    })

    setProjectStatusMessage(
      error ? 'Update request could not be logged. Check intake policies.' : `Update requested for ${project.project_name}.`,
    )
  }

  const updateProjectOperatingStatus = async (project: ProjectSessionStatus, status: ProjectOperatingStatus) => {
    setProjectStatusMessage(`Updating ${project.project_name} to ${status}...`)

    if (!isSupabaseConfigured || !supabase) {
      setProjectStatusMessage('Project status staged. Supabase env vars are not connected yet.')
      return
    }

    const health = status === 'blocked' ? 'red' : status === 'waiting' ? 'yellow' : 'green'
    const { error } = await supabase
      .from('project_session_status')
      .update({
        status,
        health,
        blocker: status === 'blocked' ? project.blocker || 'Needs owner decision.' : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)

    if (error) {
      setProjectStatusMessage('Project status could not be updated. Confirm internal update policy is active.')
      return
    }

    setProjectStatusMessage(`${project.project_name} marked ${status}.`)
    await loadProjectStatuses()
  }

  const saveCustomDecision = async (project: ProjectSessionStatus) => {
    const trimmedDecision = customDecision.trim()
    if (!trimmedDecision) {
      setProjectStatusMessage('Type a custom command before saving.')
      return
    }

    setProjectStatusMessage(`Saving custom command for ${project.project_name}...`)

    if (!isSupabaseConfigured || !supabase) {
      setProjectStatusMessage('Custom command staged. Supabase env vars are not connected yet.')
      return
    }

    const { error } = await supabase
      .from('project_session_status')
      .update({
        status: 'waiting',
        health: 'yellow',
        next_action: trimmedDecision,
        blocker: null,
        last_update: `Custom command from Omar: ${trimmedDecision}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)

    if (error) {
      setProjectStatusMessage('Custom command could not be saved. Confirm internal update policy is active.')
      return
    }

    setCustomDecision('')
    setProjectStatusMessage(`Custom command saved for ${project.project_name}.`)
    await loadProjectStatuses()
  }

  if (isCommandRoute) {
    return (
      <main className="portal-shell command-page-shell">
        <nav className="topbar" aria-label="Command portal navigation">
          <button
            type="button"
            className="brand brand-button"
            aria-label="Return to AM Premier Connect home"
            onClick={() => navigateTo('/')}
          >
            <span className="brand-mark">AP</span>
            <span>
              <strong>AM Premier Connect</strong>
              <small>Internal command portal</small>
            </span>
          </button>
          <div className="nav-actions">
            <button type="button" className="nav-link-button" onClick={() => navigateTo('/')}>
              Home
            </button>
            {session && (
              <button type="button" className="icon-button" aria-label="Sign out" onClick={handleSignOut}>
                <LogOut size={18} />
              </button>
            )}
          </div>
        </nav>

        {isInternal ? (
          <section className="command-section command-page">
            <div className="section-heading command-heading">
              <div>
                <p className="eyebrow">Internal command portal</p>
                <h1>Live project status pulled from operating sessions.</h1>
                <p className="hero-text">
                  Internal workspace for project health, next actions, blockers, and active session status.
                </p>
              </div>
              <button type="button" className="refresh-button" onClick={loadProjectStatuses}>
                Refresh <Radio size={17} />
              </button>
            </div>

            <div className="command-metrics" aria-label="Project status summary">
              <div>
                <span>Active</span>
                <strong>{activeProjects}</strong>
              </div>
              <div>
                <span>Waiting</span>
                <strong>{waitingProjects}</strong>
              </div>
              <div>
                <span>Blocked</span>
                <strong>{blockedProjects}</strong>
              </div>
              <div>
                <span>Needs Action</span>
                <strong>{needsActionProjects}</strong>
              </div>
            </div>

            <div className="command-board">
              <section className="movement-panel" aria-label="Project movement board">
                <div className="panel-heading">
                  <Gauge size={20} />
                  <div>
                    <h2>Movement Board</h2>
                    <p>Project status grouped by operating phase.</p>
                  </div>
                </div>
                <div className="movement-grid">
                  <div>
                    <span>Active</span>
                    <strong>{activeProjects}</strong>
                    <small>Moving now</small>
                  </div>
                  <div>
                    <span>Waiting</span>
                    <strong>{waitingProjects}</strong>
                    <small>Needs outside input</small>
                  </div>
                  <div>
                    <span>Blocked</span>
                    <strong>{blockedProjects}</strong>
                    <small>Requires decision</small>
                  </div>
                </div>
              </section>

              <section className="action-panel" aria-label="Action queue">
                <div className="panel-heading">
                  <Zap size={20} />
                  <div>
                    <h2>Action Queue</h2>
                    <p>Projects that need a reply, decision, or unblock.</p>
                  </div>
                </div>
                <div className="action-list">
                  {actionQueueProjects.length === 0 ? (
                    <p className="panel-note">No waiting or blocked projects right now.</p>
                  ) : (
                    actionQueueProjects.slice(0, 6).map((project) => {
                      const priority = getActionPriority(project)

                      return (
                      <article
                        className={`action-row ${selectedActionProjectId === project.id ? 'selected' : ''}`}
                        key={project.id}
                      >
                        <button
                          type="button"
                          className="action-main action-open-button"
                          onClick={() => setSelectedActionProjectId(project.id)}
                        >
                          <div className="action-title-row">
                            <strong>{project.project_name}</strong>
                            <span className={`action-priority ${priority.tone}`}>{priority.label}</span>
                          </div>
                          <span>{getActionReason(project)}</span>
                          <small>{project.client_name || 'Internal'} · {project.owner || 'Unassigned'}</small>
                        </button>
                        <div className="action-controls">
                          <button type="button" onClick={() => requestProjectUpdate(project)}>
                            Request Update
                          </button>
                          <button type="button" onClick={() => updateProjectOperatingStatus(project, 'active')}>
                            Mark Active
                          </button>
                          <button type="button" onClick={() => updateProjectOperatingStatus(project, 'complete')}>
                            Done
                          </button>
                        </div>
                      </article>
                      )
                    })
                  )}
                </div>
              </section>
            </div>

            {selectedActionProject && (
              <section className="decision-drawer" aria-label="Decision detail" ref={decisionDrawerRef}>
                <div className="panel-heading">
                  <CircleAlert size={20} />
                  <div>
                    <h2>Decision Detail</h2>
                    <p>Choose how this project should move next.</p>
                  </div>
                </div>
                <div className="decision-layout">
                  <div>
                    <span className="decision-label">Project</span>
                    <h3>{selectedActionProject.project_name}</h3>
                    <p>{getActionReason(selectedActionProject)}</p>
                  </div>
                  <dl className="decision-facts">
                    <div>
                      <dt>Current status</dt>
                      <dd>{selectedActionProject.status}</dd>
                    </div>
                    <div>
                      <dt>Owner</dt>
                      <dd>{selectedActionProject.owner || 'Unassigned'}</dd>
                    </div>
                    <div>
                      <dt>Last update</dt>
                      <dd>{selectedActionProject.last_update || 'No update captured'}</dd>
                    </div>
                    <div>
                      <dt>Recommended move</dt>
                      <dd>{selectedActionProject.next_action || 'Request a fresh update before deciding.'}</dd>
                    </div>
                  </dl>
                </div>
                {selectedProjectStats ? (
                  <div className="project-stats-panel">
                    <div>
                      <span className="decision-label">Stats</span>
                      <h3>Numbers behind this project</h3>
                      <p>{selectedProjectStats.summary}</p>
                    </div>
                    <div className="stats-grid">
                      {selectedProjectStats.metrics.map((metric) => (
                        <div key={metric.label}>
                          <span>{metric.label}</span>
                          <strong>{metric.value}</strong>
                          <small>{metric.note}</small>
                        </div>
                      ))}
                    </div>
                    <ul className="stats-highlights">
                      {selectedProjectStats.highlights.map((highlight) => (
                        <li key={highlight}>{highlight}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="project-stats-empty">
                    <span className="decision-label">Stats</span>
                    <p>Detailed numbers are not connected to this project yet. Use a custom command to request a stats buildout.</p>
                  </div>
                )}
                <div className="decision-actions">
                  <button type="button" onClick={() => updateProjectOperatingStatus(selectedActionProject, 'active')}>
                    Approve / Move Active
                  </button>
                  <button type="button" onClick={() => requestProjectUpdate(selectedActionProject)}>
                    Ask Elara for Update
                  </button>
                  <button type="button" onClick={() => updateProjectOperatingStatus(selectedActionProject, 'waiting')}>
                    Keep Waiting
                  </button>
                  <button type="button" onClick={() => updateProjectOperatingStatus(selectedActionProject, 'complete')}>
                    Mark Done
                  </button>
                </div>
                <div className="custom-decision-box">
                  <label>
                    Custom command
                    <textarea
                      onChange={(event) => setCustomDecision(event.target.value)}
                      placeholder="Example: Have Elara research the storefront options and recommend one before we move GFY forward."
                      value={customDecision}
                    />
                  </label>
                  <button type="button" onClick={() => saveCustomDecision(selectedActionProject)}>
                    Save Custom Command
                  </button>
                </div>
              </section>
            )}

            <div className="project-toolbar" aria-label="Project filters">
              <div>
                <Filter size={17} />
                <strong>Projects</strong>
              </div>
              <div className="filter-tabs" role="tablist" aria-label="Filter project status">
                {projectFilters.map((filter) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={projectFilter === filter}
                    className={projectFilter === filter ? 'active' : ''}
                    key={filter}
                    onClick={() => setProjectFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {projectStatusMessage && (
              <div className="success-note" role="status">
                <ShieldCheck size={18} />
                <span>{projectStatusMessage}</span>
              </div>
            )}

            <div className="project-grid">
              {filteredProjects.length === 0 ? (
                <article className="empty-project-state">
                  <Radio size={22} />
                  <div>
                    <h3>No live project records yet.</h3>
                    <p>
                      The portal shell is ready. Next we connect the OpenClaw session sync so active work sessions
                      write project status records here.
                    </p>
                  </div>
                </article>
              ) : (
                filteredProjects.map((project) => (
                  <article
                    className={`project-card ${selectedActionProjectId === project.id ? 'selected' : ''}`}
                    key={project.id}
                    onClick={() => setSelectedActionProjectId(project.id)}
                  >
                    <div className="project-card-top">
                      <div>
                        <h3>{project.project_name}</h3>
                        <p>{project.client_name || 'Internal project'}</p>
                      </div>
                      <span className={`health-pill ${project.health}`}>
                        {project.health === 'green' ? <CircleCheck size={15} /> : <CircleAlert size={15} />}
                        {project.status}
                      </span>
                    </div>
                    <dl className="project-fields">
                      <div>
                        <dt>Owner</dt>
                        <dd>{project.owner || 'Unassigned'}</dd>
                      </div>
                      <div>
                        <dt>Session</dt>
                        <dd>{project.source_session_label || project.source_session_key || 'Manual status'}</dd>
                      </div>
                      <div>
                        <dt>Last update</dt>
                        <dd>{project.last_update || 'No update captured'}</dd>
                      </div>
                      <div>
                        <dt>Next action</dt>
                        <dd>{project.next_action || 'Needs next action'}</dd>
                      </div>
                      {project.blocker && (
                        <div>
                          <dt>Blocker</dt>
                          <dd>{project.blocker}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="project-updated">
                      <Clock3 size={15} />
                      <span>Synced {new Date(project.updated_at).toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      className="project-update-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        requestProjectUpdate(project)
                      }}
                    >
                      Request Update <ArrowRight size={16} />
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : (
          <section className="locked-command-state">
            <div className="login-panel">
              <div className="panel-heading">
                <LockKeyhole size={20} />
                <div>
                  <h1>Internal command portal</h1>
                  <p>Sign in with an approved internal account to open this workspace.</p>
                </div>
              </div>
              <button type="button" className="full-button" onClick={() => navigateTo('/')}>
                Return to portal login <ArrowRight size={18} />
              </button>
              {(profileStatus || authStatus) && (
                <div className="success-note" role="status">
                  <ShieldCheck size={18} />
                  <span>{profileStatus || authStatus}</span>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    )
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
              {isInternal && (
                <button type="button" className="full-button admin-link-button" onClick={() => navigateTo('/command')}>
                  Open Command Portal <Radio size={18} />
                </button>
              )}
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

        <div className="queue-panel" id="admin-approval-queue">
          <div className="panel-heading">
            <Zap size={20} />
            <div>
              <h2>{isInternal ? 'Admin Approval Queue' : 'Operating Queue'}</h2>
              <p>{isInternal ? 'Approve or deny pending portal access requests.' : 'Admin dashboard unlocks for internal users.'}</p>
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
                        {request.company || 'No company'} · {request.requested_role} · pending
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
