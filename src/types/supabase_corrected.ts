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

          grades: string[] | null
          default_installments: number | null
          tuition_fee_category: string | null
          transportation_fee_one_way: number | null
          transportation_fee_two_way: number | null
          receipt_number_format: string | null
          receipt_number_counter: number | null
          receipt_number_prefix: string | null
          show_logo_background: boolean | null
          installment_receipt_number_counter: number | null
          installment_receipt_number_format: string | null
          installment_receipt_number_prefix: string | null
          receipt_number_year: number | null
          installment_receipt_number_year: number | null
          payment: number | null
          created_at: string
          updated_at: string
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

          grades?: string[] | null
          default_installments?: number | null
          tuition_fee_category?: string | null
          transportation_fee_one_way?: number | null
          transportation_fee_two_way?: number | null
          receipt_number_format?: string | null
          receipt_number_counter?: number | null
          receipt_number_prefix?: string | null
          show_logo_background?: boolean | null
          installment_receipt_number_counter?: number | null
          installment_receipt_number_format?: string | null
          installment_receipt_number_prefix?: string | null
          receipt_number_year?: number | null
          installment_receipt_number_year?: number | null
          payment?: number | null
          created_at?: string
          updated_at?: string
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

          grades?: string[] | null
          default_installments?: number | null
          tuition_fee_category?: string | null
          transportation_fee_one_way?: number | null
          transportation_fee_two_way?: number | null
          receipt_number_format?: string | null
          receipt_number_counter?: number | null
          receipt_number_prefix?: string | null
          show_logo_background?: boolean | null
          installment_receipt_number_counter?: number | null
          installment_receipt_number_format?: string | null
          installment_receipt_number_prefix?: string | null
          receipt_number_year?: number | null
          installment_receipt_number_year?: number | null
          payment?: number | null
          created_at?: string
          updated_at?: string
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
          check_number: string | null
          check_date: string | null
          bank_name_arabic: string | null
          bank_name_english: string | null
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
          check_number?: string | null
          check_date?: string | null
          bank_name_arabic?: string | null
          bank_name_english?: string | null
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
          check_number?: string | null
          check_date?: string | null
          bank_name_arabic?: string | null
          bank_name_english?: string | null
        }
      }
      installments: {
        Row: {
          id: string
          student_id: string
          student_name: string
          grade: string
          installment_number: number
          amount: number
          paid: number | null
          balance: number
          status: string
          due_date: string | null
          paid_date: string | null
          payment_date: string | null
          payment_method: string | null
          payment_note: string | null
          receipt_number: string | null
          fee_id: string
          fee_type: string | null
          note: string | null
          school_id: string
          installment_count: number | null
          installment_month: string | null
          paid_amount: number | null
          discount: number | null
          check_number: string | null
          check_date: string | null
          bank_name_arabic: string | null
          bank_name_english: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          student_name: string
          grade: string
          installment_number: number
          amount: number
          paid?: number | null
          balance: number
          status: string
          due_date?: string | null
          paid_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_note?: string | null
          receipt_number?: string | null
          fee_id: string
          fee_type?: string | null
          note?: string | null
          school_id: string
          installment_count?: number | null
          installment_month?: string | null
          paid_amount?: number | null
          discount?: number | null
          check_number?: string | null
          check_date?: string | null
          bank_name_arabic?: string | null
          bank_name_english?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          student_name?: string
          grade?: string
          installment_number?: number
          amount?: number
          paid?: number | null
          balance?: number
          status?: string
          due_date?: string | null
          paid_date?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_note?: string | null
          receipt_number?: string | null
          fee_id?: string
          fee_type?: string | null
          note?: string | null
          school_id?: string
          installment_count?: number | null
          installment_month?: string | null
          paid_amount?: number | null
          discount?: number | null
          check_number?: string | null
          check_date?: string | null
          bank_name_arabic?: string | null
          bank_name_english?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          student_id: string | null
          student_name: string | null
          grade: string | null
          parent_name: string | null
          phone: string | null
          recipient: string
          subject: string | null
          template: string | null
          message: string
          status: string
          sent_at: string | null
          school_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id?: string | null
          student_name?: string | null
          grade?: string | null
          parent_name?: string | null
          phone?: string | null
          recipient: string
          subject?: string | null
          template?: string | null
          message: string
          status: string
          sent_at?: string | null
          school_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string | null
          student_name?: string | null
          grade?: string | null
          parent_name?: string | null
          phone?: string | null
          recipient?: string
          subject?: string | null
          template?: string | null
          message?: string
          status?: string
          sent_at?: string | null
          school_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      settings: {
        Row: {
          id: string
          school_id: string
          name: string | null
          email: string | null
          english_name: string | null
          phone: string | null
          phone_whatsapp: string | null
          phone_call: string | null
          address: string | null
          logo: string | null

          default_installments: number | null
          tuition_fee_category: string | null
          transportation_fee_one_way: number | null
          transportation_fee_two_way: number | null
          receipt_number_format: string | null
        receipt_number_counter: number | null
        receipt_number_prefix: string | null
        installment_receipt_number_counter: number | null
        installment_receipt_number_format: string | null
        installment_receipt_number_prefix: string | null
        receipt_number_year: number | null
        installment_receipt_number_year: number | null
          financial_settings: Json | null
          display_settings: Json | null
          receipt_settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name?: string | null
          email?: string | null
          english_name?: string | null
          phone?: string | null
          phone_whatsapp?: string | null
          phone_call?: string | null
          address?: string | null
          logo?: string | null

          default_installments?: number | null
          tuition_fee_category?: string | null
          transportation_fee_one_way?: number | null
          transportation_fee_two_way?: number | null
          receipt_number_format?: string | null
        receipt_number_counter?: number | null
        receipt_number_prefix?: string | null
        installment_receipt_number_counter?: number | null
        installment_receipt_number_format?: string | null
        installment_receipt_number_prefix?: string | null
        receipt_number_year?: number | null
        installment_receipt_number_year?: number | null
          financial_settings?: Json | null
          display_settings?: Json | null
          receipt_settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string | null
          email?: string | null
          english_name?: string | null
          phone?: string | null
          phone_whatsapp?: string | null
          phone_call?: string | null
          address?: string | null
          logo?: string | null

          default_installments?: number | null
          tuition_fee_category?: string | null
          transportation_fee_one_way?: number | null
          transportation_fee_two_way?: number | null
          receipt_number_format?: string | null
          receipt_number_counter?: number | null
          receipt_number_prefix?: string | null
          installment_receipt_number_counter?: number | null
          installment_receipt_number_format?: string | null
          installment_receipt_number_prefix?: string | null
          receipt_number_year?: number | null
          installment_receipt_number_year?: number | null
          financial_settings?: Json | null
          display_settings?: Json | null
          receipt_settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      templates: {
        Row: {
          id: string
          school_id: string
          name: string
          type: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id: string
          name: string
          type: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          name?: string
          type?: string
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