import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Filter,
  FileText,
  Gauge,
  Lightbulb,
  LockKeyhole,
  LogOut,
  MailCheck,
  Megaphone,
  MessageCircle,
  Radio,
  ShieldCheck,
  Target,
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
const openClawWebUrl =
  import.meta.env.VITE_OPENCLAW_WEB_URL || 'https://diffs-maintains-eternal-mathematics.trycloudflare.com/'

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
type WorkspaceTab = 'command' | 'construction' | 'crm' | 'campaigns' | 'ideas' | 'agents'

type WorkspaceRecord = {
  type: string
  stage: string
  objective: string
  construction: {
    phase: string
    nextMilestone: string
    schedule: { name: string; status: string; owner: string; note: string }[]
  }
  crm: {
    pipelineValue: string
    companies: { name: string; stage: string; nextStep: string; owner: string }[]
  }
  campaigns: {
    name: string
    channel: string
    status: string
    recommendation: string
  }[]
  ideas: {
    title: string
    score: string
    nextMove: string
  }[]
  agents: {
    role: string
    assignment: string
    output: string
  }[]
}

type ProjectTask = {
  id: string
  project_id: string
  task_name: string
  status: string
  owner: string | null
  due_date: string | null
  note: string | null
  sort_order: number
}

type ProjectCrmRecord = {
  id: string
  project_id: string
  company_name: string
  contact_name: string | null
  stage: string
  owner: string | null
  next_step: string | null
  value_estimate: string | null
}

type ProjectCampaign = {
  id: string
  project_id: string
  campaign_name: string
  campaign_type: string
  channel: string | null
  status: string
  recommendation: string | null
}

type ProjectIdea = {
  id: string
  project_id: string
  title: string
  score: string | null
  next_move: string | null
  status: string
}

type ProjectAgentRecommendation = {
  id: string
  project_id: string
  agent_role: string
  assignment: string
  output_target: string | null
  status: string
}

type CommandTable = 'project_tasks' | 'project_crm_records' | 'project_campaigns' | 'project_ideas' | 'project_agent_recommendations'

const workspaceTabs: { id: WorkspaceTab; label: string }[] = [
  { id: 'command', label: 'Command' },
  { id: 'construction', label: 'Schedule' },
  { id: 'crm', label: 'CRM' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'ideas', label: 'Ideas' },
  { id: 'agents', label: 'Agents' },
]

const starterProjects: ProjectSessionStatus[] = [
  {
    id: 'starter-am-premier-station',
    project_name: 'AM Premier Station',
    client_name: 'AM Premier Solutions',
    status: 'active',
    health: 'yellow',
    source_session_key: null,
    source_session_label: 'construction command room',
    owner: 'Elara / Construction Manager Agent',
    last_update: 'Construction project workspace created for schedule, CRM, campaigns, ideas, and agent recommendations.',
    next_action: 'Confirm site package, permits, utility requirements, contractor roles, and the first 7-day construction lookahead.',
    blocker: null,
    updated_at: new Date().toISOString(),
  },
]

const projectStats: Record<
  string,
  {
    summary: string
    metrics: { label: string; value: string; note: string }[]
    lanes: { name: string; value: string; note: string }[]
    highlights: string[]
  }
