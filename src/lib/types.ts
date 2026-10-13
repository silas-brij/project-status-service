export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'
export type SprintStatus = 'planned' | 'active' | 'completed'
export type PaymentStatus = 'pending' | 'invoiced' | 'paid' | 'cancelled'

/** Dates are ISO calendar dates (`yyyy-MM-dd`), timestamps are ISO strings. */
export interface Project {
  id: string
  owner_id: string
  name: string
  client: string | null
  /** Markdown */
  description: string | null
  status: ProjectStatus
  color: string
  /** ISO 4217 code, e.g. USD */
  currency: string
  budget: number | null
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
}

export type ProjectInput = Pick<
  Project,
  'name' | 'client' | 'description' | 'status' | 'color' | 'currency' | 'budget' | 'start_date' | 'end_date'
>

export interface Standup {
  id: string
  project_id: string
  date: string
  /** Markdown */
  content: string
  created_at: string
  updated_at: string
}

export type StandupDate = Pick<Standup, 'id' | 'date'>

export interface Sprint {
  id: string
  project_id: string
  name: string
  goal: string | null
  start_date: string
  end_date: string
  status: SprintStatus
  /** Markdown */
  notes: string | null
  created_at: string
  updated_at: string
}

export type SprintInput = Pick<Sprint, 'name' | 'goal' | 'start_date' | 'end_date' | 'status' | 'notes'>

export interface Payment {
  id: string
  project_id: string
  title: string
  amount: number
  due_date: string
  status: PaymentStatus
  paid_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PaymentInput = Pick<Payment, 'title' | 'amount' | 'due_date' | 'status' | 'paid_date' | 'notes'>

export interface Meeting {
  id: string
  project_id: string
  title: string
  date: string
  /** Local wall-clock time, `HH:mm:ss`. */
  start_time: string | null
  end_time: string | null
  /** Room, address or video-call link. */
  location: string | null
  attendees: string[]
  /** Markdown: agenda, notes, action items. */
  notes: string
  created_at: string
  updated_at: string
}

export type MeetingInput = Pick<Meeting, 'title' | 'date' | 'start_time' | 'end_time' | 'location' | 'attendees' | 'notes'>

/** A meeting without its notes, for calendars and lists. */
export type MeetingSummary = Pick<Meeting, 'id' | 'project_id' | 'title' | 'date' | 'start_time' | 'end_time'>
