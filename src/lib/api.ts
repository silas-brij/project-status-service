import { supabase } from './supabase'
import type {
  Meeting,
  MeetingInput,
  MeetingSummary,
  NotesFormat,
  Payment,
  PaymentInput,
  Project,
  ProjectInput,
  Sprint,
  SprintInput,
  Standup,
  StandupDate,
} from './types'

interface Result {
  data: unknown
  error: { message: string } | null
}

function unwrap<T>({ data, error }: Result): T {
  if (error) throw new Error(error.message)
  return data as T
}

// Projects -------------------------------------------------------------------

export async function listProjects() {
  return unwrap<Project[]>(await supabase.from('projects').select('*').order('name'))
}

export async function getProject(id: string) {
  return unwrap<Project>(await supabase.from('projects').select('*').eq('id', id).single())
}

export async function createProject(input: ProjectInput) {
  return unwrap<Project>(await supabase.from('projects').insert(input).select().single())
}

export async function updateProject(id: string, input: Partial<ProjectInput>) {
  return unwrap<Project>(await supabase.from('projects').update(input).eq('id', id).select().single())
}

export async function deleteProject(id: string) {
  unwrap(await supabase.from('projects').delete().eq('id', id))
}

// Stand-ups ------------------------------------------------------------------

/** All dates that have a stand-up (lightweight, used for calendar markers). */
export async function listStandupDates(projectId: string) {
  return unwrap<StandupDate[]>(
    await supabase.from('standups').select('id, date').eq('project_id', projectId).order('date'),
  )
}

export async function listStandupsInRange(projectId: string, from: string, to: string) {
  return unwrap<Standup[]>(
    await supabase
      .from('standups')
      .select('*')
      .eq('project_id', projectId)
      .gte('date', from)
      .lte('date', to)
      .order('date'),
  )
}

export async function getStandup(projectId: string, date: string) {
  return unwrap<Standup | null>(
    await supabase.from('standups').select('*').eq('project_id', projectId).eq('date', date).maybeSingle(),
  )
}

export async function getLatestStandup(projectId: string) {
  return unwrap<Standup | null>(
    await supabase
      .from('standups')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  )
}

export async function saveStandup(projectId: string, date: string, content: string, contentFormat: NotesFormat) {
  return unwrap<Standup>(
    await supabase
      .from('standups')
      .upsert({ project_id: projectId, date, content, content_format: contentFormat }, { onConflict: 'project_id,date' })
      .select()
      .single(),
  )
}

export async function saveStandups(
  projectId: string,
  entries: Pick<Standup, 'date' | 'content' | 'content_format'>[],
) {
  unwrap(
    await supabase
      .from('standups')
      .upsert(
        entries.map((e) => ({ project_id: projectId, ...e })),
        { onConflict: 'project_id,date' },
      ),
  )
}

export async function deleteStandup(id: string) {
  unwrap(await supabase.from('standups').delete().eq('id', id))
}

// Sprints --------------------------------------------------------------------

export async function listSprints(projectId: string) {
  return unwrap<Sprint[]>(
    await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: false }),
  )
}

export async function createSprint(projectId: string, input: SprintInput) {
  return unwrap<Sprint>(
    await supabase.from('sprints').insert({ ...input, project_id: projectId }).select().single(),
  )
}

export async function updateSprint(id: string, input: Partial<SprintInput>) {
  return unwrap<Sprint>(await supabase.from('sprints').update(input).eq('id', id).select().single())
}

export async function deleteSprint(id: string) {
  unwrap(await supabase.from('sprints').delete().eq('id', id))
}

// Payments -------------------------------------------------------------------

export async function listPayments(projectId: string) {
  return unwrap<Payment[]>(
    await supabase.from('payments').select('*').eq('project_id', projectId).order('due_date'),
  )
}

export async function createPayment(projectId: string, input: PaymentInput) {
  return unwrap<Payment>(
    await supabase.from('payments').insert({ ...input, project_id: projectId }).select().single(),
  )
}

export async function updatePayment(id: string, input: Partial<PaymentInput>) {
  return unwrap<Payment>(await supabase.from('payments').update(input).eq('id', id).select().single())
}

export async function deletePayment(id: string) {
  unwrap(await supabase.from('payments').delete().eq('id', id))
}

// Meetings -------------------------------------------------------------------

const MEETING_SUMMARY = 'id, project_id, title, date, start_time, end_time'

/** Every meeting of a project, without notes, in date and time order. */
export async function listMeetings(projectId: string) {
  return unwrap<MeetingSummary[]>(
    await supabase
      .from('meetings')
      .select(MEETING_SUMMARY)
      .eq('project_id', projectId)
      .order('date')
      .order('start_time', { nullsFirst: true })
      .order('created_at'),
  )
}

export async function listMeetingsOn(projectId: string, date: string) {
  return unwrap<Meeting[]>(
    await supabase
      .from('meetings')
      .select('*')
      .eq('project_id', projectId)
      .eq('date', date)
      .order('start_time', { nullsFirst: true })
      .order('created_at'),
  )
}

export async function createMeeting(projectId: string, input: MeetingInput) {
  return unwrap<Meeting>(
    await supabase.from('meetings').insert({ ...input, project_id: projectId }).select().single(),
  )
}

export async function updateMeeting(id: string, input: Partial<MeetingInput>) {
  return unwrap<Meeting>(await supabase.from('meetings').update(input).eq('id', id).select().single())
}

export async function deleteMeeting(id: string) {
  unwrap(await supabase.from('meetings').delete().eq('id', id))
}

// Dashboard ------------------------------------------------------------------

export interface DashboardData {
  projects: Project[]
  sprints: Sprint[]
  payments: Payment[]
  /** Stand-up dates since `since`, across all projects. */
  standups: Pick<Standup, 'project_id' | 'date'>[]
  /** Meetings from `today` on, in date and time order. */
  meetings: MeetingSummary[]
}

export async function loadDashboard(since: string, today: string): Promise<DashboardData> {
  const [projects, sprints, payments, standups, meetings] = await Promise.all([
    listProjects(),
    supabase.from('sprints').select('*').then(unwrap<Sprint[]>),
    supabase.from('payments').select('*').order('due_date').then(unwrap<Payment[]>),
    supabase
      .from('standups')
      .select('project_id, date')
      .gte('date', since)
      .then(unwrap<Pick<Standup, 'project_id' | 'date'>[]>),
    supabase
      .from('meetings')
      .select(MEETING_SUMMARY)
      .gte('date', today)
      .order('date')
      .order('start_time', { nullsFirst: true })
      .order('created_at')
      .then(unwrap<MeetingSummary[]>),
  ])
  return { projects, sprints, payments, standups, meetings }
}