> = {
  'AM Premier Connect Portal': {
    summary: 'Client/vendor/internal portal foundation with Supabase auth, approval flow, and command route live.',
    metrics: [
      { label: 'Portal Roles', value: '3', note: 'Client, vendor, and internal access lanes' },
      { label: 'Live Routes', value: '2', note: 'Homepage portal plus /command workspace' },
      { label: 'Core Tables', value: '3', note: 'Profiles, access requests, and project status' },
      { label: 'Deploy Path', value: '1', note: 'GitHub to Vercel production flow' },
    ],
    lanes: [
      { name: 'Access control', value: 'Live', note: 'Approval-gated account flow is connected to Supabase.' },
      { name: 'Command portal', value: 'Live', note: 'Internal-only route with action queue and project details.' },
      { name: 'Project records', value: '8', note: 'Seeded operating projects visible in the board.' },
    ],
    highlights: [
      'Homepage no longer scrolls into internal operations; /command is a separate route.',
      'Internal users can refresh project statuses, request updates, and record decisions.',
      'Next upgrade is turning update requests into real OpenClaw tasks instead of status text only.',
    ],
  },
  'Live Session Status Sync': {
    summary: 'Bridge concept for turning OpenClaw work sessions into portal project records and current status.',
    metrics: [
      { label: 'Visible Source', value: '1', note: 'OpenClaw session runtime available to Elara' },
      { label: 'Portal Table', value: '1', note: 'project_session_status is the target record table' },
      { label: 'Sync Mode', value: 'Manual', note: 'Direct scheduled sync is not built yet' },
      { label: 'Risk Level', value: 'Med', note: 'Browser cannot call agent session tools directly' },
    ],
    lanes: [
      { name: 'Manual updates', value: 'Active', note: 'Elara can update Supabase project rows directly.' },
      { name: 'Scheduled bridge', value: 'Needed', note: 'Cron or server process should summarize sessions into records.' },
      { name: 'Browser access', value: 'Blocked', note: 'Frontend should not hold OpenClaw or service-role powers.' },
    ],
    highlights: [
      'The portal has the destination table and UI already.',
      'The missing piece is a server-side/session-side writer that turns active work into status deltas.',
      'Best next step: build a small sync script or cron that upserts project summaries.',
    ],
  },
  'Power Outreach Command Board': {
    summary: 'Reference outreach dashboard pattern from TX Injury Check: campaign metrics, movement board, action queue, and request logging.',
    metrics: [
      { label: 'Total Sent', value: '211', note: 'Direct sends logged in the reference dashboard' },
      { label: 'EV/DC Lane', value: '155', note: 'Site-host outreach sends in the dashboard' },
      { label: 'Generator Lane', value: '56', note: 'Critical power outreach sends in the dashboard' },
      { label: 'Campaigns', value: '18', note: 'Campaign cards listed across both lanes' },
    ],
    lanes: [
      { name: 'EV/DC Fast Charger', value: '7', note: 'Airports, hospitality, retail, parking, fuel, commercial, and general hosts.' },
      { name: 'Generator / Critical Power', value: '11', note: 'University, aviation, K12, utility, ports, water, healthcare, rail, and more.' },
      { name: 'Movement phase', value: 'Reply watch', note: 'Sent and waiting until inbox reply data is entered.' },
    ],
    highlights: [
      'This is the pattern now being rebuilt inside AM Premier Connect.',
      'The better portal version adds project click-through details and decision commands.',
      'Next useful improvement is connecting reply/bounce data instead of only sent counts.',
    ],
  },
  'EV/DC Charger Outreach Engine': {
    summary: 'EV/DC charger outreach engine covering airports, hospitality, retail, parking, fuel, commercial properties, and site hosts.',
    metrics: [
      { label: 'Campaign Folders', value: '33', note: 'EV/DC outreach folders in the workspace' },
      { label: 'Target Rows', value: '171', note: 'CRM target rows found across EV batch files' },
      { label: 'Primary Lanes', value: '7', note: 'Airport/FBO, hospitality, retail, parking, fuel, commercial, general hosts' },
      { label: 'Reply Status', value: 'Watch', note: 'Needs inbox/reply review before warm-opportunity count is real' },
    ],
    lanes: [
      { name: 'Airports / FBOs', value: '19+', note: 'Largest batch family, focused on travel and aviation site hosts.' },
      { name: 'Hospitality', value: '6+', note: 'Hotel and travel-property batches prepared.' },
      { name: 'Retail / parking / fuel', value: '6+', note: 'Retail properties, parking operators, and convenience/fuel sites.' },
      { name: 'Commercial / site host', value: '2+', note: 'General site-host and commercial-property lanes.' },
    ],
    highlights: [
      'The engine is built around property-owner/site-host qualification, not random EV leads.',
      'Best next move is reply triage: warm, maybe, bounced, not a fit, and follow-up needed.',
      'Portal should eventually show sent, opened/replied if available, follow-up due, and opportunity value by lane.',
    ],
  },
  'Generator and Critical Power Outreach': {
    summary: 'Critical power outreach lanes for generator, backup power, and infrastructure buyers.',
    metrics: [
      { label: 'Campaign Lanes', value: '12', note: 'Generator/critical-power outreach folders found' },
      { label: 'Target Rows', value: '152', note: 'CRM target rows across generator batch files' },
      { label: 'Approval Packs', value: '12', note: 'Lane packets prepared for review and execution' },
      { label: 'Reply Status', value: 'Watch', note: 'Needs inbox review to separate warm replies from silence' },
    ],
    lanes: [
      { name: 'Infrastructure', value: '5', note: 'Water, ports, rail, utilities, and county facilities.' },
      { name: 'Facilities', value: '4', note: 'Healthcare, K12, university, and cold chain.' },
      { name: 'Aviation / mission critical', value: '2', note: 'Aviation and mission-critical power lanes.' },
      { name: 'Channel / backup power', value: '1+', note: 'Generator partner and backup-power paths.' },
    ],
    highlights: [
      'The strongest use case is urgent reliability: downtime risk, backup power gaps, and resilience planning.',
      'Portal should split this into lane cards so Omar can see which vertical is moving.',
      'Next action is reply and bounce classification, then qualified follow-up packages.',
    ],
  },
  'Roofing Lead Pipeline': {
    summary: 'Roofing lead pipeline with discovery, repair, QA, and outreach-ready files staged but not fully production-cleared.',
    metrics: [
      { label: 'Pipeline Files', value: '29', note: 'Discovery, QA, repair, activation, and campaign files' },
      { label: 'Core Lists', value: '4', note: 'Raw, rejected, repaired, and outreach-ready lead files' },
      { label: 'QA Reports', value: '5', note: 'Manual, sample, repaired, full audit, and report outputs' },
      { label: 'Status', value: 'Blocked', note: 'Needs verified production path before mass outreach' },
    ],
    lanes: [
      { name: 'Discovery', value: 'Built', note: 'Multi-source collection scripts and source metrics exist.' },
      { name: 'Repair / QA', value: 'Built', note: 'Repair reports and QA artifacts are staged.' },
      { name: 'Activation', value: 'Paused', note: 'Activation folder exists, but prior subagent path failed.' },
    ],
    highlights: [
      'This should stay blocked until the lead database is verified enough for production outreach.',
      'The decision needed is whether to repair the existing dataset or restart verification cleanly.',
      'Useful portal stat later: qualified companies, verified emails, phone coverage, rejected count, and send-ready count.',
    ],
  },
  'Respectfully GFY Launch': {
    summary: 'Brand and launch system for Respectfully GFY, including waitlist site, product copy, mockups, and launch assets.',
    metrics: [
      { label: 'Project Files', value: '48', note: 'Brand, site, launch, product, and validation artifacts' },
      { label: 'Launch Assets', value: '16', note: 'Pricing, listings, scripts, provider research, and readiness docs' },
      { label: 'Mockup Files', value: '6', note: 'Desktop/mobile checks and storefront prototypes' },
      { label: 'Launch Gate', value: 'Open', note: 'Needs decision on storefront, first drop, or waitlist conversion' },
    ],
    lanes: [
      { name: 'Brand direction', value: 'Approved', note: 'Visual direction board and brand strategy are captured.' },
      { name: 'Waitlist site', value: 'Built', note: 'Static waitlist site and deployment notes exist.' },
      { name: 'First drop', value: 'Drafted', note: 'Product ladder, listings, pricing, and margin sheet are prepared.' },
      { name: 'Storefront', value: 'Prototype', note: 'Mockup board and storefront prototype files are staged.' },
    ],
    highlights: [
      'The project is not lacking ideas; it needs a launch gate decision.',
      'Best next decision: pick storefront provider and first product drop scope.',
      'Portal should eventually track waitlist count, conversion rate, SKU readiness, and content cadence.',
    ],
  },
  'Power Intelligence Reports': {
    summary: 'Latest power infrastructure scan covers AI/data center generator opportunities and commercial fit.',
    metrics: [
      { label: 'Tracked Opportunities', value: '7', note: 'Named AI/data center power opportunities' },
      { label: 'High Priority', value: '2', note: 'Delta Forge 1 and San Marcos Data Center I' },
      { label: 'Avg Fit Score', value: '71', note: 'Average final commercial score out of 100' },
      { label: 'Avg Confidence', value: '66', note: 'Average evidence confidence out of 100' },
    ],
    lanes: [
      { name: 'Executive reports', value: '12', note: 'July power/opportunity report files found in the reports folder.' },
      { name: 'High-fit deals', value: '2', note: 'Delta Forge 1 and San Marcos Data Center I.' },
      { name: 'Validation work', value: '3', note: 'Medium-priority opportunities need package-owner or permit validation.' },
    ],
    highlights: [
      'Delta Forge 1: 85 final score, 96 confidence, 3 to 12 month buying window.',
      'San Marcos Data Center I: 84 final score, 92 confidence, now to 6 month buying window.',
      '3 medium-priority opportunities need package-owner or permit validation.',
      '2 research opportunities look more like ancillary/displacement paths than primary generator sales.',
    ],
  },
}

