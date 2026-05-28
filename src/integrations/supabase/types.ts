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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      debt_payments: {
        Row: {
          amount: number
          created_at: string
          debt_id: string
          id: string
          paid_at: string
          raw_text: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          debt_id: string
          id?: string
          paid_at?: string
          raw_text?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          debt_id?: string
          id?: string
          paid_at?: string
          raw_text?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_reminders: {
        Row: {
          created_at: string
          debt_id: string
          dismissed_at: string | null
          due_date: string
          expected_amount: number
          id: string
          paid_amount: number | null
          paid_at: string | null
          payment_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          debt_id: string
          dismissed_at?: string | null
          due_date: string
          expected_amount: number
          id?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          debt_id?: string
          dismissed_at?: string | null
          due_date?: string
          expected_amount?: number
          id?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_reminders_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "debts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debt_reminders_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "debt_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      debts: {
        Row: {
          closed_at: string | null
          created_at: string
          currency: string
          current_balance: number
          description: string | null
          end_date: string | null
          id: string
          initial_amount: number
          interest_rate: number | null
          is_closed: boolean
          kind: string
          last_payment_reminder_sent_at: string | null
          monthly_payment: number | null
          name: string
          next_payment_date: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          currency?: string
          current_balance: number
          description?: string | null
          end_date?: string | null
          id?: string
          initial_amount: number
          interest_rate?: number | null
          is_closed?: boolean
          kind?: string
          last_payment_reminder_sent_at?: string | null
          monthly_payment?: number | null
          name: string
          next_payment_date?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          description?: string | null
          end_date?: string | null
          id?: string
          initial_amount?: number
          interest_rate?: number | null
          is_closed?: boolean
          kind?: string
          last_payment_reminder_sent_at?: string | null
          monthly_payment?: number | null
          name?: string
          next_payment_date?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          monthly_limit: number | null
          name: string
          slug: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          monthly_limit?: number | null
          name: string
          slug: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          monthly_limit?: number | null
          name?: string
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          occurred_at: string
          raw_text: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          occurred_at?: string
          raw_text?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          occurred_at?: string
          raw_text?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_contributions: {
        Row: {
          amount: number
          created_at: string
          goal_id: string
          id: string
          note: string | null
          occurred_at: string
          raw_text: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          goal_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          raw_text?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          goal_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          raw_text?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          category_id: string | null
          color: string | null
          created_at: string
          currency: string
          current_amount: number
          description: string | null
          icon: string | null
          id: string
          is_archived: boolean
          kind: string
          name: string
          target_amount: number
          target_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          current_amount?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          kind?: string
          name: string
          target_amount: number
          target_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          currency?: string
          current_amount?: number
          description?: string | null
          icon?: string | null
          id?: string
          is_archived?: boolean
          kind?: string
          name?: string
          target_amount?: number
          target_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      income_categories: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          user_id?: string
        }
        Relationships: []
      }
      incomes: {
        Row: {
          amount: number
          category_id: string | null
          client_name: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          raw_text: string | null
          received_at: string
          source: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          raw_text?: string | null
          received_at?: string
          source?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          client_name?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          raw_text?: string | null
          received_at?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incomes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "income_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          duration_minutes: number | null
          ends_at: string | null
          google_event_id: string | null
          id: string
          is_todo: boolean
          raw_text: string | null
          reminded_at: string | null
          source: string | null
          starts_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          ends_at?: string | null
          google_event_id?: string | null
          id?: string
          is_todo?: boolean
          raw_text?: string | null
          reminded_at?: string | null
          source?: string | null
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          duration_minutes?: number | null
          ends_at?: string | null
          google_event_id?: string | null
          id?: string
          is_todo?: boolean
          raw_text?: string | null
          reminded_at?: string | null
          source?: string | null
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      telegram_users: {
        Row: {
          created_at: string
          id: string
          telegram_chat_id: number | null
          user_id: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          telegram_chat_id?: number | null
          user_id: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          telegram_chat_id?: number | null
          user_id?: string
          username?: string | null
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
      debts_summary: {
        Row: {
          active_count: number | null
          total_initial: number | null
          total_monthly: number | null
          total_remaining: number | null
          user_id: string | null
        }
        Relationships: []
      }
      monthly_balance: {
        Row: {
          balance: number | null
          expense_total: number | null
          income_total: number | null
          month: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
          last_sign_in_at: string
          roles: string[]
          telegram_chat_id: number
          telegram_username: string
        }[]
      }
      ensure_debt_reminders: { Args: never; Returns: undefined }
      get_user_by_chat_id: { Args: { p_chat_id: number }; Returns: string }
      get_user_by_username: { Args: { p_username: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_chat_id_by_username: {
        Args: { p_chat_id: number; p_username: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
