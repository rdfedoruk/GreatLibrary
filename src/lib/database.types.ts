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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      claims: {
        Row: {
          content_creator_id: string
          created_at: string
          id: string
          status: Database["public"]["Enums"]["review_status"]
          user_id: string
        }
        Insert: {
          content_creator_id: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["review_status"]
          user_id: string
        }
        Update: {
          content_creator_id?: string
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["review_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_content_creator_id_fkey"
            columns: ["content_creator_id"]
            isOneToOne: false
            referencedRelation: "content_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          comment_type: Database["public"]["Enums"]["comment_type"]
          created_at: string
          id: string
          submission_id: string
          user_id: string
        }
        Insert: {
          body: string
          comment_type?: Database["public"]["Enums"]["comment_type"]
          created_at?: string
          id?: string
          submission_id: string
          user_id: string
        }
        Update: {
          body?: string
          comment_type?: Database["public"]["Enums"]["comment_type"]
          created_at?: string
          id?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_creators: {
        Row: {
          created_at: string
          display_name: string
          id: string
          linked_user_id: string | null
          linkedin_profile_url: string | null
          sn_community_username: string | null
          youtube_channel_id: string | null
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          linked_user_id?: string | null
          linkedin_profile_url?: string | null
          sn_community_username?: string | null
          youtube_channel_id?: string | null
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          linked_user_id?: string | null
          linkedin_profile_url?: string | null
          sn_community_username?: string | null
          youtube_channel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_creators_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      removal_requests: {
        Row: {
          content_creator_id: string
          created_at: string
          id: string
          reason: string | null
          status: Database["public"]["Enums"]["review_status"]
          submission_id: string
        }
        Insert: {
          content_creator_id: string
          created_at?: string
          id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          submission_id: string
        }
        Update: {
          content_creator_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "removal_requests_content_creator_id_fkey"
            columns: ["content_creator_id"]
            isOneToOne: false
            referencedRelation: "content_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "removal_requests_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_tags: {
        Row: {
          submission_id: string
          tag_id: string
        }
        Insert: {
          submission_id: string
          tag_id: string
        }
        Update: {
          submission_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_tags_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          content_creator_id: string | null
          created_at: string
          description: string
          id: string
          source_site: Database["public"]["Enums"]["source_site"]
          submitted_by: string
          url: string
        }
        Insert: {
          content_creator_id?: string | null
          created_at?: string
          description: string
          id?: string
          source_site: Database["public"]["Enums"]["source_site"]
          submitted_by: string
          url: string
        }
        Update: {
          content_creator_id?: string | null
          created_at?: string
          description?: string
          id?: string
          source_site?: Database["public"]["Enums"]["source_site"]
          submitted_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_content_creator_id_fkey"
            columns: ["content_creator_id"]
            isOneToOne: false
            referencedRelation: "content_creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          dimension: Database["public"]["Enums"]["tag_dimension"]
          id: string
          name: string
        }
        Insert: {
          dimension: Database["public"]["Enums"]["tag_dimension"]
          id?: string
          name: string
        }
        Update: {
          dimension?: Database["public"]["Enums"]["tag_dimension"]
          id?: string
          name?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          submission_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          submission_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          submission_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      comment_type: "comment" | "suggestion" | "critique"
      review_status: "pending" | "approved" | "rejected"
      source_site:
        | "linkedin"
        | "youtube"
        | "sn_community"
        | "manual"
        | "generic"
      tag_dimension: "module" | "medium"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      comment_type: ["comment", "suggestion", "critique"],
      review_status: ["pending", "approved", "rejected"],
      source_site: ["linkedin", "youtube", "sn_community", "manual", "generic"],
      tag_dimension: ["module", "medium"],
    },
  },
} as const