const defaultWorkspace: WorkspaceRecord = {
  type: 'Operating project',
  stage: 'Active buildout',
  objective: 'Centralize project status, CRM movement, campaign planning, and Elara recommendations in one command room.',
  construction: {
    phase: 'Operating setup',
    nextMilestone: 'Define the next measurable deliverable and owner.',
    schedule: [
      {
        name: 'Confirm scope',
        status: 'active',
        owner: 'Omar / Elara',
        note: 'Lock the project objective, constraints, required documents, and success criteria.',
      },
      {
        name: 'Build execution plan',
        status: 'waiting',
        owner: 'Elara',
        note: 'Convert the objective into milestones, dependencies, and weekly next actions.',
      },
      {
        name: 'Connect CRM and campaign lanes',
        status: 'waiting',
        owner: 'Sales + Marketing agents',
        note: 'Attach relevant contacts, companies, opportunities, and campaign ideas.',
      },
    ],
  },
  crm: {
    pipelineValue: 'TBD',
    companies: [
      {
        name: 'Primary client / owner',
        stage: 'Qualification',
        nextStep: 'Capture decision maker, budget, timeline, and next meeting.',
        owner: 'CRM Agent',
      },
    ],
  },
  campaigns: [
    {
      name: 'Project announcement angle',
      channel: 'LinkedIn / email',
      status: 'draft',
      recommendation: 'Turn the project into credibility content once the value prop and proof points are clear.',
    },
  ],
  ideas: [
    {
      title: 'Turn this project into a repeatable offer',
      score: 'High',
      nextMove: 'Identify what part of the project can become a packaged service, template, or white-label module.',
    },
  ],
  agents: [
    {
      role: 'Elara / Executive Operator',
      assignment: 'Keep the project moving, identify blockers, and recommend the next owner decision.',
      output: 'Daily next-action brief and decision log.',
    },
  ],
}

