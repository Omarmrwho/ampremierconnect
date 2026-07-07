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
  Download,
  Edit3,
  ExternalLink,
  Filter,
  FileText,
  Gauge,
  Image,
  Lightbulb,
  LockKeyhole,
  LogOut,
  Link,
  MailCheck,
  Megaphone,
  MessageCircle,
  Radio,
  Send,
  ShieldCheck,
  Target,
  Trash2,
  UserRound,
  UsersRound,
  Zap,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import brandLogo from './assets/am-premier-logo.png'
import proposalMedia from './assets/am-premier-media.jpg'
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
    description: 'Project intake, status updates, deliverables, and decision records in one controlled place.',
    status: 'Secure access',
  },
  {
    icon: UsersRound,
    title: 'Vendor Access',
    description: 'Vendor qualification, documents, bid packages, and project communications.',
    status: 'Approval required',
  },
  {
    icon: ShieldCheck,
    title: 'Internal Admin',
    description: 'Approvals, active workspaces, opportunity tracking, and account controls.',
    status: 'Restricted',
  },
]

const operatingQueue = [
  'Submit a request',
  'Receive admin approval',
  'Coordinate documents and updates',
  'Keep project decisions traceable',
]

const readinessItems = [
  { label: 'Secure Access', value: 'Login and approval workflow' },
  { label: 'Project Intake', value: 'Structured requests and updates' },
  { label: 'Operations', value: 'Client, vendor, and internal lanes' },
]

const projectFilters = ['all', 'active', 'waiting', 'blocked', 'complete'] as const
const crmGapFilters = ['all', 'has-response', 'missing-phone', 'missing-source', 'missing-fit'] as const
const crmBulkStages = ['follow-up', 'qualified', 'proposal', 'won', 'dead'] as const
const campaignActivityFilters = ['all', 'has-activity', 'no-activity'] as const
const proposalPipelineStages = [
  { id: 'draft', label: 'Draft', progress: 12 },
  { id: 'ready', label: 'Ready', progress: 24 },
  { id: 'sent', label: 'Sent', progress: 38 },
  { id: 'opened', label: 'Opened', progress: 52 },
  { id: 'read', label: 'Read', progress: 66 },
  { id: 'commented', label: 'Commented', progress: 78 },
  { id: 'signed', label: 'Signed', progress: 92 },
  { id: 'accepted', label: 'Accepted', progress: 100 },
  { id: 'declined', label: 'Declined', progress: 100 },
] as const
const proposalFilterOptions = ['all', ...proposalPipelineStages.map((stage) => stage.id)] as const

type ProjectFilter = (typeof projectFilters)[number]
type CrmGapFilter = (typeof crmGapFilters)[number]
type CampaignActivityFilter = (typeof campaignActivityFilters)[number]
type ProposalFilter = (typeof proposalFilterOptions)[number]
type ProjectOperatingStatus = ProjectSessionStatus['status']
type WorkspaceTab = 'command' | 'construction' | 'crm' | 'campaigns' | 'proposals' | 'ideas' | 'agents'

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
  contact_title?: string | null
  email?: string | null
  phone?: string | null
  location?: string | null
  segment?: string | null
  website?: string | null
  source_url?: string | null
  campaign_name?: string | null
  channel?: string | null
  last_contacted_at?: string | null
  last_contact_subject?: string | null
  reply_body?: string | null
  reply_preview?: string | null
  reply_from?: string | null
  reply_received_at?: string | null
  reply_message_id?: string | null
  fit_reason?: string | null
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
  objective?: string | null
  audience?: string | null
  offer?: string | null
  budget?: string | null
  launch_date?: string | null
  owner?: string | null
  next_step?: string | null
  proof_notes?: string | null
  recommendation: string | null
}

type ProjectCampaignActivity = {
  id: string
  project_id: string
  campaign_id: string
  activity_type: string
  activity_date: string
  owner: string | null
  outcome: string | null
  next_step: string | null
}

