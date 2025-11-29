// Tipos do banco de dados Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          password_hash: string;
          name: string;
          phone: string | null;
          role: 'admin' | 'operator';
          profile_id: string | null;
          is_active: boolean;
          failed_login_attempts: number;
          locked_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          password_hash: string;
          name: string;
          phone?: string | null;
          role?: 'admin' | 'operator';
          profile_id?: string | null;
          is_active?: boolean;
          failed_login_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          password_hash?: string;
          name?: string;
          phone?: string | null;
          role?: 'admin' | 'operator';
          profile_id?: string | null;
          is_active?: boolean;
          failed_login_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          birth_date: string | null;
          gender: string | null;
          guardian_name: string | null;
          guardian_phone: string | null;
          guardian_email: string | null;
          address: string | null;
          notes: string | null;
          custom_fields: Record<string, unknown> | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          birth_date?: string | null;
          gender?: string | null;
          guardian_name?: string | null;
          guardian_phone?: string | null;
          guardian_email?: string | null;
          address?: string | null;
          notes?: string | null;
          custom_fields?: Record<string, unknown> | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          birth_date?: string | null;
          gender?: string | null;
          guardian_name?: string | null;
          guardian_phone?: string | null;
          guardian_email?: string | null;
          address?: string | null;
          notes?: string | null;
          custom_fields?: Record<string, unknown> | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      stages: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          order_index: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          order_index: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      stage_activities: {
        Row: {
          id: string;
          stage_id: string;
          name: string;
          description: string | null;
          order_index: number;
          is_required: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          stage_id: string;
          name: string;
          description?: string | null;
          order_index: number;
          is_required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          stage_id?: string;
          name?: string;
          description?: string | null;
          order_index?: number;
          is_required?: boolean;
          created_at?: string;
        };
      };
      client_stages: {
        Row: {
          id: string;
          client_id: string;
          stage_id: string;
          status: 'not_started' | 'in_progress' | 'completed';
          started_at: string | null;
          completed_at: string | null;
          started_by: string | null;
          completed_by: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          stage_id: string;
          status?: 'not_started' | 'in_progress' | 'completed';
          started_at?: string | null;
          completed_at?: string | null;
          started_by?: string | null;
          completed_by?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          stage_id?: string;
          status?: 'not_started' | 'in_progress' | 'completed';
          started_at?: string | null;
          completed_at?: string | null;
          started_by?: string | null;
          completed_by?: string | null;
        };
      };
      client_activities: {
        Row: {
          id: string;
          client_id: string;
          activity_id: string;
          is_completed: boolean;
          completed_at: string | null;
          completed_by: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          activity_id: string;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          activity_id?: string;
          is_completed?: boolean;
          completed_at?: string | null;
          completed_by?: string | null;
        };
      };
      notes: {
        Row: {
          id: string;
          client_id: string;
          stage_id: string | null;
          content: string;
          is_auto_generated: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          stage_id?: string | null;
          content: string;
          is_auto_generated?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          stage_id?: string | null;
          content?: string;
          is_auto_generated?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
      };
      attachments: {
        Row: {
          id: string;
          note_id: string;
          file_name: string;
          file_path: string;
          file_type: string | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          file_name: string;
          file_path: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          note_id?: string;
          file_name?: string;
          file_path?: string;
          file_type?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
      };
      custom_fields: {
        Row: {
          id: string;
          name: string;
          field_type: 'text' | 'number' | 'date' | 'select' | 'boolean';
          options: string[] | null;
          is_required: boolean;
          order_index: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          field_type: 'text' | 'number' | 'date' | 'select' | 'boolean';
          options?: string[] | null;
          is_required?: boolean;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          field_type?: 'text' | 'number' | 'date' | 'select' | 'boolean';
          options?: string[] | null;
          is_required?: boolean;
          order_index?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      access_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          ip_address: string | null;
          user_agent: string | null;
          details: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          ip_address?: string | null;
          user_agent?: string | null;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          details?: Record<string, unknown> | null;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
};

// Tipos auxiliares
export type User = Database['public']['Tables']['users']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Stage = Database['public']['Tables']['stages']['Row'];
export type StageActivity = Database['public']['Tables']['stage_activities']['Row'];
export type ClientStage = Database['public']['Tables']['client_stages']['Row'];
export type ClientActivity = Database['public']['Tables']['client_activities']['Row'];
export type Note = Database['public']['Tables']['notes']['Row'];
export type Attachment = Database['public']['Tables']['attachments']['Row'];
export type CustomField = Database['public']['Tables']['custom_fields']['Row'];
export type AccessLog = Database['public']['Tables']['access_logs']['Row'];

// Tipos para inserção
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type StageInsert = Database['public']['Tables']['stages']['Insert'];
export type StageActivityInsert = Database['public']['Tables']['stage_activities']['Insert'];
export type NoteInsert = Database['public']['Tables']['notes']['Insert'];

// Tipos para atualização
export type UserUpdate = Database['public']['Tables']['users']['Update'];
export type ClientUpdate = Database['public']['Tables']['clients']['Update'];
export type StageUpdate = Database['public']['Tables']['stages']['Update'];
export type StageActivityUpdate = Database['public']['Tables']['stage_activities']['Update'];
