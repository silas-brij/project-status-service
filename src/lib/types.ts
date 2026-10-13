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
