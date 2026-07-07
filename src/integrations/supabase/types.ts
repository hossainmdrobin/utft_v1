export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounting_periods: {
        Row: {
          created_at: string | null
          id: string
          is_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          month: number
          unlocked_at: string | null
          unlocked_by: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          month: number
          unlocked_at?: string | null
          unlocked_by?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          month?: number
          unlocked_at?: string | null
          unlocked_by?: string | null
          year?: number
        }
        Relationships: []
      }
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at: string | null
          created_by: string | null
          current_balance: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_contra: boolean | null
          is_system: boolean | null
          name: string
          opening_balance: number | null
          parent_account_id: string | null
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          code: string
          created_at?: string | null
          created_by?: string | null
          current_balance?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_contra?: boolean | null
          is_system?: boolean | null
          name: string
          opening_balance?: number | null
          parent_account_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_balance?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_contra?: boolean | null
          is_system?: boolean | null
          name?: string
          opening_balance?: number | null
          parent_account_id?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          action_type: string | null
          changed_at: string
          changed_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_deleted: boolean | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          action_type?: string | null
          changed_at?: string
          changed_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          action_type?: string | null
          changed_at?: string
          changed_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      contribution_settings: {
        Row: {
          created_at: string | null
          default_contribution_amount: number
          default_due_day: number
          id: string
          is_active: boolean
          member_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_contribution_amount?: number
          default_due_day?: number
          id?: string
          is_active?: boolean
          member_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_contribution_amount?: number
          default_due_day?: number
          id?: string
          is_active?: boolean
          member_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contribution_settings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contribution_settings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      fine_rules: {
        Row: {
          created_at: string | null
          created_by: string | null
          cumulative_frequency: string | null
          fine_type: string
          fine_value: number
          grace_period_days: number
          id: string
          is_active: boolean
          is_cumulative: boolean
          max_fine_amount: number | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          cumulative_frequency?: string | null
          fine_type: string
          fine_value?: number
          grace_period_days?: number
          id?: string
          is_active?: boolean
          is_cumulative?: boolean
          max_fine_amount?: number | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          cumulative_frequency?: string | null
          fine_type?: string
          fine_value?: number
          grace_period_days?: number
          id?: string
          is_active?: boolean
          is_cumulative?: boolean
          max_fine_amount?: number | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fine_transactions: {
        Row: {
          applied_date: string
          charge_id: string | null
          created_at: string | null
          donation_id: string | null
          fine_amount: number
          fine_rule_id: string | null
          id: string
          member_id: string
          paid_amount: number
          payment_date: string | null
          reason: string | null
          status: string
          updated_at: string | null
          waive_reason: string | null
          waived_at: string | null
          waived_by: string | null
        }
        Insert: {
          applied_date?: string
          charge_id?: string | null
          created_at?: string | null
          donation_id?: string | null
          fine_amount?: number
          fine_rule_id?: string | null
          id?: string
          member_id: string
          paid_amount?: number
          payment_date?: string | null
          reason?: string | null
          status?: string
          updated_at?: string | null
          waive_reason?: string | null
          waived_at?: string | null
          waived_by?: string | null
        }
        Update: {
          applied_date?: string
          charge_id?: string | null
          created_at?: string | null
          donation_id?: string | null
          fine_amount?: number
          fine_rule_id?: string | null
          id?: string
          member_id?: string
          paid_amount?: number
          payment_date?: string | null
          reason?: string | null
          status?: string
          updated_at?: string | null
          waive_reason?: string | null
          waived_at?: string | null
          waived_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fine_transactions_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "member_charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fine_transactions_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "monthly_donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fine_transactions_fine_rule_id_fkey"
            columns: ["fine_rule_id"]
            isOneToOne: false
            referencedRelation: "fine_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fine_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fine_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_date: string
          entry_number: string
          id: string
          is_locked: boolean | null
          locked_at: string | null
          locked_by: string | null
          member_id: string | null
          posted_at: string | null
          posted_by: string | null
          reference: string | null
          status: string | null
          total_credit: number | null
          total_debit: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          member_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          is_locked?: boolean | null
          locked_at?: string | null
          locked_by?: string | null
          member_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_entry_id: string
          member_id: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id: string
          member_id?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string
          member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_charges: {
        Row: {
          amount: number
          charge_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          member_id: string
          paid_amount: number
          payment_date: string | null
          status: string
          updated_at: string | null
          year: number
        }
        Insert: {
          amount?: number
          charge_type: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          member_id: string
          paid_amount?: number
          payment_date?: string | null
          status?: string
          updated_at?: string | null
          year: number
        }
        Update: {
          amount?: number
          charge_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          member_id?: string
          paid_amount?: number
          payment_date?: string | null
          status?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "member_charges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_charges_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          approved_at: string | null
          beneficiary_id: string | null
          blood_group: string | null
          created_at: string
          date_of_birth: string | null
          deceased_at: string | null
          education: string | null
          email: string | null
          father_name: string | null
          form_no: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          member_type: Database["public"]["Enums"]["member_type"]
          mobile: string | null
          mother_name: string | null
          nationality: string | null
          nid: string | null
          nominee_name: string | null
          nominee_nid: string | null
          nominee_relation: string | null
          permanent_address: string | null
          photo_url: string | null
          present_address: string | null
          profession: string | null
          religion: string | null
          share_quantity: number
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          beneficiary_id?: string | null
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          deceased_at?: string | null
          education?: string | null
          email?: string | null
          father_name?: string | null
          form_no?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          member_type: Database["public"]["Enums"]["member_type"]
          mobile?: string | null
          mother_name?: string | null
          nationality?: string | null
          nid?: string | null
          nominee_name?: string | null
          nominee_nid?: string | null
          nominee_relation?: string | null
          permanent_address?: string | null
          photo_url?: string | null
          present_address?: string | null
          profession?: string | null
          religion?: string | null
          share_quantity?: number
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          beneficiary_id?: string | null
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string | null
          deceased_at?: string | null
          education?: string | null
          email?: string | null
          father_name?: string | null
          form_no?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          member_type?: Database["public"]["Enums"]["member_type"]
          mobile?: string | null
          mother_name?: string | null
          nationality?: string | null
          nid?: string | null
          nominee_name?: string | null
          nominee_nid?: string | null
          nominee_relation?: string | null
          permanent_address?: string | null
          photo_url?: string | null
          present_address?: string | null
          profession?: string | null
          religion?: string | null
          share_quantity?: number
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      monthly_donations: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          member_id: string
          month: number
          notes: string | null
          paid_amount: number
          payment_date: string | null
          status: string
          updated_at: string | null
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          member_id: string
          month: number
          notes?: string | null
          paid_amount?: number
          payment_date?: string | null
          status?: string
          updated_at?: string | null
          year: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          member_id?: string
          month?: number
          notes?: string | null
          paid_amount?: number
          payment_date?: string | null
          status?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "monthly_donations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_donations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      report_templates: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          config: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_receivables: {
        Row: {
          created_at: string
          due_date: string | null
          id: string
          member_id: string
          month: number
          notes: string | null
          paid_amount: number
          payment_date: string | null
          remaining_amount: number | null
          share_price: number
          share_quantity: number
          status: string
          total_amount: number
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          id?: string
          member_id: string
          month: number
          notes?: string | null
          paid_amount?: number
          payment_date?: string | null
          remaining_amount?: number | null
          share_price?: number
          share_quantity?: number
          status?: string
          total_amount?: number
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          due_date?: string | null
          id?: string
          member_id?: string
          month?: number
          notes?: string | null
          paid_amount?: number
          payment_date?: string | null
          remaining_amount?: number | null
          share_price?: number
          share_quantity?: number
          status?: string
          total_amount?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "share_receivables_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_receivables_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      share_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          member_id: string
          notes: string | null
          share_quantity: number
          transaction_date: string | null
          transaction_type: string
          transfer_from_member_id: string | null
          transfer_to_member_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          member_id: string
          notes?: string | null
          share_quantity: number
          transaction_date?: string | null
          transaction_type: string
          transfer_from_member_id?: string | null
          transfer_to_member_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          share_quantity?: number
          transaction_date?: string | null
          transaction_type?: string
          transfer_from_member_id?: string | null
          transfer_to_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transactions_transfer_from_member_id_fkey"
            columns: ["transfer_from_member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transactions_transfer_from_member_id_fkey"
            columns: ["transfer_from_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transactions_transfer_to_member_id_fkey"
            columns: ["transfer_to_member_id"]
            isOneToOne: false
            referencedRelation: "member_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_transactions_transfer_to_member_id_fkey"
            columns: ["transfer_to_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      member_directory: {
        Row: {
          approved_at: string | null
          beneficiary_id: string | null
          full_name: string | null
          id: string | null
          member_type: Database["public"]["Enums"]["member_type"] | null
          photo_url: string | null
          share_quantity: number | null
          status: Database["public"]["Enums"]["member_status"] | null
        }
        Insert: {
          approved_at?: string | null
          beneficiary_id?: string | null
          full_name?: string | null
          id?: string | null
          member_type?: Database["public"]["Enums"]["member_type"] | null
          photo_url?: string | null
          share_quantity?: number | null
          status?: Database["public"]["Enums"]["member_status"] | null
        }
        Update: {
          approved_at?: string | null
          beneficiary_id?: string | null
          full_name?: string | null
          id?: string | null
          member_type?: Database["public"]["Enums"]["member_type"] | null
          photo_url?: string | null
          share_quantity?: number | null
          status?: Database["public"]["Enums"]["member_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_member: { Args: { p_member_id: string }; Returns: undefined }
      calculate_member_fines: { Args: never; Returns: undefined }
      can_modify_entry: { Args: { entry_id: string }; Returns: boolean }
      generate_beneficiary_id: {
        Args: {
          p_full_name: string
          p_member_type: Database["public"]["Enums"]["member_type"]
          p_year?: number
        }
        Returns: string
      }
      generate_entry_number: { Args: never; Returns: string }
      get_member_financial_summary: {
        Args: { p_member_id: string }
        Returns: {
          charges_due: number
          charges_paid: number
          fines_paid: number
          fines_pending: number
          grand_total_due: number
          payment_status: string
          total_charges: number
          total_contributions: number
          total_due: number
          total_fines: number
          total_paid: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_member: { Args: { p_member_id: string }; Returns: undefined }
    }
    Enums: {
      account_type: "asset" | "liability" | "equity" | "income" | "expense"
      app_role: "admin" | "user"
      gender: "male" | "female" | "other"
      member_status: "pending" | "active" | "inactive" | "deceased"
      member_type: "founding" | "general"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["asset", "liability", "equity", "income", "expense"],
      app_role: ["admin", "user"],
      gender: ["male", "female", "other"],
      member_status: ["pending", "active", "inactive", "deceased"],
      member_type: ["founding", "general"],
    },
  },
} as const