const projectWorkspaces: Record<string, WorkspaceRecord> = {
  'AM Premier Station': {
    type: 'Construction / development',
    stage: 'Pre-construction command setup',
    objective:
      'Track the AM Premier Station build from concept through permitting, procurement, civil work, electrical work, commissioning, and launch.',
    construction: {
      phase: 'Pre-construction',
      nextMilestone: 'Confirm site package, permits, utility requirements, and construction responsibility matrix.',
      schedule: [
        {
          name: 'Owner scope and site package',
          status: 'active',
          owner: 'Omar',
          note: 'Gather site drawings, charger/equipment scope, landlord/owner requirements, and utility account details.',
        },
        {
          name: 'Permitting and AHJ path',
          status: 'waiting',
          owner: 'Construction Manager Agent',
          note: 'Identify permit requirements, reviewer, expected duration, and documents needed before submittal.',
        },
        {
          name: 'Utility coordination',
          status: 'waiting',
          owner: 'Power Infrastructure Agent',
          note: 'Confirm service capacity, transformer needs, interconnection steps, and lead times.',
        },
        {
          name: 'Vendor and procurement board',
          status: 'waiting',
          owner: 'Procurement Agent',
          note: 'Track charger/equipment, switchgear, conduit, concrete, signage, and long-lead materials.',
        },
        {
          name: 'Construction lookahead',
          status: 'planned',
          owner: 'Construction Manager Agent',
          note: 'Build a weekly sequence for civil, trenching, electrical rough-in, equipment set, testing, and punch list.',
        },
      ],
    },
    crm: {
      pipelineValue: 'Station-dependent',
      companies: [
        {
          name: 'Site owner / landlord',
          stage: 'Decision owner',
          nextStep: 'Confirm approval authority, lease/site control, insurance requirements, and communication cadence.',
          owner: 'CRM Agent',
        },
        {
          name: 'Utility / service provider',
          stage: 'Technical dependency',
          nextStep: 'Request capacity confirmation, transformer lead time, and required application package.',
          owner: 'Power Agent',
        },
        {
          name: 'Electrical contractor',
          stage: 'Vendor qualification',
          nextStep: 'Collect quote, license, availability, scope exclusions, and mobilization window.',
          owner: 'Vendor Agent',
        },
      ],
    },
    campaigns: [
      {
        name: 'AM Premier Station build-in-public',
        channel: 'LinkedIn + project photos',
        status: 'draft',
        recommendation:
          'Use milestone posts to show AM Premier can execute infrastructure, not just talk about EV charging.',
      },
      {
        name: 'Site-host sales campaign',
        channel: 'Email + calls',
        status: 'recommended',
        recommendation:
          'Turn the station into proof for nearby property owners: reduce range anxiety, create amenity value, and monetize parking/site traffic.',
      },
      {
        name: 'Vendor partner campaign',
        channel: 'Direct outreach',
        status: 'recommended',
        recommendation:
          'Recruit electrical, civil, signage, and maintenance partners using this project as the first qualification lane.',
      },
    ],
    ideas: [
      {
        title: 'Construction command dashboard as a sellable product',
        score: 'Very high',
        nextMove: 'Capture every schedule, blocker, vendor, and decision from AM Premier Station as a reusable white-label workflow.',
      },
      {
        title: 'Station launch sponsor package',
        score: 'Medium',
        nextMove: 'Package local partner visibility, ribbon-cutting content, and nearby business cross-promotion.',
      },
      {
        title: 'EV site-host ROI calculator',
        score: 'High',
        nextMove: 'Build a simple calculator from utilization, install cost, power cost, parking traffic, and incentives.',
      },
    ],
    agents: [
      {
        role: 'Construction Manager Agent',
        assignment: 'Own schedule, milestones, blockers, weekly lookahead, permit path, and contractor next steps.',
        output: 'Construction schedule, blocker log, and next 7-day action plan.',
      },
      {
        role: 'Sales Agent',
        assignment: 'Convert the project into site-host opportunities, partner outreach, and CRM follow-ups.',
        output: 'Lead list, pipeline stages, call script, and follow-up sequence.',
      },
      {
        role: 'Marketing Agent',
        assignment: 'Create project credibility content, launch content, and proof-driven campaigns.',
        output: 'Campaign brief, content calendar, post copy, and asset checklist.',
      },
      {
        role: 'Power Infrastructure Agent',
        assignment: 'Track electrical service, transformer, interconnection, load, and utility risk.',
        output: 'Utility coordination checklist and technical risk memo.',
      },
    ],
  },
  'AM Premier Connect Portal': {
    ...defaultWorkspace,
    type: 'SaaS / internal operating system',
    stage: 'MVP expansion',
    objective:
      'Turn AM Premier Connect into a project management, CRM, campaign, idea, and agent workforce command system.',
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

const getProjectProgress = (project: ProjectSessionStatus) => {
  if (project.status === 'complete') {
    return { value: 100, label: 'Complete' }
  }

  if (project.status === 'blocked' || project.health === 'red') {
    return { value: 25, label: 'Blocked' }
  }

  if (project.status === 'waiting') {
    return { value: 55, label: 'Waiting' }
  }

  if (project.health === 'yellow') {
    return { value: 65, label: 'Needs review' }
  }

  return { value: 75, label: 'In progress' }
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
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('command')
  const [customDecision, setCustomDecision] = useState('')
  const [commandDataStatus, setCommandDataStatus] = useState('')
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([])
  const [projectCrmRecords, setProjectCrmRecords] = useState<ProjectCrmRecord[]>([])
  const [projectCampaigns, setProjectCampaigns] = useState<ProjectCampaign[]>([])
  const [projectIdeas, setProjectIdeas] = useState<ProjectIdea[]>([])
  const [projectAgentRecommendations, setProjectAgentRecommendations] = useState<ProjectAgentRecommendation[]>([])
  const decisionDrawerRef = useRef<HTMLElement | null>(null)

  const isInternal = profile?.role === 'internal'
  const isCommandRoute = routePath === '/command'
  const isCrmRoute = routePath === '/crm'
  const isChatRoute = routePath === '/chat'
  const operatingProjects = [
    ...projectStatuses,
    ...starterProjects.filter(
      (starterProject) => !projectStatuses.some((project) => project.project_name === starterProject.project_name),
    ),
  ]
  const activeProjects = operatingProjects.filter((project) => project.status === 'active').length
  const blockedProjects = operatingProjects.filter((project) => project.status === 'blocked').length
  const waitingProjects = operatingProjects.filter((project) => project.status === 'waiting').length
  const needsActionProjects = operatingProjects.filter(
    (project) => project.status === 'blocked' || Boolean(project.blocker),
  ).length
  const filteredProjects =
    projectFilter === 'all' ? operatingProjects : operatingProjects.filter((project) => project.status === projectFilter)
  const actionQueueProjects = [...operatingProjects]
    .filter((project) => project.status === 'waiting' || project.status === 'blocked' || Boolean(project.blocker))
    .sort((left, right) => getActionPriority(right).score - getActionPriority(left).score)
  const selectedActionProject = operatingProjects.find((project) => project.id === selectedActionProjectId) || null
  const selectedProjectStats = selectedActionProject ? projectStats[selectedActionProject.project_name] : null
  const selectedWorkspace = selectedActionProject
    ? projectWorkspaces[selectedActionProject.project_name] || defaultWorkspace
    : null
  const selectedProjectTasks = selectedActionProject
    ? projectTasks.filter((task) => task.project_id === selectedActionProject.id)
    : []
  const selectedProjectCrmRecords = selectedActionProject
    ? projectCrmRecords.filter((record) => record.project_id === selectedActionProject.id)
    : []
  const selectedProjectCampaigns = selectedActionProject
    ? projectCampaigns.filter((campaign) => campaign.project_id === selectedActionProject.id)
    : []
  const selectedProjectIdeas = selectedActionProject
    ? projectIdeas.filter((idea) => idea.project_id === selectedActionProject.id)
    : []
  const selectedProjectAgentRecommendations = selectedActionProject
    ? projectAgentRecommendations.filter((agent) => agent.project_id === selectedActionProject.id)
    : []

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
      loadCommandRecords()
    }
  }, [isInternal])

  useEffect(() => {
    if (isCrmRoute) {
      setWorkspaceTab('crm')
    }
  }, [isCrmRoute])

  useEffect(() => {
    if (!isInternal || (!isCommandRoute && !isCrmRoute) || selectedActionProjectId || operatingProjects.length === 0) {
      return
    }

    setSelectedActionProjectId(operatingProjects[0].id)
  }, [isInternal, isCommandRoute, isCrmRoute, selectedActionProjectId, operatingProjects])

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

  const loadCommandRecords = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return
    }

    setCommandDataStatus('Loading project workspace records...')
    const [tasksResult, crmResult, campaignsResult, ideasResult, agentsResult] = await Promise.all([
      supabase
        .from('project_tasks')
        .select('id,project_id,task_name,status,owner,due_date,note,sort_order')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('project_crm_records')
        .select('id,project_id,company_name,contact_name,stage,owner,next_step,value_estimate')
        .order('created_at', { ascending: false }),
      supabase
        .from('project_campaigns')
        .select('id,project_id,campaign_name,campaign_type,channel,status,recommendation')
        .order('created_at', { ascending: false }),
      supabase
        .from('project_ideas')
        .select('id,project_id,title,score,next_move,status')
        .order('created_at', { ascending: false }),
      supabase
        .from('project_agent_recommendations')
        .select('id,project_id,agent_role,assignment,output_target,status')
        .order('created_at', { ascending: false }),
    ])

    if (tasksResult.error || crmResult.error || campaignsResult.error || ideasResult.error || agentsResult.error) {
      setCommandDataStatus('Workspace records could not load. Apply the latest Supabase schema, including project_tasks.')
      return
    }

    setProjectTasks(tasksResult.data ?? [])
    setProjectCrmRecords(crmResult.data ?? [])
    setProjectCampaigns(campaignsResult.data ?? [])
    setProjectIdeas(ideasResult.data ?? [])
    setProjectAgentRecommendations(agentsResult.data ?? [])
    setCommandDataStatus('')
  }

  const createProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setProjectStatusMessage('Creating project workspace...')

    if (!isSupabaseConfigured || !supabase) {
      setProjectStatusMessage('Project staged. Supabase env vars are not connected yet.')
      return
    }

    const { data, error } = await supabase
      .from('project_session_status')
      .insert({
        project_name: String(formData.get('projectName')),
        client_name: String(formData.get('clientName')) || 'AM Premier Solutions',
        status: String(formData.get('status')) as ProjectOperatingStatus,
        health: String(formData.get('health')) as ProjectSessionStatus['health'],
        source_session_label: String(formData.get('projectType')) || 'manual command room',
        owner: String(formData.get('owner')) || 'Elara',
        last_update: String(formData.get('lastUpdate')) || 'Project workspace created.',
        next_action: String(formData.get('nextAction')) || 'Define next action, owner, and deadline.',
      })
      .select('id')
      .single()

    if (error) {
      setProjectStatusMessage('Project could not be created. Confirm internal insert policy is active.')
      return
    }

    event.currentTarget.reset()
    setProjectStatusMessage('Project workspace created.')
    await loadProjectStatuses()
    setSelectedActionProjectId(data.id)
  }

  const createCommandRecord = async (event: FormEvent<HTMLFormElement>, table: CommandTable) => {
    event.preventDefault()
    if (!selectedActionProject || !supabase) {
      return
    }

    const formData = new FormData(event.currentTarget)
    setCommandDataStatus('Saving workspace record...')

    const baseRecord = {
      project_id: selectedActionProject.id,
      updated_at: new Date().toISOString(),
    }

    const payloadByTable: Record<CommandTable, Record<string, string | number | null>> = {
      project_tasks: {
        ...baseRecord,
        task_name: String(formData.get('taskName')),
        status: String(formData.get('taskStatus')) || 'planned',
        owner: String(formData.get('taskOwner')) || null,
        due_date: String(formData.get('taskDueDate')) || null,
        note: String(formData.get('taskNote')) || null,
        sort_order: selectedProjectTasks.length + 1,
      },
      project_crm_records: {
        ...baseRecord,
        company_name: String(formData.get('companyName')),
        contact_name: String(formData.get('contactName')) || null,
        stage: String(formData.get('crmStage')) || 'qualification',
        owner: String(formData.get('crmOwner')) || null,
        next_step: String(formData.get('crmNextStep')) || null,
        value_estimate: String(formData.get('crmValue')) || null,
      },
      project_campaigns: {
        ...baseRecord,
        campaign_name: String(formData.get('campaignName')),
        campaign_type: String(formData.get('campaignType')) || 'sales',
        channel: String(formData.get('campaignChannel')) || null,
        status: String(formData.get('campaignStatus')) || 'draft',
        recommendation: String(formData.get('campaignRecommendation')) || null,
      },
      project_ideas: {
        ...baseRecord,
        title: String(formData.get('ideaTitle')),
        score: String(formData.get('ideaScore')) || null,
        next_move: String(formData.get('ideaNextMove')) || null,
        status: String(formData.get('ideaStatus')) || 'new',
      },
      project_agent_recommendations: {
        ...baseRecord,
        agent_role: String(formData.get('agentRole')),
        assignment: String(formData.get('agentAssignment')),
        output_target: String(formData.get('agentOutput')) || null,
        status: String(formData.get('agentStatus')) || 'recommended',
      },
    }

    const { error } = await supabase.from(table).insert(payloadByTable[table])

    if (error) {
      setCommandDataStatus('Record could not be saved. Confirm internal workspace policies are active.')
      return
    }

    event.currentTarget.reset()
    setCommandDataStatus('Workspace record saved.')
    await loadCommandRecords()
  }

  const updateCommandRecordStatus = async (table: CommandTable, id: string, status: string) => {
    if (!supabase) {
      return
    }

    setCommandDataStatus('Updating record status...')
    const fieldName = table === 'project_crm_records' ? 'stage' : 'status'
    const { error } = await supabase
      .from(table)
      .update({ [fieldName]: status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      setCommandDataStatus('Status update failed.')
      return
    }

    setCommandDataStatus('Status updated.')
    await loadCommandRecords()
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

  const advanceProjectPhase = async (project: ProjectSessionStatus) => {
    setProjectStatusMessage(`Moving ${project.project_name} to next phase...`)

    if (!isSupabaseConfigured || !supabase) {
      setProjectStatusMessage('Next phase staged. Supabase env vars are not connected yet.')
      return
    }

    const { error } = await supabase
      .from('project_session_status')
      .update({
        status: 'active',
        health: 'green',
        blocker: null,
        last_update: `Omar moved this project to next phase / follow-up on ${new Date().toLocaleDateString()}.`,
        next_action: `Execute next phase / follow-up for ${project.project_name}.`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)

    if (error) {
      setProjectStatusMessage('Next phase could not be saved. Confirm internal update policy is active.')
      return
    }

    setProjectStatusMessage(`${project.project_name} moved to next phase.`)
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

  const createAgentWorkOrder = async (project: ProjectSessionStatus, workType: string, summary: string) => {
    setProjectStatusMessage(`Creating ${workType} work order for ${project.project_name}...`)

    if (!isSupabaseConfigured || !supabase) {
      setProjectStatusMessage(`${workType} work order staged. Supabase env vars are not connected yet.`)
      return
    }

    const { error } = await supabase.from('intake_requests').insert({
      requester_id: session?.user.id ?? null,
      request_type: workType,
      company: project.client_name || project.project_name,
      summary: `${project.project_name}: ${summary}`,
      status: 'draft',
    })

    setProjectStatusMessage(
      error
        ? `${workType} work order could not be saved. Check intake policies.`
        : `${workType} work order created for ${project.project_name}.`,
    )
  }

  if (isCommandRoute || isCrmRoute) {
    return (
      <main className="portal-shell command-page-shell">
        <nav className="topbar" aria-label={isCrmRoute ? 'CRM navigation' : 'Command portal navigation'}>
          <button
            type="button"
            className="brand brand-button"
            aria-label="Return to AM Premier Connect home"
            onClick={() => navigateTo('/')}
          >
            <span className="brand-mark">AP</span>
            <span>
              <strong>AM Premier Connect</strong>
              <small>{isCrmRoute ? 'CRM pipeline' : 'Internal command portal'}</small>
            </span>
          </button>
          <div className="nav-actions">
            <button type="button" className="nav-link-button" onClick={() => navigateTo('/')}>
              Home
            </button>
            <button type="button" className="nav-link-button" onClick={() => navigateTo('/command')}>
              Command
            </button>
            <button type="button" className="nav-link-button" onClick={() => navigateTo('/crm')}>
              CRM
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
                <p className="eyebrow">{isCrmRoute ? 'CRM pipeline' : 'Internal command portal'}</p>
                <h1>{isCrmRoute ? 'CRM pipeline for AM Premier opportunities.' : 'Live project status pulled from operating sessions.'}</h1>
                <p className="hero-text">
                  {isCrmRoute
                    ? 'Track companies, contacts, stages, values, owners, and next follow-ups by project.'
                    : 'Internal workspace for project health, next actions, blockers, and active session status.'}
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

            <section className="ops-create-panel" aria-label="Create project workspace">
              <div className="panel-heading">
                <BriefcaseBusiness size={20} />
                <div>
                  <h2>Create Project Workspace</h2>
                  <p>Add a real tracked project with owner, status, last update, and next action.</p>
                </div>
              </div>
              <form className="ops-form-grid" onSubmit={createProject}>
                <label>
                  Project name
                  <input name="projectName" placeholder="AM Premier Station" required type="text" />
                </label>
                <label>
                  Client / business
                  <input name="clientName" placeholder="AM Premier Solutions" type="text" />
                </label>
                <label>
                  Type / source
                  <input name="projectType" placeholder="Construction / CRM / campaign" type="text" />
                </label>
                <label>
                  Owner
                  <input name="owner" placeholder="Elara / Omar / Agent" type="text" />
                </label>
                <label>
                  Status
                  <select defaultValue="active" name="status">
                    <option value="active">Active</option>
                    <option value="waiting">Waiting</option>
                    <option value="blocked">Blocked</option>
                    <option value="complete">Complete</option>
                  </select>
                </label>
                <label>
                  Health
                  <select defaultValue="green" name="health">
                    <option value="green">Green</option>
                    <option value="yellow">Yellow</option>
                    <option value="red">Red</option>
                  </select>
                </label>
                <label className="wide">
                  Last update
                  <textarea name="lastUpdate" placeholder="What changed or what exists right now?" />
                </label>
                <label className="wide">
                  Next action
                  <textarea name="nextAction" placeholder="The next specific action, owner, and timing." />
                </label>
                <button type="submit">
                  Create Workspace <BadgeCheck size={18} />
                </button>
              </form>
            </section>

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
                {selectedWorkspace && (
                  <div className="workspace-command-center">
                    <div className="workspace-hero">
                      <div>
                        <span className="decision-label">Workspace</span>
                        <h3>{selectedWorkspace.type}</h3>
                        <p>{selectedWorkspace.objective}</p>
                      </div>
                      <div className="workspace-stage">
                        <span>Stage</span>
                        <strong>{selectedWorkspace.stage}</strong>
                      </div>
                    </div>

                    <div className="workspace-tabs" role="tablist" aria-label="Project workspace sections">
                      {workspaceTabs.map((tab) => (
                        <button
                          type="button"
                          role="tab"
                          aria-selected={workspaceTab === tab.id}
                          className={workspaceTab === tab.id ? 'active' : ''}
                          key={tab.id}
                          onClick={() => setWorkspaceTab(tab.id)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {workspaceTab === 'command' && (
                      <div className="workspace-tab-panel">
                        <div className="workspace-kpi-grid">
                          <div>
                            <BriefcaseBusiness size={18} />
                            <span>Project Type</span>
                            <strong>{selectedWorkspace.type}</strong>
                          </div>
                          <div>
                            <CalendarDays size={18} />
                            <span>Current Phase</span>
                            <strong>{selectedWorkspace.construction.phase}</strong>
                          </div>
                          <div>
                            <Target size={18} />
                            <span>CRM Value</span>
                            <strong>{selectedWorkspace.crm.pipelineValue}</strong>
                          </div>
                          <div>
                            <Megaphone size={18} />
                            <span>Campaigns</span>
                            <strong>{selectedWorkspace.campaigns.length}</strong>
                          </div>
                        </div>
                        <div className="workspace-recommendation">
                          <Lightbulb size={19} />
                          <div>
                            <strong>Elara recommendation</strong>
                            <p>
                              Treat this as a live operating room: every project should have a schedule, CRM lane,
                              campaign lane, agent assignments, and one clear next decision.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {workspaceTab === 'construction' && (
                      <div className="workspace-tab-panel">
                        <div className="workspace-section-head">
                          <div>
                            <span className="decision-label">Construction Manager</span>
                            <h3>{selectedWorkspace.construction.phase}</h3>
                            <p>{selectedWorkspace.construction.nextMilestone}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              createAgentWorkOrder(
                                selectedActionProject,
                                'construction_manager',
                                `Build the next 7-day construction lookahead. Milestone: ${selectedWorkspace.construction.nextMilestone}`,
                              )
                            }
                          >
                            Ask Construction Manager
                          </button>
                        </div>
                        <div className="schedule-list">
                          {(selectedProjectTasks.length > 0
                            ? selectedProjectTasks.map((task) => ({
                                id: task.id,
                                name: task.task_name,
                                status: task.status,
                                owner: task.owner || 'Unassigned',
                                note: `${task.note || 'No note captured.'}${task.due_date ? ` Due ${task.due_date}.` : ''}`,
                                persisted: true,
                              }))
                            : selectedWorkspace.construction.schedule.map((item) => ({ ...item, id: item.name, persisted: false }))
                          ).map((item) => (
                            <article className="schedule-row" key={item.id}>
                              <span className={`schedule-status ${item.status}`}>{item.status}</span>
                              <div>
                                <strong>{item.name}</strong>
                                <p>{item.note}</p>
                                <small>{item.owner}</small>
                                {item.persisted && (
                                  <div className="record-actions">
                                    <button
                                      type="button"
                                      onClick={() => updateCommandRecordStatus('project_tasks', item.id, 'active')}
                                    >
                                      Active
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateCommandRecordStatus('project_tasks', item.id, 'complete')}
                                    >
                                      Done
                                    </button>
                                  </div>
                                )}
                              </div>
                            </article>
                          ))}
                        </div>
                        <form className="ops-form-grid compact" onSubmit={(event) => createCommandRecord(event, 'project_tasks')}>
                          <label>
                            Task / milestone
                            <input name="taskName" placeholder="Submit permit package" required type="text" />
                          </label>
                          <label>
                            Owner
                            <input name="taskOwner" placeholder="Construction Manager Agent" type="text" />
                          </label>
                          <label>
                            Status
                            <select defaultValue="planned" name="taskStatus">
                              <option value="planned">Planned</option>
                              <option value="active">Active</option>
                              <option value="waiting">Waiting</option>
                              <option value="blocked">Blocked</option>
                              <option value="complete">Complete</option>
                            </select>
                          </label>
                          <label>
                            Due date
                            <input name="taskDueDate" type="date" />
                          </label>
                          <label className="wide">
                            Note
                            <textarea name="taskNote" placeholder="Dependency, blocker, deliverable, or next step." />
                          </label>
                          <button type="submit">Add Task</button>
                        </form>
                      </div>
                    )}

                    {workspaceTab === 'crm' && (
                      <div className="workspace-tab-panel">
                        <div className="workspace-section-head">
                          <div>
                            <span className="decision-label">CRM</span>
                            <h3>Pipeline and relationships</h3>
                            <p>Track companies, decision owners, deal stages, next steps, and follow-up owners.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              createAgentWorkOrder(
                                selectedActionProject,
                                'crm_agent',
                                'Create or refresh the CRM pipeline, contact map, next follow-ups, and opportunity stages.',
                              )
                            }
                          >
                            Ask CRM Agent
                          </button>
                        </div>
                        <div className="crm-grid">
                          {(selectedProjectCrmRecords.length > 0
                            ? selectedProjectCrmRecords.map((record) => ({
                                id: record.id,
                                name: record.company_name,
                                stage: record.stage,
                                nextStep: `${record.next_step || 'No next step captured.'}${
                                  record.contact_name ? ` Contact: ${record.contact_name}.` : ''
                                }${record.value_estimate ? ` Value: ${record.value_estimate}.` : ''}`,
                                owner: record.owner || 'Unassigned',
                                persisted: true,
                              }))
                            : selectedWorkspace.crm.companies.map((company) => ({
                                ...company,
                                id: company.name,
                                persisted: false,
                              }))
                          ).map((company) => (
                            <article className="crm-card" key={company.id}>
                              <span>{company.stage}</span>
                              <h3>{company.name}</h3>
                              <p>{company.nextStep}</p>
                              <small>{company.owner}</small>
                              {company.persisted && (
                                <div className="record-actions">
                                  <button
                                    type="button"
                                    onClick={() => updateCommandRecordStatus('project_crm_records', company.id, 'follow-up')}
                                  >
                                    Follow-up
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateCommandRecordStatus('project_crm_records', company.id, 'won')}
                                  >
                                    Won
                                  </button>
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                        <form
                          className="ops-form-grid compact"
                          onSubmit={(event) => createCommandRecord(event, 'project_crm_records')}
                        >
                          <label>
                            Company
                            <input name="companyName" placeholder="Site owner / utility / vendor" required type="text" />
                          </label>
                          <label>
                            Contact
                            <input name="contactName" placeholder="Decision maker" type="text" />
                          </label>
                          <label>
                            Stage
                            <input name="crmStage" placeholder="Qualification / proposal / follow-up" type="text" />
                          </label>
                          <label>
                            Owner
                            <input name="crmOwner" placeholder="CRM Agent" type="text" />
                          </label>
                          <label>
                            Value
                            <input name="crmValue" placeholder="$ amount or TBD" type="text" />
                          </label>
                          <label className="wide">
                            Next step
                            <textarea name="crmNextStep" placeholder="Call, quote, meeting, doc request, or owner decision." />
                          </label>
                          <button type="submit">Add CRM Record</button>
                        </form>
                      </div>
                    )}

                    {workspaceTab === 'campaigns' && (
                      <div className="workspace-tab-panel">
                        <div className="workspace-section-head">
                          <div>
                            <span className="decision-label">Campaign Engine</span>
                            <h3>Marketing and sales campaigns</h3>
                            <p>Turn project movement into outreach, content, launch assets, and sales sequences.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              createAgentWorkOrder(
                                selectedActionProject,
                                'campaign_agent',
                                'Create a marketing campaign and sales campaign with audience, offer, channels, messages, and execution steps.',
                              )
                            }
                          >
                            Generate Campaign
                          </button>
                        </div>
                        <div className="campaign-grid">
                          {(selectedProjectCampaigns.length > 0
                            ? selectedProjectCampaigns.map((campaign) => ({
                                id: campaign.id,
                                name: campaign.campaign_name,
                                channel: `${campaign.campaign_type}${campaign.channel ? ` / ${campaign.channel}` : ''}`,
                                status: campaign.status,
                                recommendation: campaign.recommendation || 'No recommendation captured.',
                                persisted: true,
                              }))
                            : selectedWorkspace.campaigns.map((campaign) => ({
                                ...campaign,
                                id: campaign.name,
                                persisted: false,
                              }))
                          ).map((campaign) => (
                            <article className="campaign-card" key={campaign.id}>
                              <div>
                                <Megaphone size={18} />
                                <span>{campaign.status}</span>
                              </div>
                              <h3>{campaign.name}</h3>
                              <small>{campaign.channel}</small>
                              <p>{campaign.recommendation}</p>
                              {campaign.persisted && (
                                <div className="record-actions">
                                  <button
                                    type="button"
                                    onClick={() => updateCommandRecordStatus('project_campaigns', campaign.id, 'active')}
                                  >
                                    Active
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateCommandRecordStatus('project_campaigns', campaign.id, 'complete')}
                                  >
                                    Done
                                  </button>
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                        <form
                          className="ops-form-grid compact"
                          onSubmit={(event) => createCommandRecord(event, 'project_campaigns')}
                        >
                          <label>
                            Campaign
                            <input name="campaignName" placeholder="Site-host sales campaign" required type="text" />
                          </label>
                          <label>
                            Type
                            <select defaultValue="sales" name="campaignType">
                              <option value="sales">Sales</option>
                              <option value="marketing">Marketing</option>
                              <option value="launch">Launch</option>
                              <option value="partner">Partner</option>
                            </select>
                          </label>
                          <label>
                            Channel
                            <input name="campaignChannel" placeholder="Email, calls, LinkedIn, ads" type="text" />
                          </label>
                          <label>
                            Status
                            <select defaultValue="draft" name="campaignStatus">
                              <option value="draft">Draft</option>
                              <option value="recommended">Recommended</option>
                              <option value="active">Active</option>
                              <option value="complete">Complete</option>
                            </select>
                          </label>
                          <label className="wide">
                            Recommendation
                            <textarea name="campaignRecommendation" placeholder="Audience, offer, message, and next execution step." />
                          </label>
                          <button type="submit">Add Campaign</button>
                        </form>
                      </div>
                    )}

                    {workspaceTab === 'ideas' && (
                      <div className="workspace-tab-panel">
                        <div className="workspace-section-head">
                          <div>
                            <span className="decision-label">Idea Room</span>
                            <h3>Strategic ideas and experiments</h3>
                            <p>Capture raw ideas, score them, and turn the strongest ones into execution tracks.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              createAgentWorkOrder(
                                selectedActionProject,
                                'idea_room',
                                'Run an idea-room session and convert the strongest ideas into campaigns, tasks, and risks.',
                              )
                            }
                          >
                            Run Idea Room
                          </button>
                        </div>
                        <div className="idea-list">
                          {(selectedProjectIdeas.length > 0
                            ? selectedProjectIdeas.map((idea) => ({
                                id: idea.id,
                                title: idea.title,
                                score: idea.score || idea.status,
                                nextMove: idea.next_move || 'No next move captured.',
                                persisted: true,
                              }))
                            : selectedWorkspace.ideas.map((idea) => ({ ...idea, id: idea.title, persisted: false }))
                          ).map((idea) => (
                            <article className="idea-row" key={idea.id}>
                              <Lightbulb size={18} />
                              <div>
                                <strong>{idea.title}</strong>
                                <p>{idea.nextMove}</p>
                                {idea.persisted && (
                                  <div className="record-actions">
                                    <button
                                      type="button"
                                      onClick={() => updateCommandRecordStatus('project_ideas', idea.id, 'promoted')}
                                    >
                                      Promote
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateCommandRecordStatus('project_ideas', idea.id, 'rejected')}
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                              <span>{idea.score}</span>
                            </article>
                          ))}
                        </div>
                        <form className="ops-form-grid compact" onSubmit={(event) => createCommandRecord(event, 'project_ideas')}>
                          <label>
                            Idea
                            <input name="ideaTitle" placeholder="EV site-host ROI calculator" required type="text" />
                          </label>
                          <label>
                            Score
                            <select defaultValue="High" name="ideaScore">
                              <option value="Very high">Very high</option>
                              <option value="High">High</option>
                              <option value="Medium">Medium</option>
                              <option value="Low">Low</option>
                            </select>
                          </label>
                          <label>
                            Status
                            <select defaultValue="new" name="ideaStatus">
                              <option value="new">New</option>
                              <option value="promoted">Promoted</option>
                              <option value="rejected">Rejected</option>
                              <option value="parked">Parked</option>
                            </select>
                          </label>
                          <label className="wide">
                            Next move
                            <textarea name="ideaNextMove" placeholder="What should happen if this idea is worth moving?" />
                          </label>
                          <button type="submit">Add Idea</button>
                        </form>
                      </div>
                    )}

                    {workspaceTab === 'agents' && (
                      <div className="workspace-tab-panel">
                        <div className="workspace-section-head">
                          <div>
                            <span className="decision-label">Agent Workforce</span>
                            <h3>Assigned operators</h3>
                            <p>Each project gets specialized agents that think, recommend, and produce execution assets.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              createAgentWorkOrder(
                                selectedActionProject,
                                'agent_workforce',
                                'Assign the right agents and generate their first deliverables for this project.',
                              )
                            }
                          >
                            Activate Agents
                          </button>
                        </div>
                        <div className="agent-grid">
                          {(selectedProjectAgentRecommendations.length > 0
                            ? selectedProjectAgentRecommendations.map((agent) => ({
                                id: agent.id,
                                role: agent.agent_role,
                                assignment: agent.assignment,
                                output: `${agent.output_target || 'No output target captured.'} Status: ${agent.status}.`,
                                persisted: true,
                              }))
                            : selectedWorkspace.agents.map((agent) => ({ ...agent, id: agent.role, persisted: false }))
                          ).map((agent) => (
                            <article className="agent-card" key={agent.id}>
                              <UserRound size={18} />
                              <h3>{agent.role}</h3>
                              <p>{agent.assignment}</p>
                              <small>{agent.output}</small>
                              {agent.persisted && (
                                <div className="record-actions">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCommandRecordStatus('project_agent_recommendations', agent.id, 'active')
                                    }
                                  >
                                    Active
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateCommandRecordStatus('project_agent_recommendations', agent.id, 'complete')
                                    }
                                  >
                                    Done
                                  </button>
                                </div>
                              )}
                            </article>
                          ))}
                        </div>
                        <form
                          className="ops-form-grid compact"
                          onSubmit={(event) => createCommandRecord(event, 'project_agent_recommendations')}
                        >
                          <label>
                            Agent role
                            <input name="agentRole" placeholder="Construction Manager Agent" required type="text" />
                          </label>
                          <label>
                            Status
                            <select defaultValue="recommended" name="agentStatus">
                              <option value="recommended">Recommended</option>
                              <option value="active">Active</option>
                              <option value="complete">Complete</option>
                            </select>
                          </label>
                          <label className="wide">
                            Assignment
                            <textarea name="agentAssignment" placeholder="What this agent owns for the project." required />
                          </label>
                          <label className="wide">
                            Output target
                            <textarea name="agentOutput" placeholder="Schedule, campaign, call list, risk memo, or decision brief." />
                          </label>
                          <button type="submit">Assign Agent</button>
                        </form>
                      </div>
                    )}
                  </div>
                )}
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
                    <div className="stats-lanes" aria-label="Project lane breakdown">
                      {selectedProjectStats.lanes.map((lane) => (
                        <div key={lane.name}>
                          <strong>{lane.name}</strong>
                          <span>{lane.value}</span>
                          <small>{lane.note}</small>
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
                  <button
                    type="button"
                    className="decision-primary"
                    onClick={() => updateProjectOperatingStatus(selectedActionProject, 'active')}
                  >
                    Approve / Move Active
                  </button>
                  <button type="button" className="decision-forward" onClick={() => advanceProjectPhase(selectedActionProject)}>
                    Next / Follow Up
                  </button>
                  <button type="button" className="decision-update" onClick={() => requestProjectUpdate(selectedActionProject)}>
                    Ask Elara for Update
                  </button>
                  <button type="button" onClick={() => updateProjectOperatingStatus(selectedActionProject, 'waiting')}>
                    Keep Waiting
                  </button>
                  <button
                    type="button"
                    className="decision-complete"
                    onClick={() => updateProjectOperatingStatus(selectedActionProject, 'complete')}
                  >
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
            {commandDataStatus && (
              <div className="success-note" role="status">
                <ClipboardCheck size={18} />
                <span>{commandDataStatus}</span>
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
                filteredProjects.map((project) => {
                  const progress = getProjectProgress(project)

                  return (
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
                    <div className={`project-progress ${project.health}`} aria-label={`${project.project_name} progress`}>
                      <div className="project-progress-label">
                        <span>{progress.label}</span>
                        <strong>{progress.value}%</strong>
                      </div>
                      <div className="project-progress-track">
                        <span style={{ width: `${progress.value}%` }} />
                      </div>
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
                  )
                })
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

  if (isChatRoute) {
    return (
      <main className="portal-shell chat-page-shell">
        <nav className="topbar" aria-label="Chat navigation">
          <a className="brand" href="/" aria-label="AM Premier Connect home">
            <span className="brand-mark">AP</span>
            <span>
              <strong>AM Premier Connect</strong>
              <small>Site chat</small>
            </span>
          </a>
          <div className="nav-actions">
            <button type="button" onClick={() => navigateTo('/')}>
              Portal Home
            </button>
            {isInternal && (
              <>
                <button type="button" onClick={() => navigateTo('/command')}>
                  Command Portal
                </button>
                <button type="button" onClick={() => navigateTo('/crm')}>
                  CRM
                </button>
              </>
            )}
            {session && (
              <button type="button" className="icon-button" aria-label="Sign out" onClick={handleSignOut}>
                <LogOut size={18} />
              </button>
            )}
          </div>
        </nav>

        <section className="chat-shell" aria-label="OpenClaw workspace access">
          <div className="chat-header">
            <div className="panel-heading">
              <MessageCircle size={21} />
              <div>
                <p className="eyebrow">Elara</p>
                <h1>OpenClaw workspace chat</h1>
              </div>
            </div>
            <span>{session ? session.user.email : 'Portal sign-in required'}</span>
          </div>

          {session ? (
            <div className="chat-thread" aria-live="polite">
              <article className="chat-empty">
                <MessageCircle size={22} />
                <h2>Open the real Elara session.</h2>
                <p>
                  This opens the active OpenClaw workspace, main chat, memory, tools, and control surface through the
                  secure web access gate.
                </p>
                <a className="full-button" href={openClawWebUrl} rel="noreferrer" target="_blank">
                  Open Elara Workspace <ExternalLink size={18} />
                </a>
              </article>
            </div>
          ) : (
            <section className="locked-command-state">
              <div className="login-panel">
                <div className="panel-heading">
                  <LockKeyhole size={20} />
                  <div>
                    <h1>Sign in to open chat.</h1>
                    <p>Use your AM Premier Connect portal account.</p>
                  </div>
                </div>
                <button type="button" className="full-button" onClick={() => navigateTo('/')}>
                  Return to portal login <ArrowRight size={18} />
                </button>
              </div>
            </section>
          )}
        </section>
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
          {isInternal && (
            <button type="button" onClick={() => navigateTo('/crm')}>
              CRM
            </button>
          )}
          <button type="button" onClick={() => navigateTo('/chat')}>
            Elara Workspace
          </button>
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
                <>
                  <button type="button" className="full-button admin-link-button" onClick={() => navigateTo('/crm')}>
                    Open CRM <BriefcaseBusiness size={18} />
                  </button>
                  <button type="button" className="full-button admin-link-button" onClick={() => navigateTo('/command')}>
                    Open Command Portal <Radio size={18} />
                  </button>
                </>
              )}
              <button type="button" className="full-button" onClick={() => navigateTo('/chat')}>
                Open Elara Workspace <MessageCircle size={18} />
              </button>
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
