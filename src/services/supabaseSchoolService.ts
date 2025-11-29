import { supabase } from './supabase';
import { Database } from '../types/supabase';

type SchoolRow = Database['public']['Tables']['schools']['Row'];
type SchoolInsert = Database['public']['Tables']['schools']['Insert'];
type SchoolUpdate = Database['public']['Tables']['schools']['Update'];

export interface School {
  id: string;
  name: string;
  english_name?: string;
  email: string;
  phone: string;
  phone_whatsapp?: string;
  phone_call?: string;
  address: string;
  location?: string;
  active: boolean;
  subscription_start?: string;
  subscription_end?: string;
  logo?: string;

  payment?: number;
  created_at: string;
  updated_at: string;
}

// Convert database row to School interface
const mapRowToSchool = (row: SchoolRow): School => ({
  id: row.id,
  name: row.name,
  english_name: row.english_name || undefined,
  email: row.email,
  phone: row.phone,
  phone_whatsapp: row.phone_whatsapp || undefined,
  phone_call: row.phone_call || undefined,
  address: row.address,
  location: row.location || undefined,
  active: row.active ?? true,
  subscription_start: row.subscription_start || undefined,
  subscription_end: row.subscription_end || undefined,
  logo: row.logo || undefined,

  payment: row.payment ? Number(row.payment) : undefined,
  created_at: row.created_at,
  updated_at: row.updated_at
});

// Convert School to database insert format
const mapSchoolToInsert = (school: Omit<School, 'id' | 'created_at' | 'updated_at'>): SchoolInsert => ({
  name: school.name,
  english_name: school.english_name || null,
  email: school.email,
  phone: school.phone,
  phone_whatsapp: school.phone_whatsapp || null,
  phone_call: school.phone_call || null,
  address: school.address,
  location: school.location || null,
  active: school.active,
  subscription_start: school.subscription_start || null,
  subscription_end: school.subscription_end || null,
  logo: school.logo || null,

  payment: school.payment || null
});

// Convert School to database update format
const mapSchoolToUpdate = (school: Partial<School>): SchoolUpdate => {
  const update: SchoolUpdate = {};
  
  if (school.name !== undefined) update.name = school.name;
  if (school.english_name !== undefined) update.english_name = school.english_name || null;
  if (school.email !== undefined) update.email = school.email;
  if (school.phone !== undefined) update.phone = school.phone;
  if (school.phone_whatsapp !== undefined) update.phone_whatsapp = school.phone_whatsapp || null;
  if (school.phone_call !== undefined) update.phone_call = school.phone_call || null;
  if (school.address !== undefined) update.address = school.address;
  if (school.location !== undefined) update.location = school.location || null;
  if (school.active !== undefined) update.active = school.active;
  if (school.subscription_start !== undefined) update.subscription_start = school.subscription_start || null;
  if (school.subscription_end !== undefined) update.subscription_end = school.subscription_end || null;
  if (school.logo !== undefined) update.logo = school.logo || null;


  if (school.payment !== undefined) update.payment = school.payment || null;
  
  return update;
};

export const getSchools = async (): Promise<School[]> => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schools:', error);
      throw new Error(`Failed to fetch schools: ${error.message}`);
    }

    return data ? data.map(mapRowToSchool) : [];
  } catch (error) {
    console.error('Error in getSchools:', error);
    throw error;
  }
};

export const getSchool = async (id: string): Promise<School | null> => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching school:', error);
      throw new Error(`Failed to fetch school: ${error.message}`);
    }

    return data ? mapRowToSchool(data) : null;
  } catch (error) {
    console.error('Error in getSchool:', error);
    throw error;
  }
};

export const createSchool = async (schoolData: Omit<School, 'id' | 'created_at' | 'updated_at'>): Promise<School> => {
  try {
    const insertData = mapSchoolToInsert(schoolData);
    
    // Use insert for creating new schools (not upsert)
    const { data, error } = await supabase
      .from('schools')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating school:', error);
      throw new Error(`Failed to create school: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from school creation');
    }

    return mapRowToSchool(data);
  } catch (error) {
    console.error('Error in createSchool:', error);
    throw error;
  }
};

export const updateSchool = async (id: string, schoolData: Partial<School>): Promise<School> => {
  try {
    const updateData = mapSchoolToUpdate(schoolData);
    
    const { data, error } = await supabase
      .from('schools')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating school:', error);
      throw new Error(`Failed to update school: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from school update');
    }

    return mapRowToSchool(data);
  } catch (error) {
    console.error('Error in updateSchool:', error);
    throw error;
  }
};

export const deleteSchool = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('schools')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting school:', error);
      throw new Error(`Failed to delete school: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteSchool:', error);
    throw error;
  }
};

export const getActiveSchools = async (): Promise<School[]> => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active schools:', error);
      throw new Error(`Failed to fetch active schools: ${error.message}`);
    }

    return data ? data.map(mapRowToSchool) : [];
  } catch (error) {
    console.error('Error in getActiveSchools:', error);
    throw error;
  }
};

export default {
  getSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  getActiveSchools
};