type ProjectProposal = {
  id: string
  project_id: string
  proposal_date: string
  proposal_time: string | null
  company_name: string
  company_address: string | null
  directed_to: string
  contact_title: string | null
  contact_email: string | null
  price: string | null
  scope_summary: string | null
  terms: string | null
  valid_until: string | null
  status: string
  next_step: string | null
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

type CommandTable =
  | 'project_tasks'
  | 'project_crm_records'
  | 'project_campaigns'
  | 'project_proposals'
  | 'project_ideas'
  | 'project_agent_recommendations'
type CreatableCommandTable = Exclude<CommandTable, 'project_proposals'>

type ParsedCrmRecord = ProjectCrmRecord & {
  email: string
  phone: string
  location: string
  segment: string
  website: string
  source: string
  whyFit: string
  campaign: string
  sent: string
  response: string
  hasResponse: boolean
  followUp: string
}

type WorkspaceCrmCard = {
  id: string
  name: string
  stage: string
  nextStep: string
  owner: string
  persisted: boolean
}

type CampaignReplyRow = {
  id: string
  source: string
  projectId: string
  projectName: string
  campaignId: string
  campaignName: string
  companyName: string
  contactName: string
  contactEmail: string
  replyDate: string
  outcome: string
  replyBody: string
  nextStep: string
}

const workspaceTabs: { id: WorkspaceTab; label: string }[] = [
  { id: 'command', label: 'Command' },
  { id: 'construction', label: 'Schedule' },
  { id: 'crm', label: 'CRM' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'proposals', label: 'Proposals' },
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

const getCrmField = (details: string | null, label: string) => {
  if (!details) {
    return ''
  }

  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = details.match(new RegExp(`${escapedLabel}:\\s*([\\s\\S]*?)(?=\\s\\|\\s[A-Z][A-Za-z /-]*:|$)`, 'i'))
  return match?.[1]?.trim() || ''
}

const getReplyDetailField = (details: string | null, label: string) => {
  if (!details) {
    return ''
  }

  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = details.match(
    new RegExp(
      `(?:^|\\s\\|\\s)${escapedLabel}:\\s*([\\s\\S]*?)(?=\\s\\|\\s(?:Response from|Response date|Graph message id|Response match|$):|$)`,
      'i',
    ),
  )
  return match?.[1]?.trim() || ''
}

const removeQuotedEmailTrail = (value: string) =>
  value
    .split(/\n\s*(?:On .+ wrote:|From: .+|Sent: .+|To: .+|Subject: .+)/i)[0]
    .replace(/\s*\|?\s*Response from:\s*[\s\S]*$/i, '')
    .trim()

const getReadableReplyBody = (record: Pick<ProjectCrmRecord, 'next_step' | 'reply_body' | 'reply_preview' | 'last_contact_subject'>, fallback = '') => {
  const details = record.next_step || ''
  const body =
    record.reply_body ||
    getReplyDetailField(details, 'Body') ||
    getReplyDetailField(details, 'Message') ||
    getCrmField(details, 'Body') ||
    getCrmField(details, 'Message')
  const preview = record.reply_preview || getReplyDetailField(details, 'Preview')
  const response = getReplyDetailField(details, 'Response') || getCrmField(details, 'Response') || getCrmField(details, 'Reply')
  const subjectOnly = record.last_contact_subject ? `Subject: ${record.last_contact_subject}` : ''
  const readable = removeQuotedEmailTrail(body || preview || response || fallback || subjectOnly)

  return readable || 'No readable reply body was saved for this row yet.'
}

const cleanDisplayText = (value: string, maxLength = 280) => {
  const compact = value
    .replace(/\bGraph message id:\s*\S+/gi, '')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (email) => email.toLowerCase())
    .replace(/\s*\|\s*/g, ' | ')
    .replace(/\s+/g, ' ')
    .trim()

  if (compact.length <= maxLength) {
    return compact
  }

  return `${compact.slice(0, maxLength).trim()}...`
}

const responseSignalPattern =
  /\b(reply|replied|response|responded|interested|not a fit|not-fit|no thanks|opt[- ]?out|unsubscribe|bounce|bounced|meeting|call booked|scheduled|warm|positive|negative)\b/i

const hasResponseSignal = (...values: Array<string | null | undefined>) =>
  values.some((value) => responseSignalPattern.test(value || ''))

const parseCrmRecord = (record: ProjectCrmRecord): ParsedCrmRecord => {
  const details = record.next_step || ''
  const email = record.email || getCrmField(details, 'Email')
  const phone = record.phone || getCrmField(details, 'Phone')
  const location = record.location || getCrmField(details, 'Location')
  const segment = record.segment || getCrmField(details, 'Segment')
  const website = record.website || getCrmField(details, 'Website')
  const source = record.source_url || getCrmField(details, 'Source')
  const whyFit = record.fit_reason || getCrmField(details, 'Why fit')
  const campaign = record.campaign_name || getCrmField(details, 'Campaign')
  const response =
    record.reply_body ||
    record.reply_preview ||
    getReplyDetailField(details, 'Preview') ||
    getReplyDetailField(details, 'Body') ||
    getCrmField(details, 'Response') ||
    getCrmField(details, 'Reply')
  const sent = record.last_contacted_at
    ? `${record.last_contacted_at.slice(0, 10)}${record.last_contact_subject ? ` | ${record.last_contact_subject}` : ''}`
    : getCrmField(details, 'Sent')
  const extraRoutes = getCrmField(details, 'Additional sends/routes')
  const manualNextStep =
    details && !email && !phone && !location && !segment && !website && !source && !whyFit && !campaign && !sent
      ? details
      : ''

  return {
    ...record,
    email,
    phone,
    location,
    segment,
    website,
    source,
    whyFit,
    campaign,
    sent,
    response,
    hasResponse: Boolean(
      response ||
        record.reply_body ||
        record.reply_preview ||
        hasResponseSignal(record.stage, record.next_step, record.last_contact_subject),
    ),
    followUp: manualNextStep || extraRoutes || 'Review reply status and schedule next touch.',
  }
}

const getProposalStage = (status: string) =>
  proposalPipelineStages.find((stage) => stage.id === status) || proposalPipelineStages[0]

const getProposalProjectName = (proposal: ProjectProposal, projects: ProjectSessionStatus[]) =>
  projects.find((project) => project.id === proposal.project_id)?.project_name || 'Deleted or unknown workspace'

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
  const [crmSearch, setCrmSearch] = useState('')
  const [crmStageFilter, setCrmStageFilter] = useState('all')
  const [crmSegmentFilter, setCrmSegmentFilter] = useState('all')
  const [crmCampaignFilter, setCrmCampaignFilter] = useState('all')
  const [crmGapFilter, setCrmGapFilter] = useState<CrmGapFilter>('all')
  const [selectedCrmRecordIds, setSelectedCrmRecordIds] = useState<string[]>([])
  const [selectedCrmRecordId, setSelectedCrmRecordId] = useState<string | null>(null)
  const [projectCampaigns, setProjectCampaigns] = useState<ProjectCampaign[]>([])
  const [projectCampaignActivities, setProjectCampaignActivities] = useState<ProjectCampaignActivity[]>([])
  const [campaignSearch, setCampaignSearch] = useState('')
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all')
  const [campaignActivityFilter, setCampaignActivityFilter] = useState<CampaignActivityFilter>('all')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null)
  const [projectProposals, setProjectProposals] = useState<ProjectProposal[]>([])
  const [proposalSearch, setProposalSearch] = useState('')
  const [proposalStatusFilter, setProposalStatusFilter] = useState<ProposalFilter>('all')
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null)
  const [lastGeneratedProposalId, setLastGeneratedProposalId] = useState<string | null>(null)
  const [projectIdeas, setProjectIdeas] = useState<ProjectIdea[]>([])
  const [projectAgentRecommendations, setProjectAgentRecommendations] = useState<ProjectAgentRecommendation[]>([])
  const decisionDrawerRef = useRef<HTMLElement | null>(null)

  const isInternal = profile?.role === 'internal'
  const isCommandRoute = routePath === '/command'
  const isCrmRoute = routePath === '/crm'
  const isCampaignsRoute = routePath === '/campaigns'
  const isProposalsRoute = routePath === '/proposals'
  const isChatRoute = routePath === '/chat'
  const operatingProjects = useMemo(
    () => [
      ...projectStatuses,
      ...starterProjects.filter(
        (starterProject) => !projectStatuses.some((project) => project.project_name === starterProject.project_name),
      ),
    ],
    [projectStatuses],
  )
  const persistedProjectIds = useMemo(() => new Set(projectStatuses.map((project) => project.id)), [projectStatuses])
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
  const proposalTargetProject =
    selectedActionProject && persistedProjectIds.has(selectedActionProject.id)
      ? selectedActionProject
      : projectStatuses[0] || null
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
  const parsedSelectedProjectCrmRecords = selectedProjectCrmRecords.map(parseCrmRecord)
  const parsedAllCrmRecords = projectCrmRecords.map(parseCrmRecord)
  const responseCrmRecords = parsedAllCrmRecords.filter((record) => record.hasResponse)
  const crmFilterOptions = {
    stages: ['all', ...Array.from(new Set(parsedSelectedProjectCrmRecords.map((record) => record.stage).filter(Boolean))).sort()],
    segments: ['all', ...Array.from(new Set(parsedSelectedProjectCrmRecords.map((record) => record.segment).filter(Boolean))).sort()],
    campaigns: ['all', ...Array.from(new Set(parsedSelectedProjectCrmRecords.map((record) => record.campaign).filter(Boolean))).sort()],
  }
  const crmSearchText = crmSearch.trim().toLowerCase()
  const filteredSelectedProjectCrmRecords = parsedSelectedProjectCrmRecords.filter((record) => {
    const searchableText = [
      record.company_name,
      record.contact_name,
      record.stage,
      record.email,
      record.phone,
      record.location,
      record.segment,
      record.campaign,
      record.whyFit,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    const matchesSearch = crmSearchText ? searchableText.includes(crmSearchText) : true
    const matchesStage = crmStageFilter === 'all' || record.stage === crmStageFilter
    const matchesSegment = crmSegmentFilter === 'all' || record.segment === crmSegmentFilter
    const matchesCampaign = crmCampaignFilter === 'all' || record.campaign === crmCampaignFilter
    const matchesGap =
      crmGapFilter === 'all' ||
      (crmGapFilter === 'has-response' && record.hasResponse) ||
      (crmGapFilter === 'missing-phone' && !record.phone) ||
      (crmGapFilter === 'missing-source' && !record.source && !record.website) ||
      (crmGapFilter === 'missing-fit' && !record.whyFit)
    return matchesSearch && matchesStage && matchesSegment && matchesCampaign && matchesGap
  })
  const visibleCrmRecordIds = filteredSelectedProjectCrmRecords.map((record) => record.id)
  const selectedVisibleCrmRecordIds = selectedCrmRecordIds.filter((id) => visibleCrmRecordIds.includes(id))
  const selectedCrmRecord =
    filteredSelectedProjectCrmRecords.find((record) => record.id === selectedCrmRecordId) ||
    filteredSelectedProjectCrmRecords[0] ||
    null
  const selectedProjectStageCount = new Set(parsedSelectedProjectCrmRecords.map((record) => record.stage)).size
  const selectedProjectContactCount = parsedSelectedProjectCrmRecords.filter((record) => record.email || record.phone).length
  const selectedProjectResponseCount = parsedSelectedProjectCrmRecords.filter((record) => record.hasResponse).length
  const selectedProjectCampaigns = selectedActionProject
    ? projectCampaigns.filter((campaign) => campaign.project_id === selectedActionProject.id)
    : []
  const visibleReplyProjects = selectedActionProject && !isCampaignsRoute ? [selectedActionProject] : operatingProjects
  const visibleReplyProjectIds = new Set(visibleReplyProjects.map((project) => project.id))
  const getProjectName = (projectId: string) =>
    operatingProjects.find((project) => project.id === projectId)?.project_name || 'Deleted or unknown workspace'
  const getCampaignForRecord = (record: ParsedCrmRecord) => {
    const recordCampaign = record.campaign.trim().toLowerCase()
    const sameProjectCampaigns = projectCampaigns.filter((campaign) => campaign.project_id === record.project_id)

    return sameProjectCampaigns.find(
      (campaign) =>
        recordCampaign &&
        (campaign.campaign_name.toLowerCase() === recordCampaign ||
          campaign.campaign_name.toLowerCase().includes(recordCampaign) ||
          recordCampaign.includes(campaign.campaign_name.toLowerCase())),
    )
  }
  const getCampaignActivitySummary = (campaignId: string) => {
    const activities = projectCampaignActivities
      .filter((activity) => activity.campaign_id === campaignId)
      .sort((left, right) => right.activity_date.localeCompare(left.activity_date))
    const latestActivity = activities[0]

    return {
      count: activities.length,
      latestLabel: latestActivity
        ? `${latestActivity.activity_type} | ${latestActivity.activity_date}`
        : 'No activity logged',
      latestOutcome: latestActivity?.outcome || latestActivity?.next_step || '',
    }
  }
  const campaignFilterOptions = {
    statuses: ['all', ...Array.from(new Set(selectedProjectCampaigns.map((campaign) => campaign.status).filter(Boolean))).sort()],
  }
  const campaignSearchText = campaignSearch.trim().toLowerCase()
  const filteredSelectedProjectCampaigns = selectedProjectCampaigns.filter((campaign) => {
    const activitySummary = getCampaignActivitySummary(campaign.id)
    const matchesSearch = campaignSearchText
      ? [
      campaign.campaign_name,
      campaign.campaign_type,
      campaign.channel,
      campaign.status,
      campaign.objective,
      campaign.audience,
      campaign.offer,
      campaign.owner,
      campaign.next_step,
      campaign.proof_notes,
      campaign.recommendation,
      activitySummary.latestLabel,
      activitySummary.latestOutcome,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(campaignSearchText)
      : true
    const matchesStatus = campaignStatusFilter === 'all' || campaign.status === campaignStatusFilter
    const matchesActivity =
      campaignActivityFilter === 'all' ||
      (campaignActivityFilter === 'has-activity' && activitySummary.count > 0) ||
      (campaignActivityFilter === 'no-activity' && activitySummary.count === 0)

    return matchesSearch && matchesStatus && matchesActivity
  })
  const selectedCampaign =
    filteredSelectedProjectCampaigns.find((campaign) => campaign.id === selectedCampaignId) ||
    filteredSelectedProjectCampaigns[0] ||
    null
  const selectedCampaignBrief = selectedCampaign?.recommendation
    ? selectedCampaign.recommendation.split(/\n+/).map((line) => line.trim()).filter(Boolean)
    : []
  const selectedCampaignActivities = selectedCampaign
    ? projectCampaignActivities
        .filter((activity) => activity.campaign_id === selectedCampaign.id)
        .sort((left, right) => right.activity_date.localeCompare(left.activity_date))
    : []
  const campaignActivityRows: CampaignReplyRow[] = projectCampaignActivities
    .filter((activity) => hasResponseSignal(activity.activity_type, activity.outcome, activity.next_step))
    .filter((activity) => visibleReplyProjectIds.has(activity.project_id))
    .map((activity) => {
      const campaign = projectCampaigns.find((currentCampaign) => currentCampaign.id === activity.campaign_id)

      return {
        id: `activity-${activity.id}`,
        source: hasResponseSignal(activity.activity_type) ? 'Campaign activity' : 'Campaign activity outcome',
        projectId: activity.project_id,
        projectName: getProjectName(activity.project_id),
        campaignId: activity.campaign_id,
        campaignName: campaign?.campaign_name || 'Deleted or unknown campaign',
        companyName: activity.owner || 'Contact not tagged',
        contactName: activity.owner || '',
        contactEmail: 'No email captured in activity',
        replyDate: activity.activity_date,
        outcome: activity.outcome || activity.activity_type || 'Activity logged without outcome.',
        replyBody: activity.outcome || activity.next_step || activity.activity_type || 'Activity logged without readable reply text.',
        nextStep: activity.next_step || 'Review and assign follow-up.',
      }
    })
  const campaignReplyRows: CampaignReplyRow[] = [
    ...responseCrmRecords
      .filter((record) => visibleReplyProjectIds.has(record.project_id))
      .map((record) => {
        const matchedCampaign = getCampaignForRecord(record)

        return {
          id: `crm-${record.id}`,
          source: 'CRM reply',
          projectId: record.project_id,
          projectName: getProjectName(record.project_id),
          campaignId: matchedCampaign?.id || '',
          campaignName: record.campaign || matchedCampaign?.campaign_name || 'Campaign not tagged',
          companyName: record.company_name,
          contactName: record.contact_name || '',
          contactEmail: record.email || 'No email captured',
          replyDate: record.last_contacted_at?.slice(0, 10) || 'Date not logged',
          outcome: record.response || record.stage || 'Response logged',
          replyBody: getReadableReplyBody(record, record.response || record.stage),
          nextStep: record.followUp || record.next_step || 'Review and assign follow-up.',
        }
      }),
    ...campaignActivityRows,
  ].sort((left, right) => right.replyDate.localeCompare(left.replyDate))
  const selectedReply = selectedReplyId ? campaignReplyRows.find((reply) => reply.id === selectedReplyId) || null : null
  const selectedCrmReplyRecord =
    selectedCrmRecordId && selectedCrmRecord?.hasResponse ? selectedCrmRecord : null
  const selectedCrmReplyText = selectedCrmReplyRecord
    ? getReadableReplyBody(selectedCrmReplyRecord, selectedCrmReplyRecord.response || selectedCrmReplyRecord.stage)
    : ''
  const commandPipelineCrmRecords = parsedSelectedProjectCrmRecords.filter((record) => !record.hasResponse)
  const selectedProjectProposals = useMemo(
    () =>
      proposalTargetProject
        ? projectProposals.filter((proposal) => proposal.project_id === proposalTargetProject.id)
        : [],
    [projectProposals, proposalTargetProject],
  )
  const proposalSearchText = proposalSearch.trim().toLowerCase()
  const filteredProjectProposals = projectProposals.filter((proposal) => {
    const matchesStatus = proposalStatusFilter === 'all' || proposal.status === proposalStatusFilter
    const matchesSearch = proposalSearchText
      ? [
          proposal.company_name,
          proposal.directed_to,
          proposal.contact_email,
          proposal.price,
          proposal.status,
          proposal.next_step,
          proposal.scope_summary,
          getProposalProjectName(proposal, projectStatuses),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(proposalSearchText)
      : true

    return matchesStatus && matchesSearch
  })
  const proposalPipelineMetrics = {
    total: projectProposals.length,
    active: projectProposals.filter((proposal) => !['accepted', 'declined'].includes(proposal.status)).length,
    opened: projectProposals.filter((proposal) => ['opened', 'read', 'commented', 'signed', 'accepted'].includes(proposal.status)).length,
    signed: projectProposals.filter((proposal) => ['signed', 'accepted'].includes(proposal.status)).length,
    attention: projectProposals.filter((proposal) => ['commented', 'declined'].includes(proposal.status)).length,
  }
  const selectedProposal =
    projectProposals.find((proposal) => proposal.id === selectedProposalId) ||
    selectedProjectProposals[0] ||
    filteredProjectProposals[0] ||
    null
  const lastGeneratedProposal =
    projectProposals.find((proposal) => proposal.id === lastGeneratedProposalId) || selectedProposal
  const selectedProposalShareUrl = selectedProposal
    ? `${window.location.origin}/proposals?proposal=${selectedProposal.id}`
    : ''
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
    if (isCampaignsRoute) {
      setWorkspaceTab('campaigns')
    }
    if (isProposalsRoute) {
      setWorkspaceTab('proposals')
    }
  }, [isCrmRoute, isCampaignsRoute, isProposalsRoute])

  useEffect(() => {
    if (
      !isInternal ||
      (!isCommandRoute && !isCrmRoute && !isCampaignsRoute && !isProposalsRoute) ||
      selectedActionProjectId ||
      operatingProjects.length === 0
    ) {
      return
    }

    setSelectedActionProjectId(operatingProjects[0].id)
  }, [
    isInternal,
    isCommandRoute,
    isCrmRoute,
    isCampaignsRoute,
    isProposalsRoute,
    selectedActionProjectId,
    operatingProjects,
  ])

  useEffect(() => {
    if (
      !isInternal ||
      (!isCommandRoute && !isCrmRoute && !isCampaignsRoute && !isProposalsRoute) ||
      !selectedActionProjectId
    ) {
      return
    }

    if (operatingProjects.some((project) => project.id === selectedActionProjectId)) {
      return
    }

    setSelectedActionProjectId(projectStatuses[0]?.id || operatingProjects[0]?.id || null)
  }, [
    isInternal,
    isCommandRoute,
    isCrmRoute,
    isCampaignsRoute,
    isProposalsRoute,
    selectedActionProjectId,
    operatingProjects,
    projectStatuses,
  ])

  useEffect(() => {
    if (!selectedActionProjectId) {
      return
    }

    window.setTimeout(() => {
      decisionDrawerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }, [selectedActionProjectId])

  useEffect(() => {
    setSelectedCrmRecordId(null)
    setSelectedCrmRecordIds([])
    setSelectedCampaignId(null)
    setSelectedProposalId(null)
    setCrmSearch('')
    setCampaignSearch('')
    setCampaignStatusFilter('all')
    setCampaignActivityFilter('all')
    setProposalSearch('')
    setProposalStatusFilter('all')
    setCrmStageFilter('all')
    setCrmSegmentFilter('all')
    setCrmCampaignFilter('all')
    setCrmGapFilter('all')
  }, [selectedActionProjectId])

  useEffect(() => {
    if (!isProposalsRoute || selectedProposalId || selectedProjectProposals.length === 0) {
      return
    }

    const proposalId = new URLSearchParams(window.location.search).get('proposal')
    if (proposalId && selectedProjectProposals.some((proposal) => proposal.id === proposalId)) {
      setSelectedProposalId(proposalId)
    }
  }, [isProposalsRoute, selectedProposalId, selectedProjectProposals])

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
    const crmSelect =
      'id,project_id,company_name,contact_name,contact_title,email,phone,location,segment,website,source_url,campaign_name,channel,last_contacted_at,last_contact_subject,reply_body,reply_preview,reply_from,reply_received_at,reply_message_id,fit_reason,stage,owner,next_step,value_estimate'
    const crmFallbackSelect = 'id,project_id,company_name,contact_name,stage,owner,next_step,value_estimate'
    const [tasksResult, crmResult, campaignsResult, campaignActivitiesResult, proposalsResult, ideasResult, agentsResult] = await Promise.all([
      supabase
        .from('project_tasks')
        .select('id,project_id,task_name,status,owner,due_date,note,sort_order')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('project_crm_records')
        .select(crmSelect)
        .order('created_at', { ascending: false }),
      supabase
        .from('project_campaigns')
        .select('id,project_id,campaign_name,campaign_type,channel,status,objective,audience,offer,budget,launch_date,owner,next_step,proof_notes,recommendation')
        .order('created_at', { ascending: false }),
      supabase
        .from('project_campaign_activities')
        .select('id,project_id,campaign_id,activity_type,activity_date,owner,outcome,next_step')
        .order('activity_date', { ascending: false }),
      supabase
        .from('project_proposals')
        .select('id,project_id,proposal_date,proposal_time,company_name,company_address,directed_to,contact_title,contact_email,price,scope_summary,terms,valid_until,status,next_step')
        .order('proposal_date', { ascending: false }),
      supabase
        .from('project_ideas')
        .select('id,project_id,title,score,next_move,status')
        .order('created_at', { ascending: false }),
      supabase
        .from('project_agent_recommendations')
        .select('id,project_id,agent_role,assignment,output_target,status')
        .order('created_at', { ascending: false }),
    ])

    const crmData = crmResult.error
      ? await supabase
          .from('project_crm_records')
          .select(crmFallbackSelect)
          .order('created_at', { ascending: false })
      : crmResult

    const campaignsData = campaignsResult.error
      ? await supabase
          .from('project_campaigns')
          .select('id,project_id,campaign_name,campaign_type,channel,status,recommendation')
          .order('created_at', { ascending: false })
      : campaignsResult

    const campaignActivitiesData = campaignActivitiesResult.error ? { data: [] } : campaignActivitiesResult
    const proposalsData = proposalsResult.error ? { data: [] } : proposalsResult

    if (tasksResult.error || crmData.error || campaignsData.error || ideasResult.error || agentsResult.error) {
      setCommandDataStatus('Workspace records could not load. Apply the latest Supabase schema, including project_tasks.')
      return
    }

    setProjectTasks(tasksResult.data ?? [])
    setProjectCrmRecords(crmData.data ?? [])
    setProjectCampaigns(campaignsData.data ?? [])
    setProjectCampaignActivities(campaignActivitiesData.data ?? [])
    setProjectProposals(proposalsData.data ?? [])
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

  const deleteProjectWorkspace = async (project: ProjectSessionStatus) => {
    if (!supabase || !persistedProjectIds.has(project.id)) {
      setProjectStatusMessage('Starter workspace cannot be deleted from Supabase because it is only a local placeholder.')
      return
    }

    const confirmed = window.confirm(
      `Delete workspace "${project.project_name}" and its CRM/proposal records? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }

    setProjectStatusMessage(`Deleting ${project.project_name}...`)
    let deleteError = ''

    if (session?.access_token) {
      try {
        const response = await fetch('/api/delete-project', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId: project.id }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          deleteError = String(payload?.error || 'Workspace delete API failed.')
        } else if (!Array.isArray(payload?.deletedIds) || !payload.deletedIds.includes(project.id)) {
          deleteError = 'Workspace delete API did not confirm this row was deleted.'
        }
      } catch (error) {
        deleteError = error instanceof Error ? error.message : 'Workspace delete API failed.'
      }
    } else {
      deleteError = 'Portal session is missing. Sign in again before deleting a workspace.'
    }

    if (deleteError) {
      const { error } = await supabase.from('project_session_status').delete().eq('id', project.id)
      if (error) {
        setProjectStatusMessage(`Workspace delete failed: ${deleteError} Fallback delete also failed: ${error.message}`)
        return
      }
    }

    setProjectStatusMessage(`${project.project_name} deleted.`)
    setProjectStatuses((currentProjects) => currentProjects.filter((currentProject) => currentProject.id !== project.id))
    setProjectTasks((currentTasks) => currentTasks.filter((task) => task.project_id !== project.id))
    setProjectCrmRecords((currentRecords) => currentRecords.filter((record) => record.project_id !== project.id))
    setProjectCampaigns((currentCampaigns) => currentCampaigns.filter((campaign) => campaign.project_id !== project.id))
    setProjectCampaignActivities((currentActivities) => currentActivities.filter((activity) => activity.project_id !== project.id))
    setProjectProposals((currentProposals) => currentProposals.filter((proposal) => proposal.project_id !== project.id))
    setProjectIdeas((currentIdeas) => currentIdeas.filter((idea) => idea.project_id !== project.id))
    setProjectAgentRecommendations((currentAgents) => currentAgents.filter((agent) => agent.project_id !== project.id))
    setSelectedActionProjectId((currentProjectId) => (currentProjectId === project.id ? null : currentProjectId))
    await loadProjectStatuses()
    await loadCommandRecords()
  }

  const deleteProjectWorkspacesByName = async (project: ProjectSessionStatus) => {
    if (!supabase || !persistedProjectIds.has(project.id)) {
      setProjectStatusMessage('Starter workspace cannot be deleted from Supabase because it is only a local placeholder.')
      return
    }

    const matchingProjects = projectStatuses.filter((currentProject) => currentProject.project_name === project.project_name)
    const confirmed = window.confirm(
      `Delete all ${matchingProjects.length} workspace entries named "${project.project_name}" and their CRM/proposal records? This cannot be undone.`,
    )
    if (!confirmed) {
      return
    }

    setProjectStatusMessage(`Deleting all ${project.project_name} workspaces...`)
    let deletedProjectIds = matchingProjects.map((currentProject) => currentProject.id)
    let deletedCount = matchingProjects.length
    let deleteError = ''

    if (session?.access_token) {
      try {
        const response = await fetch('/api/delete-project', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectName: project.project_name, deleteByName: true }),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          deleteError = String(payload?.error || 'Workspace delete API failed.')
        } else {
          deletedProjectIds = Array.isArray(payload?.deletedIds) ? payload.deletedIds : []
          deletedCount = deletedProjectIds.length
          if (deletedCount === 0) {
            deleteError = 'Workspace delete API returned zero deleted rows.'
          }
        }
      } catch (error) {
        deleteError = error instanceof Error ? error.message : 'Workspace delete API failed.'
      }
    } else {
      deleteError = 'Portal session is missing. Sign in again before deleting workspaces.'
    }

    if (deleteError) {
      const { data, error } = await supabase
        .from('project_session_status')
        .delete()
        .eq('project_name', project.project_name)
        .select('id')

      if (error) {
        setProjectStatusMessage(`Workspace delete failed: ${deleteError} Fallback delete also failed: ${error.message}`)
        return
      }

      deletedProjectIds = (data || []).map((deletedProject) => deletedProject.id)
      deletedCount = deletedProjectIds.length
      if (deletedCount === 0) {
        setProjectStatusMessage(`Workspace delete failed: ${deleteError} Fallback delete returned zero deleted rows.`)
        return
      }
    }

    const deletedProjectIdSet = new Set(deletedProjectIds)
    setProjectStatusMessage(`${deletedCount} ${project.project_name} workspace entr${deletedCount === 1 ? 'y' : 'ies'} deleted.`)
    setProjectStatuses((currentProjects) => currentProjects.filter((currentProject) => !deletedProjectIdSet.has(currentProject.id)))
    setProjectTasks((currentTasks) => currentTasks.filter((task) => !deletedProjectIdSet.has(task.project_id)))
    setProjectCrmRecords((currentRecords) => currentRecords.filter((record) => !deletedProjectIdSet.has(record.project_id)))
    setProjectCampaigns((currentCampaigns) => currentCampaigns.filter((campaign) => !deletedProjectIdSet.has(campaign.project_id)))
    setProjectCampaignActivities((currentActivities) => currentActivities.filter((activity) => !deletedProjectIdSet.has(activity.project_id)))
    setProjectProposals((currentProposals) => currentProposals.filter((proposal) => !deletedProjectIdSet.has(proposal.project_id)))
    setProjectIdeas((currentIdeas) => currentIdeas.filter((idea) => !deletedProjectIdSet.has(idea.project_id)))
    setProjectAgentRecommendations((currentAgents) => currentAgents.filter((agent) => !deletedProjectIdSet.has(agent.project_id)))
    setSelectedActionProjectId((currentProjectId) => (currentProjectId && deletedProjectIdSet.has(currentProjectId) ? null : currentProjectId))
    await loadProjectStatuses()
    await loadCommandRecords()
  }

  const createCommandRecord = async (event: FormEvent<HTMLFormElement>, table: CreatableCommandTable) => {
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

    const payloadByTable: Record<CreatableCommandTable, Record<string, string | number | null>> = {
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
        contact_title: String(formData.get('contactTitle')) || null,
        email: String(formData.get('crmEmail')) || null,
        phone: String(formData.get('crmPhone')) || null,
        location: String(formData.get('crmLocation')) || null,
        segment: String(formData.get('crmSegment')) || null,
        website: String(formData.get('crmWebsite')) || null,
        source_url: String(formData.get('crmSource')) || null,
        campaign_name: String(formData.get('crmCampaign')) || null,
        channel: String(formData.get('crmChannel')) || null,
        fit_reason: String(formData.get('crmFitReason')) || null,
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
        objective: String(formData.get('campaignObjective')) || null,
        audience: String(formData.get('campaignAudience')) || null,
        offer: String(formData.get('campaignOffer')) || null,
        budget: String(formData.get('campaignBudget')) || null,
        launch_date: String(formData.get('campaignLaunchDate')) || null,
        owner: String(formData.get('campaignOwner')) || null,
        next_step: String(formData.get('campaignNextStep')) || null,
        proof_notes: String(formData.get('campaignProofNotes')) || null,
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

    let { error } = await supabase.from(table).insert(payloadByTable[table])

    if (error && table === 'project_crm_records') {
      const crmFallbackPayload = {
        project_id: selectedActionProject.id,
        updated_at: new Date().toISOString(),
        company_name: String(formData.get('companyName')),
        contact_name: String(formData.get('contactName')) || null,
        stage: String(formData.get('crmStage')) || 'qualification',
        owner: String(formData.get('crmOwner')) || null,
        next_step: String(formData.get('crmNextStep')) || null,
        value_estimate: String(formData.get('crmValue')) || null,
      }
      ;({ error } = await supabase.from(table).insert(crmFallbackPayload))
    }

    if (error && table === 'project_campaigns') {
      const campaignFallbackPayload = {
        project_id: selectedActionProject.id,
        updated_at: new Date().toISOString(),
        campaign_name: String(formData.get('campaignName')),
        campaign_type: String(formData.get('campaignType')) || 'sales',
        channel: String(formData.get('campaignChannel')) || null,
        status: String(formData.get('campaignStatus')) || 'draft',
        recommendation: String(formData.get('campaignRecommendation')) || null,
      }
      ;({ error } = await supabase.from(table).insert(campaignFallbackPayload))
    }

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

  const updateCrmRecord = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedCrmRecord || !supabase) {
      return
    }

    const formData = new FormData(event.currentTarget)
    setCommandDataStatus(`Updating ${selectedCrmRecord.company_name}...`)
    const { error } = await supabase
      .from('project_crm_records')
      .update({
        company_name: String(formData.get('companyName')),
        contact_name: String(formData.get('contactName')) || null,
        contact_title: String(formData.get('contactTitle')) || null,
        email: String(formData.get('crmEmail')) || null,
        phone: String(formData.get('crmPhone')) || null,
        location: String(formData.get('crmLocation')) || null,
        segment: String(formData.get('crmSegment')) || null,
        website: String(formData.get('crmWebsite')) || null,
        source_url: String(formData.get('crmSource')) || null,
        campaign_name: String(formData.get('crmCampaign')) || null,
        channel: String(formData.get('crmChannel')) || null,
        fit_reason: String(formData.get('crmFitReason')) || null,
        stage: String(formData.get('crmStage')) || 'qualification',
        owner: String(formData.get('crmOwner')) || null,
        next_step: String(formData.get('crmNextStep')) || null,
        value_estimate: String(formData.get('crmValue')) || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedCrmRecord.id)

    if (error) {
      setCommandDataStatus(`CRM record update failed: ${error.message}`)
      return
    }

    setCommandDataStatus('CRM record updated.')
    await loadCommandRecords()
  }

  const logCrmResponse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedCrmRecord || !supabase) {
      return
    }

    const formData = new FormData(event.currentTarget)
    const responseText = String(formData.get('crmResponse')).trim()
    if (!responseText) {
      setCommandDataStatus('Add the reply text before saving a CRM response.')
      return
    }

    const responseDate = new Date().toISOString().slice(0, 10)
    const existingNotes = selectedCrmRecord.next_step || ''
    const nextStep = String(formData.get('crmResponseNextStep')) || selectedCrmRecord.followUp
    const updatedNotes = [
      existingNotes,
      `Response: ${responseText}`,
      nextStep ? `Response next step: ${nextStep}` : '',
      `Response logged: ${responseDate}`,
    ]
      .filter(Boolean)
      .join(' | ')

    setCommandDataStatus(`Logging response from ${selectedCrmRecord.company_name}...`)
    const { error } = await supabase
      .from('project_crm_records')
      .update({
        stage: 'responded',
        next_step: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedCrmRecord.id)

    if (error) {
      setCommandDataStatus(`CRM response could not be saved: ${error.message}`)
      return
    }

    event.currentTarget.reset()
    setCrmGapFilter('has-response')
    setCommandDataStatus('CRM response saved and marked with a green ribbon.')
    await loadCommandRecords()
  }

  const deleteCrmRecord = async (id: string, companyName: string) => {
    if (!supabase) {
      return
    }

    const confirmed = window.confirm(`Delete ${companyName} from the CRM?`)
    if (!confirmed) {
      return
    }

    setCommandDataStatus(`Deleting ${companyName}...`)
    const { error } = await supabase.from('project_crm_records').delete().eq('id', id)

    if (error) {
      setCommandDataStatus(`CRM record delete failed: ${error.message}`)
      return
    }

    setSelectedCrmRecordId(null)
    setSelectedCrmRecordIds((currentIds) => currentIds.filter((currentId) => currentId !== id))
    setCommandDataStatus('CRM record deleted.')
    await loadCommandRecords()
  }

  const toggleCrmRecordSelection = (id: string) => {
    setSelectedCrmRecordIds((currentIds) =>
      currentIds.includes(id) ? currentIds.filter((currentId) => currentId !== id) : [...currentIds, id],
    )
  }

  const toggleVisibleCrmSelection = () => {
    setSelectedCrmRecordIds((currentIds) => {
      const visibleSet = new Set(visibleCrmRecordIds)
      const hasEveryVisibleRecord =
        visibleCrmRecordIds.length > 0 && visibleCrmRecordIds.every((id) => currentIds.includes(id))

      if (hasEveryVisibleRecord) {
        return currentIds.filter((id) => !visibleSet.has(id))
      }

      return Array.from(new Set([...currentIds, ...visibleCrmRecordIds]))
    })
  }

  const updateSelectedCrmRecordsStage = async (stage: string) => {
    if (!supabase || selectedVisibleCrmRecordIds.length === 0) {
      return
    }

    setCommandDataStatus(`Updating ${selectedVisibleCrmRecordIds.length} CRM records...`)
    const { error } = await supabase
      .from('project_crm_records')
      .update({ stage, updated_at: new Date().toISOString() })
      .in('id', selectedVisibleCrmRecordIds)

    if (error) {
      setCommandDataStatus('Bulk CRM update failed.')
      return
    }

    setCommandDataStatus(`${selectedVisibleCrmRecordIds.length} CRM records moved to ${stage}.`)
    setSelectedCrmRecordIds([])
    await loadCommandRecords()
  }

  const createCampaignFromSelectedCrm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedActionProject || !supabase || selectedVisibleCrmRecordIds.length === 0) {
      return
    }

    const formData = new FormData(event.currentTarget)
    const audienceRecords = filteredSelectedProjectCrmRecords.filter((record) =>
      selectedVisibleCrmRecordIds.includes(record.id),
    )
    const segments = Array.from(new Set(audienceRecords.map((record) => record.segment).filter(Boolean))).slice(0, 8)
    const campaigns = Array.from(new Set(audienceRecords.map((record) => record.campaign).filter(Boolean))).slice(0, 8)
    const sampleCompanies = audienceRecords.slice(0, 12).map((record) => record.company_name)
    const missingPhone = audienceRecords.filter((record) => !record.phone).length
    const missingSource = audienceRecords.filter((record) => !record.source && !record.website).length
    const recommendation = [
      `Audience: ${audienceRecords.length} CRM records selected from ${selectedActionProject.project_name}.`,
      segments.length ? `Segments: ${segments.join(', ')}.` : '',
      campaigns.length ? `Source campaigns: ${campaigns.join(', ')}.` : '',
      sampleCompanies.length ? `Sample companies: ${sampleCompanies.join(', ')}.` : '',
      `Data gaps before launch: ${missingPhone} missing phone, ${missingSource} missing source.`,
      String(formData.get('campaignRecommendation') || '').trim(),
    ]
      .filter(Boolean)
      .join('\n')

    setCommandDataStatus(`Creating campaign audience from ${audienceRecords.length} CRM records...`)
    const campaignPayload = {
      project_id: selectedActionProject.id,
      campaign_name: String(formData.get('campaignName')),
      campaign_type: String(formData.get('campaignType')) || 'marketing',
      channel: String(formData.get('campaignChannel')) || null,
      status: 'draft',
      objective: String(formData.get('campaignObjective')) || null,
      audience: `${audienceRecords.length} selected CRM records`,
      offer: String(formData.get('campaignOffer')) || null,
      owner: String(formData.get('campaignOwner')) || null,
      next_step: String(formData.get('campaignNextStep')) || null,
      proof_notes: String(formData.get('campaignProofNotes')) || null,
      recommendation,
      updated_at: new Date().toISOString(),
    }

    let { error } = await supabase.from('project_campaigns').insert(campaignPayload)

    if (error) {
      const campaignFallbackPayload = {
        project_id: selectedActionProject.id,
        campaign_name: String(formData.get('campaignName')),
        campaign_type: String(formData.get('campaignType')) || 'marketing',
        channel: String(formData.get('campaignChannel')) || null,
        status: 'draft',
        recommendation,
        updated_at: new Date().toISOString(),
      }
      ;({ error } = await supabase.from('project_campaigns').insert(campaignFallbackPayload))
    }

    if (error) {
      setCommandDataStatus('Campaign could not be created from the selected CRM records.')
      return
    }

    event.currentTarget.reset()
    setSelectedCrmRecordIds([])
    setCommandDataStatus(`Campaign audience created from ${audienceRecords.length} CRM records.`)
    await loadCommandRecords()
  }

  const createCampaignActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedActionProject || !selectedCampaign || !supabase) {
      return
    }

    const formData = new FormData(event.currentTarget)
    setCommandDataStatus('Logging campaign activity...')
    const { error } = await supabase.from('project_campaign_activities').insert({
      project_id: selectedActionProject.id,
      campaign_id: selectedCampaign.id,
      activity_type: String(formData.get('activityType')) || 'touch',
      activity_date: String(formData.get('activityDate')) || new Date().toISOString().slice(0, 10),
      owner: String(formData.get('activityOwner')) || null,
      outcome: String(formData.get('activityOutcome')) || null,
      next_step: String(formData.get('activityNextStep')) || null,
    })

    if (error) {
      setCommandDataStatus('Campaign activity could not be saved. Apply the latest campaign activity schema.')
      return
    }

    event.currentTarget.reset()
    setCommandDataStatus('Campaign activity logged.')
    await loadCommandRecords()
  }

  const updateSelectedCampaignExecution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedCampaign || !supabase) {
      return
    }

    const formData = new FormData(event.currentTarget)
    setCommandDataStatus('Updating campaign execution details...')
    const { error } = await supabase
      .from('project_campaigns')
      .update({
        status: String(formData.get('campaignStatus')) || selectedCampaign.status,
        owner: String(formData.get('campaignOwner')) || null,
        launch_date: String(formData.get('campaignLaunchDate')) || null,
        next_step: String(formData.get('campaignNextStep')) || null,
        proof_notes: String(formData.get('campaignProofNotes')) || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedCampaign.id)

    if (error) {
      setCommandDataStatus('Campaign execution update failed.')
      return
    }

    setCommandDataStatus('Campaign execution details updated.')
    await loadCommandRecords()
  }

  const createProposal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) {
      setCommandDataStatus('Proposal generator is offline because Supabase is not configured.')
      return
    }
    if (!proposalTargetProject) {
      setCommandDataStatus('Create a project workspace first, then generate the proposal from this page.')
      return
    }

    const formData = new FormData(event.currentTarget)
    setCommandDataStatus(`Generating proposal for ${proposalTargetProject.project_name}...`)
    const proposalDate = String(formData.get('proposalDate') || new Date().toISOString().slice(0, 10))
    const proposalPayload = {
      project_id: proposalTargetProject.id,
      proposal_date: proposalDate,
      proposal_time: String(formData.get('proposalTime')) || null,
      company_name: String(formData.get('proposalCompany')),
      company_address: String(formData.get('proposalAddress')) || null,
      directed_to: String(formData.get('proposalDirectedTo')),
      contact_title: String(formData.get('proposalContactTitle')) || null,
      contact_email: String(formData.get('proposalContactEmail')) || null,
      price: String(formData.get('proposalPrice')) || null,
      scope_summary: String(formData.get('proposalScope')) || null,
      terms: String(formData.get('proposalTerms')) || null,
      valid_until: String(formData.get('proposalValidUntil')) || null,
      status: String(formData.get('proposalStatus')) || 'draft',
      next_step: String(formData.get('proposalNextStep')) || null,
      updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase
      .from('project_proposals')
      .insert(proposalPayload)
      .select('id,project_id,proposal_date,proposal_time,company_name,company_address,directed_to,contact_title,contact_email,price,scope_summary,terms,valid_until,status,next_step')
      .single()

    if (error) {
      setCommandDataStatus(`Proposal could not be generated: ${error.message}`)
      return
    }

    event.currentTarget.reset()
    setSelectedActionProjectId(proposalTargetProject.id)
    setSelectedProposalId(data.id)
    setLastGeneratedProposalId(data.id)
    setProjectProposals((currentProposals) => [data, ...currentProposals.filter((proposal) => proposal.id !== data.id)])
    setCommandDataStatus('Proposal generated. Branded preview, download, and copy link are ready.')
    await loadCommandRecords()
  }

  const changeProposalProject = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedActionProjectId(event.currentTarget.value)
    setSelectedProposalId(null)
  }

  const printSelectedProposal = () => {
    if (!selectedProposal) {
      setCommandDataStatus('Create or select a proposal before downloading a PDF.')
      return
    }

    const proposalDocument = document.querySelector('.proposal-document')
    if (!proposalDocument) {
      setCommandDataStatus('Proposal preview is not ready yet.')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      setCommandDataStatus('Popup blocked. Allow popups for this site, then download the proposal again.')
      return
    }

    printWindow.opener = null
    try {
      printWindow.document.open()
      printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>AM Premier Proposal - ${selectedProposal.company_name}</title>
          <style>
            @page { size: letter; margin: 0.45in; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              color: #10232b;
              background: #ffffff;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .proposal-document {
              display: grid;
              gap: 16px;
              width: 100%;
              padding: 0;
              border: 0;
              border-radius: 0;
              box-shadow: none;
            }
            .proposal-document-head,
            .proposal-doc-meta,
            .proposal-doc-footer {
              display: grid;
              gap: 12px;
            }
            .proposal-document-head {
              grid-template-columns: 1fr auto;
              align-items: start;
              padding-bottom: 14px;
              border-bottom: 4px solid #133c4f;
            }
            .proposal-doc-brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .proposal-brand-logo {
              width: 150px;
              max-height: 48px;
              object-fit: contain;
            }
            .proposal-status-box {
              display: grid;
              gap: 4px;
              min-width: 128px;
              padding: 10px 12px;
              border-radius: 8px;
              color: #ffffff;
              background: #133c4f;
              text-align: right;
            }
            .proposal-cover-media {
              display: grid;
              grid-template-columns: 0.85fr 1.15fr;
              overflow: hidden;
              min-height: 190px;
              border: 1px solid rgba(19, 60, 79, 0.14);
              border-radius: 8px;
              background: #10232b;
              page-break-inside: avoid;
            }
            .proposal-cover-media img {
              width: 100%;
              height: 100%;
              min-height: 190px;
              object-fit: cover;
              background: #ffffff;
            }
            .proposal-cover-media div {
              display: grid;
              align-content: center;
              gap: 8px;
              padding: 22px;
            }
            .proposal-cover-media span,
            .proposal-section-label {
              color: #b9d8d6;
              font-size: 11px;
              font-weight: 850;
              text-transform: uppercase;
            }
            .proposal-cover-media strong {
              color: #ffffff;
              font-size: 25px;
              line-height: 1.08;
            }
            .proposal-cover-media small {
              color: #d6e4e0;
              line-height: 1.45;
            }
            .proposal-doc-title h2 {
              margin: 2px 0 4px;
              font-size: 34px;
              line-height: 1.04;
            }
            .proposal-doc-title p,
            .proposal-document section p {
              margin: 0;
              color: #53666f;
              line-height: 1.45;
            }
            .proposal-doc-meta {
              grid-template-columns: repeat(3, 1fr);
            }
            .proposal-doc-meta div,
            .proposal-doc-footer div {
              padding: 10px;
              border: 1px solid rgba(19, 60, 79, 0.12);
              border-radius: 8px;
              background: #f7faf8;
            }
            .proposal-doc-meta span,
            .proposal-doc-meta small,
            .proposal-doc-footer span,
            .proposal-doc-footer small {
              display: block;
              color: #65737a;
              font-size: 11px;
            }
            .proposal-doc-meta strong,
            .proposal-doc-footer strong {
              display: block;
              margin-top: 4px;
              color: #10232b;
              overflow-wrap: anywhere;
            }
            section { page-break-inside: avoid; }
            .proposal-doc-footer {
              grid-template-columns: 1fr 1.4fr;
              margin-top: 4px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>${proposalDocument.outerHTML}</body>
      </html>
    `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    } catch (error) {
      printWindow.close()
      setCommandDataStatus(
        `PDF window failed to render: ${error instanceof Error ? error.message : 'browser blocked the print document.'}`,
      )
    }
  }

  const copySelectedProposalLink = async () => {
    if (!selectedProposal || !selectedProposalShareUrl) {
      setCommandDataStatus('Create or select a proposal before copying a proposal link.')
      return
    }

    try {
      await navigator.clipboard.writeText(selectedProposalShareUrl)
      setCommandDataStatus('Proposal review link copied. Use Download PDF for the client-ready file.')
    } catch {
      setCommandDataStatus(selectedProposalShareUrl)
    }
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

  if (isCrmRoute) {
    return (
      <main className="portal-shell command-page-shell crm-page-shell">
        <nav className="topbar" aria-label="CRM navigation">
          <button
            type="button"
            className="brand brand-button"
            aria-label="Return to AM Premier Connect home"
            onClick={() => navigateTo('/')}
          >
            <span className="brand-mark">AP</span>
            <span>
              <strong>AM Premier Connect</strong>
              <small>CRM pipeline</small>
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
	            <button type="button" className="nav-link-button" onClick={() => navigateTo('/campaigns')}>
	              Campaigns
	            </button>
	            <button type="button" className="nav-link-button" onClick={() => navigateTo('/proposals')}>
	              Proposals
	            </button>
            {session && (
              <button type="button" className="icon-button" aria-label="Sign out" onClick={handleSignOut}>
                <LogOut size={18} />
              </button>
            )}
          </div>
        </nav>

        {isInternal ? (
          <section className="command-section command-page crm-page">
            <div className="section-heading command-heading">
              <div>
                <p className="eyebrow">CRM pipeline</p>
                <h1>Companies, contacts, stages, and follow-ups.</h1>
                <p className="hero-text">
                  A dedicated sales workspace for AM Premier opportunities, tied back to the project each record belongs to.
                </p>
              </div>
              <button type="button" className="refresh-button" onClick={loadCommandRecords}>
                Refresh CRM <Radio size={17} />
              </button>
            </div>

            <div className="crm-metrics" aria-label="CRM summary">
              <div>
                <span>CRM Records</span>
                <strong>{projectCrmRecords.length}</strong>
              </div>
              <div>
                <span>Projects</span>
                <strong>{operatingProjects.length}</strong>
              </div>
              <div>
                <span>Selected</span>
                <strong>{selectedActionProject?.project_name || 'None'}</strong>
              </div>
              <div>
                <span>Contacts</span>
                <strong>{selectedProjectContactCount}</strong>
              </div>
              <div>
                <span>Responses</span>
                <strong>{selectedProjectResponseCount}</strong>
              </div>
              <div>
                <span>Stages</span>
                <strong>{selectedProjectStageCount}</strong>
              </div>
            </div>

            <section className="crm-workspace">
              <aside className="crm-project-panel" aria-label="CRM project selector">
                <div className="panel-heading">
                  <BriefcaseBusiness size={20} />
                  <div>
                    <h2>Projects</h2>
                    <p>Select the project this CRM pipeline belongs to.</p>
                  </div>
                </div>
                <div className="crm-project-list">
                  {operatingProjects.map((project) => (
                    <div className="crm-project-list-item" key={project.id}>
                      <button
                        type="button"
                        className={selectedActionProjectId === project.id ? 'active' : ''}
                        onClick={() => setSelectedActionProjectId(project.id)}
                      >
                        <strong>{project.project_name}</strong>
                        <span>{project.client_name || 'Internal project'}</span>
                      </button>
                      {persistedProjectIds.has(project.id) && (
                        <div className="project-delete-actions">
                          <button
                            type="button"
                            className="project-delete-button"
                            onClick={() => deleteProjectWorkspace(project)}
                            aria-label={`Delete ${project.project_name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                          {projectStatuses.filter((currentProject) => currentProject.project_name === project.project_name).length > 1 && (
                            <button
                              type="button"
                              className="project-delete-duplicates-button"
                              onClick={() => deleteProjectWorkspacesByName(project)}
                            >
                              Delete duplicates
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </aside>

              <section className="crm-pipeline-panel" aria-label="CRM records">
                <div className="workspace-section-head">
                  <div>
                    <span className="decision-label">Pipeline</span>
                    <h3>{selectedActionProject?.project_name || 'Select a project'}</h3>
                    <p>Manage company targets, contact owners, stage, value, and next step.</p>
                  </div>
                  {selectedActionProject && (
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
                  )}
                </div>

                {commandDataStatus && (
                  <div className="success-note" role="status">
                    <ClipboardCheck size={18} />
                    <span>{commandDataStatus}</span>
                  </div>
                )}
                {projectStatusMessage && (
                  <div className="success-note" role="status">
                    <ShieldCheck size={18} />
                    <span>{projectStatusMessage}</span>
                  </div>
                )}

                <section className="crm-replies-panel" aria-label="Email replies">
                  <div>
                    <span className="decision-label">Email Replies</span>
                    <h3>{responseCrmRecords.length} synced CRM replies</h3>
                    <p>This counts replies that have been logged or imported into CRM records, not the live mailbox.</p>
                  </div>
                  {responseCrmRecords.length > 0 ? (
                    <div className="crm-replies-list">
                      {responseCrmRecords.slice(0, 6).map((record) => (
                        <button
                          type="button"
                          className={selectedReply?.id === `crm-${record.id}` ? 'selected' : ''}
                          key={record.id}
                          onClick={() => {
                            setSelectedActionProjectId(record.project_id)
                            setSelectedCrmRecordId(record.id)
                            setSelectedReplyId(`crm-${record.id}`)
                            setCrmGapFilter('has-response')
                          }}
                        >
                          <strong>{record.company_name}</strong>
                          <span>{cleanDisplayText(getReadableReplyBody(record, record.response || record.followUp), 180)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-inline-note">
                      Real email replies may exist in the mailbox, but none are synced into the CRM yet. Paste/import the reply into a CRM record for now; mailbox auto-sync is the next backend piece.
                    </div>
                  )}
                  {selectedReplyId && selectedReply && selectedReply.source === 'CRM reply' && (
                    <aside className="reply-detail-panel compact" aria-label="Selected email reply">
                      <div className="reply-detail-head">
                        <div>
                          <span className="decision-label">Selected Reply</span>
                          <h3>{selectedReply.companyName || selectedReply.contactName || selectedReply.contactEmail}</h3>
                          <p>{selectedReply.contactEmail}</p>
                        </div>
                        <button type="button" className="secondary-inline-action" onClick={() => setSelectedReplyId(null)}>
                          Clear
                        </button>
                      </div>
                      <dl className="reply-detail-meta">
                        <div>
                          <dt>Campaign</dt>
                          <dd>{selectedReply.campaignName}</dd>
                        </div>
                        <div>
                          <dt>Date</dt>
                          <dd>{selectedReply.replyDate}</dd>
                        </div>
                      </dl>
                      <div className="reply-body-card">
                        <span className="decision-label">Reply Text</span>
                        <p>{selectedReply.replyBody}</p>
                      </div>
                      <div className="reply-body-card muted">
                        <span className="decision-label">Next Step</span>
                        <p>{selectedReply.nextStep}</p>
                      </div>
                    </aside>
                  )}
                </section>

                <div className="crm-toolbar" aria-label="CRM record filters">
                  <label>
                    <Filter size={16} />
                    <input
                      value={crmSearch}
                      onChange={(event) => setCrmSearch(event.target.value)}
                      placeholder="Search company, email, city, segment, campaign..."
                      type="search"
                    />
                  </label>
                  <span>
                    Showing {filteredSelectedProjectCrmRecords.length} of {selectedProjectCrmRecords.length}
                  </span>
                </div>
                <div className="crm-filter-grid" aria-label="CRM structured filters">
                  <label>
                    Stage
                    <select value={crmStageFilter} onChange={(event) => setCrmStageFilter(event.target.value)}>
                      {crmFilterOptions.stages.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage === 'all' ? 'All stages' : stage}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Segment
                    <select value={crmSegmentFilter} onChange={(event) => setCrmSegmentFilter(event.target.value)}>
                      {crmFilterOptions.segments.map((segment) => (
                        <option key={segment} value={segment}>
                          {segment === 'all' ? 'All segments' : segment}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Campaign
                    <select value={crmCampaignFilter} onChange={(event) => setCrmCampaignFilter(event.target.value)}>
                      {crmFilterOptions.campaigns.map((campaign) => (
                        <option key={campaign} value={campaign}>
                          {campaign === 'all' ? 'All campaigns' : campaign}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Data gaps
                    <select value={crmGapFilter} onChange={(event) => setCrmGapFilter(event.target.value as CrmGapFilter)}>
                      <option value="all">All records</option>
                      <option value="has-response">Responses only</option>
                      <option value="missing-phone">Missing phone</option>
                      <option value="missing-source">Missing source</option>
                      <option value="missing-fit">Missing fit reason</option>
                    </select>
                  </label>
                </div>
                <div className="crm-bulk-bar" aria-label="CRM bulk actions">
                  <span>{selectedVisibleCrmRecordIds.length} selected</span>
                  <button type="button" onClick={toggleVisibleCrmSelection} disabled={visibleCrmRecordIds.length === 0}>
                    {selectedVisibleCrmRecordIds.length === visibleCrmRecordIds.length && visibleCrmRecordIds.length > 0
                      ? 'Clear visible'
                      : 'Select visible'}
                  </button>
                  {crmBulkStages.map((stage) => (
                    <button
                      type="button"
                      key={stage}
                      onClick={() => updateSelectedCrmRecordsStage(stage)}
                      disabled={selectedVisibleCrmRecordIds.length === 0}
                    >
                      Move to {stage}
                    </button>
                  ))}
                </div>
                <form className="crm-campaign-builder" onSubmit={createCampaignFromSelectedCrm}>
                  <div>
                    <span className="decision-label">Campaign Bridge</span>
                    <strong>Create a campaign audience from selected CRM records</strong>
                  </div>
                  <label>
                    Campaign
                    <input name="campaignName" placeholder="Facebook proof-of-concept audience" required type="text" />
                  </label>
                  <label>
                    Type
                    <select defaultValue="marketing" name="campaignType">
                      <option value="marketing">Marketing</option>
                      <option value="sales">Sales</option>
                      <option value="proof-of-concept">Proof of concept</option>
                      <option value="partner">Partner</option>
                    </select>
                  </label>
                  <label>
                    Channel
                    <input name="campaignChannel" placeholder="Facebook, LinkedIn, email, calls" type="text" />
                  </label>
                  <label>
                    Objective
                    <input name="campaignObjective" placeholder="Book meetings, validate offer, collect proof" type="text" />
                  </label>
                  <label>
                    Offer
                    <input name="campaignOffer" placeholder="Site assessment, proof packet, consultation" type="text" />
                  </label>
                  <label>
                    Owner
                    <input name="campaignOwner" placeholder="Elara / Omar / sales agent" type="text" />
                  </label>
                  <label>
                    Next step
                    <input name="campaignNextStep" placeholder="Build ad, draft sequence, call top 20" type="text" />
                  </label>
                  <label className="wide">
                    Launch note
                    <textarea name="campaignRecommendation" placeholder="Offer, angle, asset, proof point, or next execution step." />
                  </label>
                  <label className="wide">
                    Proof notes
                    <textarea name="campaignProofNotes" placeholder="Proof needed, evidence captured, results to track." />
                  </label>
                  <button type="submit" disabled={selectedVisibleCrmRecordIds.length === 0}>
                    Create Campaign
                  </button>
                </form>

                <section className="campaign-reply-tracker crm-reply-tracker" aria-label="CRM campaign replies">
                  <div className="campaign-reply-head">
                    <div>
                      <span className="decision-label">Reply Tracker</span>
                      <h3>{campaignReplyRows.length} replies for this CRM workspace</h3>
                      <p>
                        Replies imported from email and campaign activity now live inside CRM too. Click any row to read
                        the full reply text and next follow-up.
                      </p>
                    </div>
                    <div className="campaign-reply-stats" aria-label="CRM reply counts">
                      <span>
                        <strong>{campaignReplyRows.filter((reply) => reply.contactEmail !== 'No email captured in activity').length}</strong>
                        with email
                      </span>
                      <span>
                        <strong>{campaignReplyRows.filter((reply) => reply.source === 'Campaign activity').length}</strong>
                        logged activities
                      </span>
                      <span>
                        <strong>{selectedProjectResponseCount}</strong>
                        CRM responses
                      </span>
                    </div>
                  </div>
                  {campaignReplyRows.length > 0 ? (
                    <div className="campaign-reply-table-wrap">
                      <table className="campaign-reply-table">
                        <thead>
                          <tr>
                            <th>Email / Contact</th>
                            <th>Campaign</th>
                            <th>Reply</th>
                            <th>Next Step</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campaignReplyRows.map((reply) => (
                            <tr
                              className={selectedReply?.id === reply.id ? 'selected' : ''}
                              key={reply.id}
                              onClick={() => {
                                if (reply.campaignId) {
                                  setSelectedCampaignId(reply.campaignId)
                                }
                                setSelectedReplyId(reply.id)
                              }}
                            >
                              <td>
                                <strong>{reply.contactEmail}</strong>
                                <small>{reply.companyName || reply.contactName || 'Contact not tagged'}</small>
                              </td>
                              <td>
                                <strong>{reply.campaignName}</strong>
                                <small>{reply.source}</small>
                              </td>
                              <td>{reply.outcome}</td>
                              <td>{reply.nextStep}</td>
                              <td>{reply.replyDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-inline-note">
                      No replies are synced into this CRM workspace yet. If replies came into the mailbox, import or log
                      them into CRM/campaign activity so they appear here.
                    </div>
                  )}
                  {selectedReply && (
                    <div
                      className="crm-reply-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-label="Selected CRM reply"
                      onClick={() => setSelectedReplyId(null)}
                    >
                      <aside className="reply-detail-panel crm-reply-dialog" onClick={(event) => event.stopPropagation()}>
                        <div className="reply-detail-head">
                          <div>
                            <span className="decision-label">{selectedReply.source}</span>
                            <h3>{selectedReply.contactEmail}</h3>
                            <p>{selectedReply.companyName || selectedReply.contactName || 'Contact not tagged'}</p>
                          </div>
                          <button type="button" className="secondary-inline-action" onClick={() => setSelectedReplyId(null)}>
                            Close
                          </button>
                        </div>
                        <dl className="reply-detail-meta">
                          <div>
                            <dt>Workspace</dt>
                            <dd>{selectedReply.projectName}</dd>
                          </div>
                          <div>
                            <dt>Campaign</dt>
                            <dd>{selectedReply.campaignName}</dd>
                          </div>
                          <div>
                            <dt>Date</dt>
                            <dd>{selectedReply.replyDate}</dd>
                          </div>
                        </dl>
                        <div className="reply-body-card">
                          <span className="decision-label">Reply Text</span>
                          <p>{selectedReply.replyBody}</p>
                        </div>
                        <div className="reply-body-card muted">
                          <span className="decision-label">Next Step</span>
                          <p>{selectedReply.nextStep}</p>
                        </div>
                      </aside>
                    </div>
                  )}
                </section>

                {selectedCrmReplyRecord && (
                  <section className="crm-selected-reply-reader" aria-label="Selected CRM reply body">
                    <div className="reply-detail-head">
                      <div>
                        <span className="decision-label">CRM Reply Open</span>
                        <h3>{selectedCrmReplyRecord.company_name}</h3>
                        <p>{selectedCrmReplyRecord.email || selectedCrmReplyRecord.contact_name || 'Contact not captured'}</p>
                      </div>
                      <button
                        type="button"
                        className="secondary-inline-action"
                        onClick={() => {
                          setSelectedReplyId(null)
                          setSelectedCrmRecordId(null)
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <dl className="reply-detail-meta">
                      <div>
                        <dt>Campaign</dt>
                        <dd>{selectedCrmReplyRecord.campaign || 'Campaign not tagged'}</dd>
                      </div>
                      <div>
                        <dt>Date</dt>
                        <dd>{selectedCrmReplyRecord.reply_received_at?.slice(0, 10) || selectedCrmReplyRecord.last_contacted_at?.slice(0, 10) || 'Date not logged'}</dd>
                      </div>
                      <div>
                        <dt>From</dt>
                        <dd>{selectedCrmReplyRecord.reply_from || selectedCrmReplyRecord.email || 'Sender not captured'}</dd>
                      </div>
                    </dl>
                    <div className="reply-body-card">
                      <span className="decision-label">Reply Body</span>
                      <p>{selectedCrmReplyText}</p>
                    </div>
                  </section>
                )}

                <div className="crm-record-workbench">
                  {selectedProjectCrmRecords.length === 0 ? (
                    <article className="empty-project-state">
                      <BriefcaseBusiness size={22} />
                      <div>
                        <h3>No CRM records for this project yet.</h3>
                        <p>Add the first company, contact, stage, owner, value, and next step below.</p>
                      </div>
                    </article>
                  ) : filteredSelectedProjectCrmRecords.length === 0 ? (
                    <article className="empty-project-state">
                      <Filter size={22} />
                      <div>
                        <h3>No matching CRM records.</h3>
                        <p>Clear the search or try a company, city, email, campaign, or segment.</p>
                      </div>
                    </article>
                  ) : (
                    <>
                      <div className="crm-table-wrap">
                        <table className="crm-table">
                          <thead>
                            <tr>
                              <th>
                                <input
                                  aria-label="Select visible CRM records"
                                  checked={
                                    visibleCrmRecordIds.length > 0 &&
                                    selectedVisibleCrmRecordIds.length === visibleCrmRecordIds.length
                                  }
                                  onChange={toggleVisibleCrmSelection}
                                  type="checkbox"
                                />
                              </th>
                              <th>Company</th>
                              <th>Contact</th>
                              <th>Segment</th>
                              <th>Stage</th>
                              <th>Location</th>
                              <th>Campaign</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredSelectedProjectCrmRecords.map((record) => (
                              <tr
                                className={selectedCrmRecord?.id === record.id ? 'selected' : ''}
                                key={record.id}
                                onClick={() => {
                                  setSelectedCrmRecordId(record.id)
                                  if (record.hasResponse) {
                                    setSelectedReplyId(`crm-${record.id}`)
                                  }
                                }}
                              >
                                <td>
                                  <input
                                    aria-label={`Select ${record.company_name}`}
                                    checked={selectedCrmRecordIds.includes(record.id)}
                                    onChange={() => toggleCrmRecordSelection(record.id)}
                                    onClick={(event) => event.stopPropagation()}
                                    type="checkbox"
                                  />
                                </td>
                                <td>
                                  <strong>{record.company_name}</strong>
                                  {record.hasResponse && <span className="response-ribbon">Responded</span>}
                                  <small>{record.value_estimate || 'Opportunity'}</small>
                                </td>
                                <td>
                                  <span>{record.email || record.contact_name || 'No email captured'}</span>
                                  <small>{record.phone || 'No phone'}</small>
                                </td>
                                <td>{record.segment || 'Uncategorized'}</td>
                                <td>
                                  <span className="crm-stage-pill">{record.stage}</span>
                                </td>
                                <td>{record.location || 'Not listed'}</td>
                                <td>{record.campaign || 'Manual record'}</td>
                                <td>
                                  <div className="inline-row-actions">
                                    <button
                                      aria-label={`Edit ${record.company_name}`}
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setSelectedCrmRecordId(record.id)
                                        if (record.hasResponse) {
                                          setSelectedReplyId(`crm-${record.id}`)
                                        }
                                      }}
                                    >
                                      <Edit3 size={15} />
                                    </button>
                                    <button
                                      aria-label={`Delete ${record.company_name}`}
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        deleteCrmRecord(record.id, record.company_name)
                                      }}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {selectedCrmRecord && (
                        <aside className="crm-detail-panel" aria-label="Selected CRM record details">
                          <span className="decision-label">{selectedCrmRecord.stage}</span>
                          {selectedCrmRecord.hasResponse && <span className="response-ribbon large">Response received</span>}
                          <h3>{selectedCrmRecord.company_name}</h3>
                          <dl>
                            <div>
                              <dt>Response</dt>
                              <dd>
                                {selectedCrmRecord.hasResponse
                                  ? getReadableReplyBody(selectedCrmRecord, selectedCrmRecord.response || selectedCrmRecord.stage)
                                  : 'No response logged yet.'}
                              </dd>
                            </div>
                            <div>
                              <dt>Email</dt>
                              <dd>{selectedCrmRecord.email || 'Not captured'}</dd>
                            </div>
                            <div>
                              <dt>Phone</dt>
                              <dd>{selectedCrmRecord.phone || 'Not captured'}</dd>
                            </div>
                            <div>
                              <dt>Contact</dt>
                              <dd>
                                {selectedCrmRecord.contact_name || 'Routing contact'}
                                {selectedCrmRecord.contact_title ? `, ${selectedCrmRecord.contact_title}` : ''}
                              </dd>
                            </div>
                            <div>
                              <dt>Location</dt>
                              <dd>{selectedCrmRecord.location || 'Not captured'}</dd>
                            </div>
                            <div>
                              <dt>Segment</dt>
                              <dd>{selectedCrmRecord.segment || 'Not categorized'}</dd>
                            </div>
                            <div>
                              <dt>Campaign</dt>
                              <dd>{selectedCrmRecord.campaign || 'Manual CRM record'}</dd>
                            </div>
                            <div>
                              <dt>Channel</dt>
                              <dd>{selectedCrmRecord.channel || 'Direct outreach'}</dd>
                            </div>
                            <div>
                              <dt>Sent</dt>
                              <dd>{selectedCrmRecord.sent || 'Not captured'}</dd>
                            </div>
                            <div>
                              <dt>Source</dt>
                              <dd>{selectedCrmRecord.source || selectedCrmRecord.website || 'Not captured'}</dd>
                            </div>
                            <div>
                              <dt>Why It Fits</dt>
                              <dd>{selectedCrmRecord.whyFit || 'No fit note captured.'}</dd>
                            </div>
                            <div>
                              <dt>Next Step</dt>
                              <dd>{selectedCrmRecord.followUp}</dd>
                            </div>
                          </dl>
                          <div className="record-actions">
                            <button
                              type="button"
                              onClick={() => updateCommandRecordStatus('project_crm_records', selectedCrmRecord.id, 'follow-up')}
                            >
                              Follow-up
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCommandRecordStatus('project_crm_records', selectedCrmRecord.id, 'won')}
                            >
                              Won
                            </button>
                            <button type="button" onClick={() => deleteCrmRecord(selectedCrmRecord.id, selectedCrmRecord.company_name)}>
                              Delete
                            </button>
                          </div>
                          <form className="crm-response-form" onSubmit={logCrmResponse}>
                            <label>
                              Response
                              <textarea name="crmResponse" placeholder="Paste or summarize the reply from this contact." required />
                            </label>
                            <label>
                              Next step
                              <input name="crmResponseNextStep" placeholder="Reply, call, quote, vendor portal, or hold." type="text" />
                            </label>
                            <button type="submit">
                              Save Response <MailCheck size={16} />
                            </button>
                          </form>
                          <form className="crm-edit-form" key={selectedCrmRecord.id} onSubmit={updateCrmRecord}>
                            <label>
                              Company
                              <input defaultValue={selectedCrmRecord.company_name} name="companyName" required type="text" />
                            </label>
                            <label>
                              Contact
                              <input defaultValue={selectedCrmRecord.contact_name || ''} name="contactName" type="text" />
                            </label>
                            <label>
                              Title
                              <input defaultValue={selectedCrmRecord.contact_title || ''} name="contactTitle" type="text" />
                            </label>
                            <label>
                              Email
                              <input defaultValue={selectedCrmRecord.email || ''} name="crmEmail" type="email" />
                            </label>
                            <label>
                              Phone
                              <input defaultValue={selectedCrmRecord.phone || ''} name="crmPhone" type="tel" />
                            </label>
                            <label>
                              Location
                              <input defaultValue={selectedCrmRecord.location || ''} name="crmLocation" type="text" />
                            </label>
                            <label>
                              Segment
                              <input defaultValue={selectedCrmRecord.segment || ''} name="crmSegment" type="text" />
                            </label>
                            <label>
                              Stage
                              <input defaultValue={selectedCrmRecord.stage} name="crmStage" type="text" />
                            </label>
                            <label>
                              Owner
                              <input defaultValue={selectedCrmRecord.owner || ''} name="crmOwner" type="text" />
                            </label>
                            <label>
                              Value
                              <input defaultValue={selectedCrmRecord.value_estimate || ''} name="crmValue" type="text" />
                            </label>
                            <label>
                              Campaign
                              <input defaultValue={selectedCrmRecord.campaign || ''} name="crmCampaign" type="text" />
                            </label>
                            <label>
                              Channel
                              <input defaultValue={selectedCrmRecord.channel || ''} name="crmChannel" type="text" />
                            </label>
                            <label>
                              Website
                              <input defaultValue={selectedCrmRecord.website || ''} name="crmWebsite" type="url" />
                            </label>
                            <label>
                              Source
                              <input defaultValue={selectedCrmRecord.source || ''} name="crmSource" type="url" />
                            </label>
                            <label className="wide">
                              Why it fits
                              <textarea defaultValue={selectedCrmRecord.whyFit || ''} name="crmFitReason" />
                            </label>
                            <label className="wide">
                              Notes / next step
                              <textarea defaultValue={selectedCrmRecord.next_step || ''} name="crmNextStep" />
                            </label>
                            <button type="submit">
                              Save CRM Changes <ClipboardCheck size={16} />
                            </button>
                          </form>
                        </aside>
                      )}
                    </>
                  )}
                </div>

                <form className="ops-form-grid compact crm-entry-form" onSubmit={(event) => createCommandRecord(event, 'project_crm_records')}>
                  <label>
                    Company
                    <input name="companyName" placeholder="Site owner / utility / vendor" required type="text" />
                  </label>
                  <label>
                    Contact
                    <input name="contactName" placeholder="Decision maker" type="text" />
                  </label>
                  <label>
                    Title
                    <input name="contactTitle" placeholder="Owner / GM / facilities" type="text" />
                  </label>
                  <label>
                    Email
                    <input name="crmEmail" placeholder="name@company.com" type="email" />
                  </label>
                  <label>
                    Phone
                    <input name="crmPhone" placeholder="Main or direct line" type="tel" />
                  </label>
                  <label>
                    Location
                    <input name="crmLocation" placeholder="City, state, region" type="text" />
                  </label>
                  <label>
                    Segment
                    <input name="crmSegment" placeholder="Hotel / airport / hospital" type="text" />
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
                  <label>
                    Campaign
                    <input name="crmCampaign" placeholder="Outreach campaign name" type="text" />
                  </label>
                  <label>
                    Channel
                    <input name="crmChannel" placeholder="Email / Facebook / social" type="text" />
                  </label>
                  <label>
                    Website
                    <input name="crmWebsite" placeholder="Company website" type="url" />
                  </label>
                  <label>
                    Source
                    <input name="crmSource" placeholder="Research/source URL" type="url" />
                  </label>
                  <label className="wide">
                    Why it fits
                    <textarea name="crmFitReason" placeholder="Why this company belongs in this pipeline." />
                  </label>
                  <label className="wide">
                    Next step
                    <textarea name="crmNextStep" placeholder="Call, quote, meeting, doc request, or owner decision." />
                  </label>
                  <button type="submit" disabled={!selectedActionProject}>
                    Add CRM Record
                  </button>
                </form>
              </section>
            </section>
          </section>
        ) : (
          <section className="locked-command-state">
            <div className="login-panel">
              <div className="panel-heading">
                <LockKeyhole size={20} />
                <div>
                  <h1>CRM is internal only.</h1>
                  <p>Sign in with an approved internal account to open the CRM pipeline.</p>
                </div>
              </div>
              <button type="button" className="full-button" onClick={() => navigateTo('/')}>
                Return to portal login <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}
      </main>
    )
  }

  if (isCommandRoute || isCampaignsRoute || isProposalsRoute) {
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
            <button type="button" className="nav-link-button" onClick={() => navigateTo('/command')}>
              Command
            </button>
            <button type="button" className="nav-link-button" onClick={() => navigateTo('/crm')}>
              CRM
            </button>
            <button type="button" className="nav-link-button" onClick={() => navigateTo('/campaigns')}>
              Campaigns
            </button>
            <button type="button" className="nav-link-button" onClick={() => navigateTo('/proposals')}>
              Proposals
            </button>
            {session && (
              <button type="button" className="icon-button" aria-label="Sign out" onClick={handleSignOut}>
                <LogOut size={18} />
              </button>
            )}
          </div>
        </nav>

        {isInternal ? (
          <section className={`command-section command-page ${isProposalsRoute ? 'proposals-page' : ''}`}>
            <div className="section-heading command-heading">
              <div>
                <p className="eyebrow">
                  {isProposalsRoute ? 'Proposal database' : isCampaignsRoute ? 'Campaign command center' : 'Internal command portal'}
                </p>
                <h1>
                  {isProposalsRoute
                    ? 'Proposal pipeline, access, and client-ready files.'
                    : isCampaignsRoute
                      ? 'Campaigns, replies, and outreach movement.'
                      : 'Live project status pulled from operating sessions.'}
                </h1>
                <p className="hero-text">
                  {isProposalsRoute
                    ? 'A dedicated proposal workspace for drafts, links, PDF previews, and pipeline movement.'
                    : isCampaignsRoute
                      ? 'Track which emails replied, which campaign they came from, and what follow-up should happen next.'
                      : 'Internal workspace for project health, next actions, blockers, and active session status.'}
                </p>
              </div>
              <button type="button" className="refresh-button" onClick={isProposalsRoute || isCampaignsRoute ? loadCommandRecords : loadProjectStatuses}>
                {isProposalsRoute ? 'Refresh Proposals' : isCampaignsRoute ? 'Refresh Campaigns' : 'Refresh'} <Radio size={17} />
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

            {isProposalsRoute && (
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
            )}

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

            {isCommandRoute && (
              <section className="command-replies-panel" aria-label="Recent campaign replies">
                <div className="panel-heading">
                  <MailCheck size={20} />
                  <div>
                    <h2>Recent Synced Replies</h2>
                    <p>Fast view of replies and response signals already saved into the portal.</p>
                  </div>
                </div>
                {campaignReplyRows.length > 0 ? (
                  <div className="command-reply-list">
                    {campaignReplyRows.slice(0, 5).map((reply) => (
                      <button
                        type="button"
                        className="command-reply-row"
                        key={reply.id}
                        onClick={() => {
                          if (reply.projectId) {
                            setSelectedActionProjectId(reply.projectId)
                          }
                          if (reply.campaignId) {
                            setSelectedCampaignId(reply.campaignId)
                          }
                          setSelectedReplyId(reply.id)
                          navigateTo('/crm')
                        }}
                      >
                        <span>
                          <strong>{reply.contactEmail}</strong>
                          <small>{reply.companyName || reply.contactName || 'Contact not tagged'}</small>
                        </span>
                        <span>
                          <strong>{reply.campaignName}</strong>
                          <small>{reply.projectName}</small>
                        </span>
                        <span>
                          <strong>{reply.outcome}</strong>
                          <small>{reply.replyDate}</small>
                        </span>
                      </button>
                    ))}
                    <button type="button" className="secondary-inline-action" onClick={() => navigateTo('/crm')}>
                      Open CRM Reply Tracker
                    </button>
                  </div>
                ) : (
                  <div className="empty-inline-note">
                    No campaign replies are synced into the portal yet. That does not mean the mailbox has zero replies; it means the replies still need to be imported or logged into CRM/campaign activity.
                  </div>
                )}
              </section>
            )}

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
                          onClick={() => {
                            if (tab.id === 'crm') {
                              navigateTo('/crm')
                              return
                            }

                            if (tab.id === 'campaigns') {
                              navigateTo('/campaigns')
                              return
                            }

                            if (tab.id === 'proposals') {
                              navigateTo('/proposals')
                              return
                            }

                            setWorkspaceTab(tab.id)
                          }}
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
                          {(commandPipelineCrmRecords.length > 0
                            ? commandPipelineCrmRecords.map((record): WorkspaceCrmCard => ({
                                id: record.id,
                                name: record.company_name,
                                stage: record.stage,
                                nextStep: cleanDisplayText(
                                  [
                                    record.contact_name ? `Contact: ${record.contact_name}.` : '',
                                    record.value_estimate ? `Value: ${record.value_estimate}.` : '',
                                    record.followUp || record.next_step || 'No next step captured.',
                                  ]
                                    .filter(Boolean)
                                    .join(' '),
                                ),
                                owner: record.owner || 'Unassigned',
                                persisted: true,
                              }))
                            : selectedWorkspace.crm.companies.map((company): WorkspaceCrmCard => ({
                                ...company,
                                id: company.name,
                                nextStep: cleanDisplayText(company.nextStep),
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
                        <section className="campaign-reply-tracker" aria-label="Campaign email replies">
                          <div className="campaign-reply-head">
                            <div>
	                              <span className="decision-label">Reply Tracker</span>
	                              <h3>{campaignReplyRows.length} synced campaign replies</h3>
	                              <p>
	                                See which email replies have been imported or logged, which workspace and campaign they came from,
	                                what happened, and the next follow-up.
	                              </p>
                            </div>
                            <div className="campaign-reply-stats" aria-label="Reply counts">
                              <span>
                                <strong>{campaignReplyRows.filter((reply) => reply.contactEmail !== 'No email captured in activity').length}</strong>
                                with email
                              </span>
                              <span>
                                <strong>{campaignReplyRows.filter((reply) => reply.source === 'Campaign activity').length}</strong>
	                                logged activities
	                              </span>
	                              <span>
	                                <strong>{visibleReplyProjects.length}</strong>
	                                workspaces
	                              </span>
	                            </div>
	                          </div>
                          {campaignReplyRows.length > 0 ? (
                            <div className="campaign-reply-table-wrap">
                              <table className="campaign-reply-table">
                                <thead>
                                  <tr>
	                                    <th>Email / Contact</th>
	                                    <th>Workspace</th>
	                                    <th>Campaign</th>
	                                    <th>Reply</th>
                                    <th>Next Step</th>
                                    <th>Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {campaignReplyRows.map((reply) => (
                                    <tr
                                      className={selectedReply?.id === reply.id ? 'selected' : ''}
                                      key={reply.id}
                                      onClick={() => {
                                        if (reply.campaignId) {
                                          setSelectedCampaignId(reply.campaignId)
                                        }
                                        setSelectedReplyId(reply.id)
                                      }}
                                    >
                                      <td>
                                        <strong>{reply.contactEmail}</strong>
                                        <small>{reply.companyName || reply.contactName || 'Contact not tagged'}</small>
	                                      </td>
	                                      <td>
	                                        <strong>{reply.projectName}</strong>
	                                        <small>{reply.projectId}</small>
	                                      </td>
	                                      <td>
	                                        <strong>{reply.campaignName}</strong>
                                        <small>{reply.source}</small>
                                      </td>
                                      <td>{reply.outcome}</td>
                                      <td>{reply.nextStep}</td>
                                      <td>{reply.replyDate}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
	                            <div className="empty-inline-note">
	                              No replies are synced into the portal yet. If replies came into the mailbox, import or log them
	                              into CRM/campaign activity so they appear here with the correct campaign.
	                            </div>
                          )}
                          {selectedReply && (
                            <aside className="reply-detail-panel" aria-label="Selected reply detail">
                              <div className="reply-detail-head">
                                <div>
                                  <span className="decision-label">{selectedReply.source}</span>
                                  <h3>{selectedReply.contactEmail}</h3>
                                  <p>{selectedReply.companyName || selectedReply.contactName || 'Contact not tagged'}</p>
                                </div>
                                <button
                                  type="button"
                                  className="secondary-inline-action"
                                  onClick={() => setSelectedReplyId(null)}
                                >
                                  Clear selection
                                </button>
                              </div>
                              <dl className="reply-detail-meta">
                                <div>
                                  <dt>Workspace</dt>
                                  <dd>{selectedReply.projectName}</dd>
                                </div>
                                <div>
                                  <dt>Campaign</dt>
                                  <dd>{selectedReply.campaignName}</dd>
                                </div>
                                <div>
                                  <dt>Date</dt>
                                  <dd>{selectedReply.replyDate}</dd>
                                </div>
                              </dl>
                              <div className="reply-body-card">
                                <span className="decision-label">Reply Text</span>
                                <p>{selectedReply.replyBody}</p>
                              </div>
                              <div className="reply-body-card muted">
                                <span className="decision-label">Next Step</span>
                                <p>{selectedReply.nextStep}</p>
                              </div>
                            </aside>
                          )}
                        </section>
                        {selectedProjectCampaigns.length > 0 ? (
                          <>
                            <div className="crm-toolbar campaign-toolbar" aria-label="Campaign filters">
                              <label>
                                <Filter size={16} />
                                <input
                                  value={campaignSearch}
                                  onChange={(event) => setCampaignSearch(event.target.value)}
                                  placeholder="Search campaign, channel, audience, status..."
                                  type="search"
                                />
                              </label>
                              <label>
                                Status
                                <select value={campaignStatusFilter} onChange={(event) => setCampaignStatusFilter(event.target.value)}>
                                  {campaignFilterOptions.statuses.map((status) => (
                                    <option key={status} value={status}>
                                      {status === 'all' ? 'All statuses' : status}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Activity
                                <select
                                  value={campaignActivityFilter}
                                  onChange={(event) => setCampaignActivityFilter(event.target.value as CampaignActivityFilter)}
                                >
                                  <option value="all">All activity</option>
                                  <option value="has-activity">Has activity</option>
                                  <option value="no-activity">No activity</option>
                                </select>
                              </label>
                              <span>
                                Showing {filteredSelectedProjectCampaigns.length} of {selectedProjectCampaigns.length}
                              </span>
                            </div>
                            <div className="campaign-workbench">
                              {filteredSelectedProjectCampaigns.length === 0 ? (
                                <article className="empty-project-state">
                                  <Filter size={22} />
                                  <div>
                                    <h3>No matching campaigns.</h3>
                                    <p>Clear the search or try an audience, channel, status, or campaign name.</p>
                                  </div>
                                </article>
                              ) : (
                                <>
                                  <div className="campaign-table-wrap">
                                    <table className="campaign-table">
                                      <thead>
                                        <tr>
                                          <th>Campaign</th>
                                          <th>Type</th>
                                          <th>Channel</th>
                                          <th>Activity</th>
                                          <th>Next Step</th>
                                          <th>Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {filteredSelectedProjectCampaigns.map((campaign) => {
                                          const activitySummary = getCampaignActivitySummary(campaign.id)

                                          return (
                                            <tr
                                              className={selectedCampaign?.id === campaign.id ? 'selected' : ''}
                                              key={campaign.id}
                                              onClick={() => setSelectedCampaignId(campaign.id)}
                                            >
                                              <td>
                                                <strong>{campaign.campaign_name}</strong>
                                                <small>{campaign.recommendation?.split(/\n/)[0] || 'No audience brief captured.'}</small>
                                              </td>
                                              <td>{campaign.campaign_type}</td>
                                              <td>{campaign.channel || 'Not assigned'}</td>
                                              <td>
                                                <span className="campaign-activity-count">{activitySummary.count}</span>
                                                <small>{activitySummary.latestLabel}</small>
                                                {activitySummary.latestOutcome && <small>{activitySummary.latestOutcome}</small>}
                                              </td>
                                              <td>{campaign.next_step || campaign.objective || 'Needs execution step'}</td>
                                              <td>
                                                <span className="crm-stage-pill">{campaign.status}</span>
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>

                                  {selectedCampaign && (
                                    <aside className="campaign-detail-panel" aria-label="Selected campaign details">
                                      <span className="decision-label">{selectedCampaign.status}</span>
                                      <h3>{selectedCampaign.campaign_name}</h3>
                                      <dl>
                                        <div>
                                          <dt>Type</dt>
                                          <dd>{selectedCampaign.campaign_type}</dd>
                                        </div>
                                        <div>
                                          <dt>Channel</dt>
                                          <dd>{selectedCampaign.channel || 'Not assigned'}</dd>
                                        </div>
                                        <div>
                                          <dt>Owner</dt>
                                          <dd>{selectedCampaign.owner || 'Unassigned'}</dd>
                                        </div>
                                        <div>
                                          <dt>Launch</dt>
                                          <dd>{selectedCampaign.launch_date || 'Not scheduled'}</dd>
                                        </div>
                                        <div>
                                          <dt>Budget</dt>
                                          <dd>{selectedCampaign.budget || 'Not set'}</dd>
                                        </div>
                                        <div>
                                          <dt>Objective</dt>
                                          <dd>{selectedCampaign.objective || 'No objective captured'}</dd>
                                        </div>
                                        <div>
                                          <dt>Audience</dt>
                                          <dd>{selectedCampaign.audience || 'Audience is in the brief'}</dd>
                                        </div>
                                        <div>
                                          <dt>Offer</dt>
                                          <dd>{selectedCampaign.offer || 'No offer captured'}</dd>
                                        </div>
                                        <div>
                                          <dt>Next Step</dt>
                                          <dd>{selectedCampaign.next_step || 'No next step assigned'}</dd>
                                        </div>
                                      </dl>
                                      {selectedCampaign.proof_notes && (
                                        <div className="campaign-proof-notes">
                                          <span>Proof / Results</span>
                                          <p>{selectedCampaign.proof_notes}</p>
                                        </div>
                                      )}
                                      <div className="campaign-brief-list">
                                        {selectedCampaignBrief.length > 0 ? (
                                          selectedCampaignBrief.map((line) => <p key={line}>{line}</p>)
                                        ) : (
                                          <p>No audience brief captured.</p>
                                        )}
                                      </div>
                                      <form className="campaign-execution-form" onSubmit={updateSelectedCampaignExecution}>
                                        <label>
                                          Status
                                          <select defaultValue={selectedCampaign.status} name="campaignStatus">
                                            <option value="draft">Draft</option>
                                            <option value="recommended">Recommended</option>
                                            <option value="active">Active</option>
                                            <option value="paused">Paused</option>
                                            <option value="complete">Complete</option>
                                          </select>
                                        </label>
                                        <label>
                                          Owner
                                          <input defaultValue={selectedCampaign.owner || ''} name="campaignOwner" placeholder="Owner" type="text" />
                                        </label>
                                        <label>
                                          Launch date
                                          <input defaultValue={selectedCampaign.launch_date || ''} name="campaignLaunchDate" type="date" />
                                        </label>
                                        <label className="wide">
                                          Next step
                                          <textarea
                                            defaultValue={selectedCampaign.next_step || ''}
                                            name="campaignNextStep"
                                            placeholder="Immediate execution step."
                                          />
                                        </label>
                                        <label className="wide">
                                          Proof / results
                                          <textarea
                                            defaultValue={selectedCampaign.proof_notes || ''}
                                            name="campaignProofNotes"
                                            placeholder="Proof needed, live result notes, or signal summary."
                                          />
                                        </label>
                                        <button type="submit">Update Campaign</button>
                                      </form>
                                      <div className="campaign-activity-log">
                                        <div>
                                          <span className="decision-label">Activity Log</span>
                                          <strong>{selectedCampaignActivities.length} logged</strong>
                                        </div>
                                        {selectedCampaignActivities.length > 0 ? (
                                          selectedCampaignActivities.map((activity) => (
                                            <article key={activity.id}>
                                              <header>
                                                <strong>{activity.activity_type}</strong>
                                                <span>{activity.activity_date}</span>
                                              </header>
                                              <p>{activity.outcome || 'No outcome captured yet.'}</p>
                                              <small>
                                                {activity.owner || 'Unassigned'}
                                                {activity.next_step ? ` | ${activity.next_step}` : ''}
                                              </small>
                                            </article>
                                          ))
                                        ) : (
                                          <p className="empty-activity-note">No campaign touches, replies, launches, or results logged yet.</p>
                                        )}
                                      </div>
                                      <form className="campaign-activity-form" onSubmit={createCampaignActivity}>
                                        <label>
                                          Activity
                                          <select defaultValue="touch" name="activityType">
                                            <option value="touch">Touch</option>
                                            <option value="reply">Reply</option>
                                            <option value="launch">Launch</option>
                                            <option value="meeting">Meeting</option>
                                            <option value="result">Result</option>
                                            <option value="blocker">Blocker</option>
                                          </select>
                                        </label>
                                        <label>
                                          Date
                                          <input defaultValue={new Date().toISOString().slice(0, 10)} name="activityDate" type="date" />
                                        </label>
                                        <label>
                                          Owner
                                          <input name="activityOwner" placeholder="Omar / Elara / agent" type="text" />
                                        </label>
                                        <label className="wide">
                                          Outcome
                                          <textarea name="activityOutcome" placeholder="What happened, what signal came back, or what was shipped." />
                                        </label>
                                        <label className="wide">
                                          Next step
                                          <textarea name="activityNextStep" placeholder="Follow-up, asset, reply, proof, or owner action." />
                                        </label>
                                        <button type="submit">Log Activity</button>
                                      </form>
                                      <div className="record-actions">
                                        <button
                                          type="button"
                                          onClick={() => updateCommandRecordStatus('project_campaigns', selectedCampaign.id, 'active')}
                                        >
                                          Active
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => updateCommandRecordStatus('project_campaigns', selectedCampaign.id, 'complete')}
                                        >
                                          Done
                                        </button>
                                      </div>
                                    </aside>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="campaign-grid">
                            {selectedWorkspace.campaigns.map((campaign) => (
                              <article className="campaign-card" key={campaign.name}>
                                <div>
                                  <Megaphone size={18} />
                                  <span>{campaign.status}</span>
                                </div>
                                <h3>{campaign.name}</h3>
                                <small>{campaign.channel}</small>
                                <p>{campaign.recommendation}</p>
                              </article>
                            ))}
                          </div>
                        )}
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
                            Owner
                            <input name="campaignOwner" placeholder="Omar / Elara / sales agent" type="text" />
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
                          <label>
                            Launch date
                            <input name="campaignLaunchDate" type="date" />
                          </label>
                          <label>
                            Budget
                            <input name="campaignBudget" placeholder="$500 test / TBD" type="text" />
                          </label>
                          <label className="wide">
                            Objective
                            <textarea name="campaignObjective" placeholder="What this campaign must prove or produce." />
                          </label>
                          <label className="wide">
                            Audience
                            <textarea name="campaignAudience" placeholder="Who this is for and what CRM segment it targets." />
                          </label>
                          <label className="wide">
                            Offer
                            <textarea name="campaignOffer" placeholder="Primary offer, hook, call to action, or proof-of-concept angle." />
                          </label>
                          <label className="wide">
                            Next step
                            <textarea name="campaignNextStep" placeholder="Immediate execution move, owner action, or asset to create." />
                          </label>
                          <label className="wide">
                            Recommendation
                            <textarea name="campaignRecommendation" placeholder="Audience, offer, message, and next execution step." />
                          </label>
                          <label className="wide">
                            Proof / results notes
                            <textarea name="campaignProofNotes" placeholder="Proof needed, live result notes, conversion signals, or attribution notes." />
                          </label>
                          <button type="submit">Add Campaign</button>
                        </form>
                      </div>
                    )}

                    {workspaceTab === 'proposals' && (
                      <div className="workspace-tab-panel">
                        <div className="workspace-section-head">
                          <div>
                            <span className="decision-label">Proposal Builder</span>
                            <h3>Proposal drafts</h3>
                            <p>Create clean proposal records when a CRM lead reaches proposal stage.</p>
                          </div>
                          <label className="proposal-project-picker">
                            Project
                            <select
                              disabled={projectStatuses.length === 0}
                              onChange={changeProposalProject}
                              value={proposalTargetProject?.id || ''}
                            >
                              {projectStatuses.length === 0 ? (
                                <option value="">Create a project first</option>
                              ) : (
                                projectStatuses.map((project) => (
                                  <option key={project.id} value={project.id}>
                                    {project.project_name}
                                  </option>
                                ))
                              )}
                            </select>
                          </label>
                        </div>
                        {lastGeneratedProposal && (
                          <section className="generated-proposal-callout" aria-label="Generated proposal result">
                            <div>
                              <span className="decision-label">Generated Proposal</span>
                              <h3>{lastGeneratedProposal.company_name}</h3>
                              <p>
                                Your latest proposal is ready below. Use the buttons here or scroll to the branded preview.
                              </p>
                            </div>
                            <div className="proposal-actions">
                              <button type="button" onClick={printSelectedProposal}>
                                Download PDF <Download size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  window.open(
                                    `${window.location.origin}/proposals?proposal=${lastGeneratedProposal.id}`,
                                    '_blank',
                                    'noopener,noreferrer',
                                  )
                                }
                              >
                                Open Link <ExternalLink size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const url = `${window.location.origin}/proposals?proposal=${lastGeneratedProposal.id}`
                                  try {
                                    await navigator.clipboard.writeText(url)
                                    setCommandDataStatus('Proposal review link copied.')
                                  } catch {
                                    setCommandDataStatus(url)
                                  }
                                }}
                              >
                                Copy Link <Link size={16} />
                              </button>
                            </div>
                          </section>
                        )}
                        {projectProposals.length > 0 ? (
                          <section className="proposal-database" aria-label="Proposal database">
                            <div className="proposal-metric-grid">
                              <div>
                                <span>Total</span>
                                <strong>{proposalPipelineMetrics.total}</strong>
                              </div>
                              <div>
                                <span>Active</span>
                                <strong>{proposalPipelineMetrics.active}</strong>
                              </div>
                              <div>
                                <span>Opened / read</span>
                                <strong>{proposalPipelineMetrics.opened}</strong>
                              </div>
                              <div>
                                <span>Signed</span>
                                <strong>{proposalPipelineMetrics.signed}</strong>
                              </div>
                              <div>
                                <span>Needs attention</span>
                                <strong>{proposalPipelineMetrics.attention}</strong>
                              </div>
                            </div>
                            <div className="proposal-database-toolbar">
                              <label>
                                Search proposals
                                <input
                                  type="search"
                                  value={proposalSearch}
                                  onChange={(event) => setProposalSearch(event.target.value)}
                                  placeholder="Company, recipient, project, status..."
                                />
                              </label>
                              <label>
                                Pipeline status
                                <select
                                  value={proposalStatusFilter}
                                  onChange={(event) => setProposalStatusFilter(event.target.value as ProposalFilter)}
                                >
                                  {proposalFilterOptions.map((status) => (
                                    <option key={status} value={status}>
                                      {status === 'all' ? 'All proposals' : getProposalStage(status).label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            {filteredProjectProposals.length > 0 ? (
                              <div className="proposal-card-list">
                                {filteredProjectProposals.map((proposal) => {
                                  const stage = getProposalStage(proposal.status)
                                  const shareUrl = `${window.location.origin}/proposals?proposal=${proposal.id}`

                                  return (
                                    <article
                                      className={`proposal-record-card ${selectedProposal?.id === proposal.id ? 'selected' : ''}`}
                                      key={proposal.id}
                                    >
                                      <button
                                        type="button"
                                        className="proposal-record-main"
                                        onClick={() => setSelectedProposalId(proposal.id)}
                                      >
                                        <div>
                                          <span className="decision-label">{getProposalProjectName(proposal, projectStatuses)}</span>
                                          <h3>{proposal.company_name}</h3>
                                          <p>
                                            {proposal.directed_to}
                                            {proposal.contact_title ? ` | ${proposal.contact_title}` : ''}
                                            {proposal.contact_email ? ` | ${proposal.contact_email}` : ''}
                                          </p>
                                        </div>
                                        <div className="proposal-record-value">
                                          <strong>{proposal.price || 'TBD'}</strong>
                                          <small>{proposal.proposal_date}</small>
                                        </div>
                                      </button>
                                      <div className="proposal-progress-row">
                                        <div>
                                          <span className={`proposal-stage-pill ${proposal.status}`}>{stage.label}</span>
                                          <small>{stage.progress}% through pipeline</small>
                                        </div>
                                        <div className="proposal-progress-track" aria-label={`${stage.label} progress`}>
                                          <span style={{ width: `${stage.progress}%` }} />
                                        </div>
                                      </div>
                                      <div className="proposal-stage-buttons" aria-label="Proposal stage controls">
                                        {proposalPipelineStages.map((pipelineStage) => (
                                          <button
                                            type="button"
                                            key={pipelineStage.id}
                                            className={proposal.status === pipelineStage.id ? 'active' : ''}
                                            onClick={() => updateCommandRecordStatus('project_proposals', proposal.id, pipelineStage.id)}
                                          >
                                            {pipelineStage.label}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="proposal-record-actions">
                                        <button type="button" onClick={() => setSelectedProposalId(proposal.id)}>
                                          Preview
                                        </button>
                                        <button type="button" onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')}>
                                          Open Link <ExternalLink size={15} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await navigator.clipboard.writeText(shareUrl)
                                              setCommandDataStatus('Proposal review link copied.')
                                            } catch {
                                              setCommandDataStatus(shareUrl)
                                            }
                                          }}
                                        >
                                          Copy Link <Link size={15} />
                                        </button>
                                      </div>
                                      <p className="proposal-record-next">
                                        {proposal.next_step || proposal.scope_summary || 'No next step captured yet.'}
                                      </p>
                                    </article>
                                  )
                                })}
                              </div>
                            ) : (
                              <article className="empty-project-state">
                                <Filter size={22} />
                                <div>
                                  <h3>No matching proposals.</h3>
                                  <p>Clear the search or switch the pipeline filter.</p>
                                </div>
                              </article>
                            )}
                          </section>
                        ) : (
                          <article className="empty-project-state">
                            <FileText size={22} />
                            <div>
                              <h3>No proposals yet.</h3>
                              <p>Create one when a CRM record or sales conversation reaches proposal stage.</p>
                            </div>
                          </article>
                        )}
                        {selectedProposal && (
                          <section className="proposal-preview-panel">
                            <div className="workspace-section-head">
                              <div>
                                <span className="decision-label">PDF Preview</span>
                                <h3>{selectedProposal.company_name}</h3>
                                <p>Select any proposal row to preview the branded output.</p>
                              </div>
                              <div className="proposal-actions">
                                <button type="button" onClick={printSelectedProposal}>
                                  Download PDF <Download size={16} />
                                </button>
                                <button type="button" onClick={() => window.open(selectedProposalShareUrl, '_blank', 'noopener,noreferrer')}>
                                  Open Link <ExternalLink size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={copySelectedProposalLink}
                                >
                                  Copy Link <Link size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCommandDataStatus(
                                      'Email delivery still needs the storage/API backend. Download PDF and copy link are ready now.',
                                    )
                                  }
                                >
                                  Send Later <Send size={16} />
                                </button>
                              </div>
                            </div>
                            <article className="proposal-document" aria-label="Proposal PDF preview">
                              <header className="proposal-document-head">
                                <div className="proposal-doc-brand">
                                  <img className="proposal-brand-logo" src={brandLogo} alt="AM Premier Solutions" />
                                  <div>
                                    <strong>AM Premier Solutions</strong>
                                    <small>Power, EV infrastructure, and execution support</small>
                                  </div>
                                </div>
                                <div className="proposal-status-box">
                                  <span>Proposal Status</span>
                                  <strong>{selectedProposal.status}</strong>
                                </div>
                              </header>
                              <div className="proposal-cover-media">
                                <img src={proposalMedia} alt="AM Premier charging infrastructure" />
                                <div>
                                  <span>
                                    <Image size={15} /> AM Premier media package
                                  </span>
                                  <strong>Client-ready infrastructure proposal</strong>
                                  <small>Prepared with AM Premier branding, relevant project media, defined scope, commercial terms, and next action.</small>
                                </div>
                              </div>
                              <div className="proposal-doc-title">
                                <span>Prepared for</span>
                                <h2>{selectedProposal.company_name}</h2>
                                <p>{selectedProposal.company_address || 'Company address pending'}</p>
                              </div>
                              <div className="proposal-doc-meta">
                                <div>
                                  <span>Directed to</span>
                                  <strong>{selectedProposal.directed_to}</strong>
                                  <small>{selectedProposal.contact_title || selectedProposal.contact_email || 'Contact details pending'}</small>
                                </div>
                                <div>
                                  <span>Date</span>
                                  <strong>{selectedProposal.proposal_date}</strong>
                                  <small>{selectedProposal.proposal_time || 'Time not set'}</small>
                                </div>
                                <div>
                                  <span>Investment</span>
                                  <strong>{selectedProposal.price || 'TBD'}</strong>
                                  <small>{selectedProposal.valid_until ? `Valid until ${selectedProposal.valid_until}` : 'Validity pending'}</small>
                                </div>
                              </div>
                              <section>
                                <span className="proposal-section-label">Scope</span>
                                <p>{selectedProposal.scope_summary || 'Scope summary pending.'}</p>
                              </section>
                              <section>
                                <span className="proposal-section-label">Terms</span>
                                <p>{selectedProposal.terms || 'Terms pending.'}</p>
                              </section>
                              <footer className="proposal-doc-footer">
                                <div>
                                  <span>Next step</span>
                                  <strong>{selectedProposal.next_step || 'Review and approve proposal.'}</strong>
                                </div>
                                {selectedProposalShareUrl && (
                                  <div>
                                    <span>Review link</span>
                                    <small>{selectedProposalShareUrl}</small>
                                  </div>
                                )}
                                <small>AM Premier Solutions | ampremiersolutions.com | elara@ampremiersolutions.com</small>
                              </footer>
                            </article>
                          </section>
                        )}
                        <form className="ops-form-grid compact" onSubmit={createProposal}>
                          <label>
                            Date
                            <input defaultValue={new Date().toISOString().slice(0, 10)} name="proposalDate" type="date" />
                          </label>
                          <label>
                            Time
                            <input name="proposalTime" type="time" />
                          </label>
                          <label>
                            Company
                            <input name="proposalCompany" placeholder="Company name" required type="text" />
                          </label>
                          <label>
                            Directed to
                            <input name="proposalDirectedTo" placeholder="Decision maker / recipient" required type="text" />
                          </label>
                          <label>
                            Contact title
                            <input name="proposalContactTitle" placeholder="Owner, VP, Facilities Director" type="text" />
                          </label>
                          <label>
                            Contact email
                            <input name="proposalContactEmail" placeholder="recipient@company.com" type="email" />
                          </label>
                          <label>
                            Price
                            <input name="proposalPrice" placeholder="$25,000 / TBD / Range" type="text" />
                          </label>
                          <label>
                            Valid until
                            <input name="proposalValidUntil" type="date" />
                          </label>
                          <label>
                            Status
                            <select defaultValue="draft" name="proposalStatus">
                              <option value="draft">Draft</option>
                              <option value="ready">Ready</option>
                              <option value="sent">Sent</option>
                              <option value="opened">Opened</option>
                              <option value="read">Read</option>
                              <option value="commented">Commented</option>
                              <option value="signed">Signed</option>
                              <option value="accepted">Accepted</option>
                              <option value="declined">Declined</option>
                            </select>
                          </label>
                          <label className="wide">
                            Company address
                            <textarea name="proposalAddress" placeholder="Street, city, state, ZIP." />
                          </label>
                          <label className="wide">
                            Scope summary
                            <textarea name="proposalScope" placeholder="What is included, deliverables, service area, equipment, or work package." />
                          </label>
                          <label className="wide">
                            Terms
                            <textarea name="proposalTerms" placeholder="Deposit, payment timing, assumptions, exclusions, expiration, or next required approval." />
                          </label>
                          <label className="wide">
                            Next step
                            <textarea name="proposalNextStep" placeholder="Send proposal, schedule review call, collect missing site info, or revise price." />
                          </label>
                          <button type="submit" disabled={!proposalTargetProject}>
                            Generate Proposal <FileText size={18} />
                          </button>
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

            {isProposalsRoute && <div className="project-grid">
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
                      <div className="project-card-actions">
                        <span className={`health-pill ${project.health}`}>
                          {project.health === 'green' ? <CircleCheck size={15} /> : <CircleAlert size={15} />}
                          {project.status}
                        </span>
                        {persistedProjectIds.has(project.id) && (
                          <>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                deleteProjectWorkspace(project)
                              }}
                              aria-label={`Delete ${project.project_name}`}
                            >
                              <Trash2 size={15} />
                            </button>
                            {projectStatuses.filter((currentProject) => currentProject.project_name === project.project_name).length > 1 && (
                              <button
                                className="project-delete-duplicates-button"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  deleteProjectWorkspacesByName(project)
                                }}
                              >
                                Delete duplicates
                              </button>
                            )}
                          </>
                        )}
                      </div>
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
            </div>}
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
          <span className="brand-mark brand-logo-mark">
            <img src={brandLogo} alt="" />
          </span>
          <span>
            <strong>AM Premier Connect</strong>
            <small>Secure project portal</small>
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
          {isInternal && (
            <button type="button" onClick={() => navigateTo('/chat')}>
              Workspace
            </button>
          )}
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
          <p className="eyebrow">AM Premier Connect</p>
          <h1>Secure project access for AM Premier clients and partners.</h1>
          <p className="hero-text">
            Request access, submit project needs, coordinate vendor documents, and keep critical power and infrastructure work moving through a controlled approval process.
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
          <div className="trust-strip" aria-label="Portal capabilities">
            <span>Approval-gated</span>
            <span>Project intake</span>
            <span>Vendor coordination</span>
          </div>
        </div>

        <aside className="login-panel" id="login" aria-label="Portal login">
          <div className="panel-heading">
            <LockKeyhole size={20} />
            <div>
              <h2>{session ? 'Portal Session' : 'Portal Login'}</h2>
              <p>{session ? session.user.email : 'Approved users can sign in here. New users should request access first.'}</p>
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

        <aside className="hero-media-card" aria-label="AM Premier infrastructure">
          <img src={proposalMedia} alt="AM Premier charging infrastructure" />
          <div>
            <span>Infrastructure ready</span>
            <strong>Power, EV, generator, and project execution support.</strong>
          </div>
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
          <h2>Built around the way clients, vendors, and internal teams actually move projects forward.</h2>
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
              <p>{session ? 'Saved against the active portal session.' : 'Share the project need and AM Premier will route it to the right owner.'}</p>
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
              <p>{isInternal ? 'Approve or deny pending portal access requests.' : 'A simple path from request to coordinated execution.'}</p>
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
              <span>{isInternal ? 'Internal admin controls enabled.' : 'Secure portal workflow active.'}</span>
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
              <p>Choose the access lane that matches your role so AM Premier can approve the right portal permissions.</p>
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
