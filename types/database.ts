export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      rose_state: {
        Row: {
          id: string
          petals_remaining: number
          revivals_remaining: number
          last_visited: string | null
          streak_days: number
          total_visits: number
          is_dead: boolean
          is_final_death: boolean
          garden_stage: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["rose_state"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["rose_state"]["Row"]>
      }
      daily_messages: {
        Row: {
          id: string
          day_number: number
          message: string
          author: string
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["daily_messages"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["daily_messages"]["Row"]>
      }
      memory_stars: {
        Row: {
          id: string
          title: string
          date: string
          memory: string
          photos: string[]
          position_x: number
          position_y: number
          position_z: number
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["memory_stars"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["memory_stars"]["Row"]>
      }
      letters: {
        Row: {
          id: string
          title: string
          content: string
          unlock_days: number
          unlocked: boolean
          unlocked_at: string | null
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["letters"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["letters"]["Row"]>
      }
      gallery_photos: {
        Row: {
          id: string
          url: string
          caption: string | null
          taken_at: string | null
          storage_path: string
          created_at: string
        }
        Insert: Omit<Database["public"]["Tables"]["gallery_photos"]["Row"], "id" | "created_at">
        Update: Partial<Database["public"]["Tables"]["gallery_photos"]["Row"]>
      }
      visit_log: {
        Row: {
          id: string
          visited_at: string
          petals_at_visit: number
          message_shown: string | null
        }
        Insert: Omit<Database["public"]["Tables"]["visit_log"]["Row"], "id">
        Update: Partial<Database["public"]["Tables"]["visit_log"]["Row"]>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
