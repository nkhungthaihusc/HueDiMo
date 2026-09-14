export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          color: string
          created_at: string | null
          emoji: string
          id: string
          label: string
        }
        Insert: {
          color: string
          created_at?: string | null
          emoji: string
          id: string
          label: string
        }
        Update: {
          color?: string
          created_at?: string | null
          emoji?: string
          id?: string
          label?: string
        }
        Relationships: []
      }
      itineraries: {
        Row: {
          budget: number | null
          created_at: string | null
          current_location: string | null
          days: Json
          end_date: string
          id: string
          is_public: boolean | null
          preferences: string[] | null
          start_date: string
          summary: string | null
          title: string
          total_estimated_cost: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          budget?: number | null
          created_at?: string | null
          current_location?: string | null
          days?: Json
          end_date: string
          id?: string
          is_public?: boolean | null
          preferences?: string[] | null
          start_date: string
          summary?: string | null
          title: string
          total_estimated_cost?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          budget?: number | null
          created_at?: string | null
          current_location?: string | null
          days?: Json
          end_date?: string
          id?: string
          is_public?: boolean | null
          preferences?: string[] | null
          start_date?: string
          summary?: string | null
          title?: string
          total_estimated_cost?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      places: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_local: boolean | null
          lat: number
          lng: number
          name: string
          price: number | null
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id: string
          image_url?: string | null
          is_local?: boolean | null
          lat: number
          lng: number
          name: string
          price?: number | null
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_local?: boolean | null
          lat?: number
          lng?: number
          name?: string
          price?: number | null
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "places_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          comment: string
          created_at: string | null
          id: string
          place_id: string
          rating: number
          user_id: string | null
        }
        Insert: {
          author_name: string
          comment: string
          created_at?: string | null
          id?: string
          place_id: string
          rating: number
          user_id?: string | null
        }
        Update: {
          author_name?: string
          comment?: string
          created_at?: string | null
          id?: string
          place_id?: string
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
