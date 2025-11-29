// User types
export interface User {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'operator';
  is_active: boolean;
}

export interface AuthUser extends User {
  token: string;
}

// Client types
export interface Client {
  id: string;
  name: string;
  birth_date: string | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  address: string | null;
  custom_fields: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Stage types
export interface Stage {
  id: string;
  name: string;
  description: string | null;
  objective: string | null;
  prerequisites: string | null;
  order_index: number;
  is_active: boolean;
}

export interface StageActivity {
  id: string;
  stage_id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_required: boolean;
}

// Client progress types
export type StageStatus = 'not_started' | 'in_progress' | 'completed';

export interface ClientStage {
  id: string;
  client_id: string;
  stage_id: string;
  status: StageStatus;
  started_at: string | null;
  completed_at: string | null;
  started_by: string | null;
  completed_by: string | null;
  stage?: Stage;
}

export interface ClientActivity {
  id: string;
  client_id: string;
  activity_id: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  activity?: StageActivity;
}

// Note types
export interface Note {
  id: string;
  client_id: string;
  stage_id: string | null;
  content: string;
  is_auto_generated: boolean;
  created_by: string | null;
  created_at: string;
  user?: User;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  note_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
}

// Custom field types
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox';

export interface CustomField {
  id: string;
  name: string;
  field_type: FieldType;
  options: string[] | null;
  is_required: boolean;
  order_index: number;
  is_active: boolean;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Dashboard types
export interface DashboardStats {
  totalClients: number;
  clientsByStage: { stage: string; count: number }[];
  completedThisMonth: number;
  inProgress: number;
  pendingActivities: number;
}

