export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          email: string
          role: string
          school_id: string | null
          school_name: string | null
          school_logo: string | null

          grade_levels: string[] | null
          password: string | null
          active: boolean | null
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          role: string
          school_id?: string | null
          school_name?: string | null
          school_logo?: string | null

          grade_levels?: string[] | null
          password?: string | null
          active?: boolean | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: string
          school_id?: string | null
          school_name?: string | null
          school_logo?: string | null

          grade_levels?: string[] | null
          password?: string | null
          active?: boolean | null
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      schools: {
        Row: {
          id: string
          name: string
          english_name: string | null
          email: string
          phone: string
          phone_whatsapp: string | null
          phone_call: string | null
          address: string
          location: string | null
          active: boolean | null
          subscription_start: string | null
          subscription_end: string | null
          logo: string | null
          created_at: string
          updated_at: string
          payment: number | null
        }
        Insert: {
          id?: string
          name: string
          english_name?: string | null
          email: string
          phone: string
          phone_whatsapp?: string | null
          phone_call?: string | null
          address: string
          location?: string | null
          active?: boolean | null
          subscription_start?: string | null
          subscription_end?: string | null
          logo?: string | null
          created_at?: string
          updated_at?: string
          payment?: number | null
        }
        Update: {
          id?: string
          name?: string
          english_name?: string | null
          email?: string
          phone?: string
          phone_whatsapp?: string | null
          phone_call?: string | null
          address?: string
          location?: string | null
          active?: boolean | null
          subscription_start?: string | null
          subscription_end?: string | null
          logo?: string | null
          created_at?: string
          updated_at?: string
          payment?: number | null
        }
      }
      students: {
        Row: {
          id: string
          name: string
          english_name: string | null
          student_id: string
          grade: string
          english_grade: string | null
          division: string | null
          parent_name: string
          parent_email: string | null
          phone: string
          whatsapp: string | null
          address: string | null
          transportation: string
          transportation_direction: string | null
          transportation_fee: number | null
          custom_transportation_fee: boolean | null
          school_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          english_name?: string | null
          student_id: string
          grade: string
          english_grade?: string | null
          division?: string | null
          parent_name: string
          parent_email?: string | null
          phone: string
          whatsapp?: string | null
          address?: string | null
          transportation: string
          transportation_direction?: string | null
          transportation_fee?: number | null
          custom_transportation_fee?: boolean | null
          school_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          english_name?: string | null
          student_id?: string
          grade?: string
          english_grade?: string | null
          division?: string | null
          parent_name?: string
          parent_email?: string | null
          phone?: string
          whatsapp?: string | null
          address?: string | null
          transportation?: string
          transportation_direction?: string | null
          transportation_fee?: number | null
          custom_transportation_fee?: boolean | null
          school_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      fees: {
        Row: {
          id: string
          student_id: string
          student_name: string
          grade: string
          fee_type: string
          description: string | null
          amount: number
          discount: number | null
          paid: number | null
          balance: number
          status: string
          due_date: string | null
          school_id: string
          created_at: string
          updated_at: string
          transportation_type: string | null
          payment_date: string | null
          payment_method: string | null
          payment_note: string | null
        }
        Insert: {
          id?: string
          student_id: string
          student_name: string
          grade: string
          fee_type: string
          description?: string | null
          amount: number
          discount?: number | null
          paid?: number | null
          balance: number
          status: string
          due_date?: string | null
          school_id: string
          created_at?: string
          updated_at?: string
          transportation_type?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_note?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          student_name?: string
          grade?: string
          fee_type?: string
          description?: string | null
          amount?: number
          discount?: number | null
          paid?: number | null
          balance?: number
          status?: string
          due_date?: string | null
          school_id?: string
          created_at?: string
          updated_at?: string
          transportation_type?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_note?: string | null
        }
      }
      installments: {
        Row: {
          id: string
          student_id: string
          student_name: string
          grade: string
          amount: number
          due_date: string | null
          paid_date: string | null
          status: string
          fee_id: string
          fee_type: string | null
          note: string | null
          school_id: string
          installment_count: number | null
          installment_month: string | null
          paid_amount: number | null
          discount: number | null
          payment_method: string | null
          payment_note: string | null
          check_number: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          student_name: string
          grade: string
          amount: number
          due_date?: string | null
          paid_date?: string | null
          status: string
          fee_id: string
          fee_type?: string | null
          note?: string | null
          school_id: string
          installment_count?: number | null
          installment_month?: string | null
          paid_amount?: number | null
          discount?: number | null
          payment_method?: string | null
          payment_note?: string | null
          check_number?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          student_name?: string
          grade?: string
          amount?: number
          due_date?: string | null
          paid_date?: string | null
          status?: string
          fee_id?: string
          fee_type?: string | null
          note?: string | null
          school_id?: string
          installment_count?: number | null
          installment_month?: string | null
          paid_amount?: number | null
          discount?: number | null
          payment_method?: string | null
          payment_note?: string | null
          check_number?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          student_id: string
          student_name: string
          grade: string
          parent_name: string
          phone: string
          template: string
          message: string
          sent_at: string
          status: string
          school_id: string
        }
        Insert: {
          id?: string
          student_id: string
          student_name: string
          grade: string
          parent_name: string
          phone: string
          template: string
          message: string
          sent_at: string
          status: string
          school_id: string
        }
        Update: {
          id?: string
          student_id?: string
          student_name?: string
          grade?: string
          parent_name?: string
          phone?: string
          template?: string
          message?: string
          sent_at?: string
          status?: string
          school_id?: string
        }
      }
      settings: {
        Row: {
          id: string
          school_id: string
          name: string
          email: string
          english_name: string | null
          phone: string
          phone_whatsapp: string | null
          phone_call: string | null
          address: string
          logo: string
  
          default_installments: number
          tuition_fee_category: string
          transportation_fee_one_way: number
          transportation_fee_two_way: number
          receipt_number_format: string | null
          receipt_number_counter: number | null
          receipt_number_prefix: string | null
          show_logo_background: boolean | null
          installment_receipt_number_counter: number | null
          installment_receipt_number_format: string | null
          installment_receipt_number_prefix: string | null
          receipt_number_year: number | null
          installment_receipt_number_year: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          email: string
          english_name?: string | null
          phone: string
          phone_whatsapp?: string | null
          phone_call?: string | null
          address: string
          logo: string
  
          default_installments: number
          tuition_fee_category: string
          transportation_fee_one_way: number
          transportation_fee_two_way: number
          receipt_number_format?: string | null
          receipt_number_counter?: number | null
          receipt_number_prefix?: string | null
          show_logo_background?: boolean | null
          installment_receipt_number_counter?: number | null
          installment_receipt_number_format?: string | null
          installment_receipt_number_prefix?: string | null
          receipt_number_year?: number | null
          installment_receipt_number_year?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          email?: string
          english_name?: string | null
          phone?: string
          phone_whatsapp?: string | null
          phone_call?: string | null
          address?: string
          logo?: string
  
          default_installments?: number
          tuition_fee_category?: string
          transportation_fee_one_way?: number
          transportation_fee_two_way?: number
          receipt_number_format?: string | null
          receipt_number_counter?: number | null
          receipt_number_prefix?: string | null
          show_logo_background?: boolean | null
          installment_receipt_number_counter?: number | null
          installment_receipt_number_format?: string | null
          installment_receipt_number_prefix?: string | null
          receipt_number_year?: number | null
          installment_receipt_number_year?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          school_id: string
          name: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
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
  }
}