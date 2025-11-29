import hybridApi, { School as DataStoreSchool } from './hybridApi';
import { v4 as uuidv4 } from 'uuid';
import { shouldUseSupabase } from './supabase';
import * as supabaseSchoolService from './supabaseSchoolService';

export interface School {
  id: string;
  name: string;
  englishName?: string;
  email: string;
  phone: string;
  phoneWhatsapp: string;
  phoneCall: string;
  address: string;
  location: string;
  active: boolean;
  subscriptionStart: string;
  subscriptionEnd: string;
  logo: string;
  createdAt: string;
  updatedAt: string;
  payment?: number;
}

// Extended interface for school creation with logo file
export interface SchoolWithLogo extends Omit<School, 'id' | 'createdAt' | 'updatedAt'> {
  logoFile?: File;
}

// Helper function to convert a file to a data URL
const convertFileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to data URL'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

export const getSchools = async (): Promise<School[]> => {
  try {
    if (shouldUseSupabase()) {
      return await supabaseSchoolService.getSchools();
    } else {
      const response = await hybridApi.getSchools();
      if (!response.success) {
        throw new Error(response.error || 'Failed to get schools');
      }
      return response.data;
    }
  } catch (error) {
    console.error('Error getting schools:', error);
    // Fallback to localStorage if Supabase fails
    if (shouldUseSupabase()) {
      console.log('Falling back to localStorage');
      const response = await hybridApi.getSchools();
      if (!response.success) {
        throw new Error(response.error || 'Failed to get schools from localStorage');
      }
      return response.data;
    }
    throw error;
  }
};

export const getSchool = async (id: string): Promise<School | null> => {
  try {
    if (shouldUseSupabase()) {
      return await supabaseSchoolService.getSchool(id);
    } else {
      const response = await hybridApi.getSchool(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get school');
      }
      return response.data;
    }
  } catch (error) {
    console.error('Error getting school:', error);
    // Fallback to localStorage if Supabase fails
    if (shouldUseSupabase()) {
      console.log('Falling back to localStorage');
      const response = await hybridApi.getSchool(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get school from localStorage');
      }
      return response.data;
    }
    throw error;
  }
};

export const createSchool = async (schoolData: SchoolWithLogo): Promise<School> => {
  try {
    const now = new Date().toISOString();
    
    // Handle logo upload if a file is provided
    let logoUrl = schoolData.logo;
    if (schoolData.logoFile) {
      // Convert the file to a data URL
      logoUrl = await convertFileToDataURL(schoolData.logoFile);
    }

    // Create the new school object
    const { logoFile, ...schoolDataWithoutFiles } = schoolData;
    const newSchool: Omit<School, 'id' | 'createdAt' | 'updatedAt'> = {
      ...schoolDataWithoutFiles,
      phone: schoolDataWithoutFiles.phone || '',
      phoneWhatsapp: schoolDataWithoutFiles.phoneWhatsapp || '',
      phoneCall: schoolDataWithoutFiles.phoneCall || '',
      payment: schoolDataWithoutFiles.payment !== undefined ? schoolDataWithoutFiles.payment : 0,
      logo: logoUrl || ''
    };
    
    if (shouldUseSupabase()) {
      // Save to Supabase
      const supabaseSchool = {
        ...newSchool,
        phone_whatsapp: newSchool.phoneWhatsapp,
        phone_call: newSchool.phoneCall,
        subscription_start: newSchool.subscriptionStart,
        subscription_end: newSchool.subscriptionEnd,
        english_name: newSchool.englishName
      };
      const result = await supabaseSchoolService.createSchool(supabaseSchool);
      
      // Also save to localStorage for offline access
      const localSchool: School = {
        id: result.id,
        ...newSchool,
        createdAt: result.created_at || new Date().toISOString(),
        updatedAt: result.updated_at || new Date().toISOString()
      };
      const saveResponse = await hybridApi.saveSchool(localSchool);
      if (!saveResponse.success) {
        throw new Error(saveResponse.error || 'Failed to save school to local storage');
      }
      
      return localSchool;
    } else {
      // Save to localStorage only
      const localSchool: Partial<School> = {
        ...newSchool
      };
      const saveResponse = await hybridApi.saveSchool(localSchool as School);
      if (!saveResponse.success) {
        throw new Error(saveResponse.error || 'Failed to save school to local storage');
      }
      return saveResponse.data;
    }
  } catch (error) {
    console.error('Error creating school:', error);
    // Fallback to localStorage if Supabase fails
    if (shouldUseSupabase()) {
      console.log('Falling back to localStorage for school creation');
      const { logoFile, ...schoolDataWithoutFiles } = schoolData;
      let logoUrl = schoolData.logo;
      
      if (schoolData.logoFile) {
        logoUrl = await convertFileToDataURL(schoolData.logoFile);
      }
      
      const localSchool: Partial<School> = {
        ...schoolDataWithoutFiles,
        phone: schoolDataWithoutFiles.phone || '',
        phoneWhatsapp: schoolDataWithoutFiles.phoneWhatsapp || '',
        phoneCall: schoolDataWithoutFiles.phoneCall || '',
        payment: schoolDataWithoutFiles.payment !== undefined ? schoolDataWithoutFiles.payment : 0,
        logo: logoUrl || ''
      };
      const saveResponse = await hybridApi.saveSchool(localSchool as School);
      if (!saveResponse.success) {
        throw new Error(saveResponse.error || 'Failed to save school to local storage');
      }
      return saveResponse.data;
    }
    throw error;
  }
};

export const updateSchool = async (id: string, schoolData: SchoolWithLogo): Promise<School> => {
  try {
    // Get existing school
    const existingSchool = await getSchool(id);
    if (!existingSchool) {
      throw new Error('School not found');
    }
    
    // Handle logo upload if a file is provided
    let logoUrl = schoolData.logo;
    if (schoolData.logoFile) {
      // Convert the file to a data URL
      logoUrl = await convertFileToDataURL(schoolData.logoFile);
    }

    // Create the updated school object
    const { logoFile, ...schoolDataWithoutFiles } = schoolData;
    
    if (shouldUseSupabase()) {
      // Update in Supabase
      const supabaseUpdateData = {
        ...schoolDataWithoutFiles,
        phone_whatsapp: schoolDataWithoutFiles.phoneWhatsapp,
        phone_call: schoolDataWithoutFiles.phoneCall,
        subscription_start: schoolDataWithoutFiles.subscriptionStart,
        subscription_end: schoolDataWithoutFiles.subscriptionEnd,
        english_name: schoolDataWithoutFiles.englishName,
        logo: logoUrl || existingSchool.logo
      };
      
      const result = await supabaseSchoolService.updateSchool(id, supabaseUpdateData);
      
      // Also update localStorage for offline access
      const localSchool: School = {
        ...existingSchool,
        ...schoolDataWithoutFiles,
        logo: logoUrl || existingSchool.logo,
        updatedAt: result.updated_at
      };
      const saveResponse = await hybridApi.saveSchool(localSchool);
      if (!saveResponse.success) {
        throw new Error(saveResponse.error || 'Failed to save school to local storage');
      }
      
      return localSchool;
    } else {
      // Update localStorage only
      const updatedSchool: School = {
        ...existingSchool,
        ...schoolDataWithoutFiles,
        logo: logoUrl || existingSchool.logo,
        updatedAt: new Date().toISOString()
      };
      
      const saveResponse = await hybridApi.saveSchool(updatedSchool);
      if (!saveResponse.success) {
        throw new Error(saveResponse.error || 'Failed to save school to local storage');
      }
      return saveResponse.data;
    }
  } catch (error) {
    console.error('Error updating school:', error);
    // Fallback to localStorage if Supabase fails
    if (shouldUseSupabase()) {
      console.log('Falling back to localStorage for school update');
      const response = await hybridApi.getSchool(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to get school from localStorage');
      }
      const existingSchool = response.data;
      if (!existingSchool) {
        throw new Error('School not found');
      }
      
      let logoUrl = schoolData.logo;
      
      if (schoolData.logoFile) {
        logoUrl = await convertFileToDataURL(schoolData.logoFile);
      }
      
      const { logoFile, ...schoolDataWithoutFiles } = schoolData;
      const updatedSchool: School = {
        ...existingSchool,
        ...schoolDataWithoutFiles,
        logo: logoUrl || existingSchool.logo,
        updatedAt: new Date().toISOString()
      };
      
      const saveResponse = await hybridApi.saveSchool(updatedSchool);
      if (!saveResponse.success) {
        throw new Error(saveResponse.error || 'Failed to save school to local storage');
      }
      return saveResponse.data;
    }
    throw error;
  }
};

export const deleteSchool = async (id: string): Promise<void> => {
  try {
    if (shouldUseSupabase()) {
      await supabaseSchoolService.deleteSchool(id);
      // Also delete from localStorage
      await hybridApi.deleteSchool(id);
    } else {
      await hybridApi.deleteSchool(id);
    }
  } catch (error) {
    console.error('Error deleting school:', error);
    // Fallback to localStorage if Supabase fails
    if (shouldUseSupabase()) {
      console.log('Falling back to localStorage for school deletion');
      await hybridApi.deleteSchool(id);
    } else {
      throw error;
    }
  }
};

export const getActiveSchools = async (): Promise<School[]> => {
  try {
    if (shouldUseSupabase()) {
      return await supabaseSchoolService.getActiveSchools();
    } else {
      // Get all schools and filter for active ones
      const schools = await hybridApi.getSchools();
      return schools.filter(school => school.active);
    }
  } catch (error) {
    console.error('Error getting active schools:', error);
    // Fallback to localStorage if Supabase fails
    if (shouldUseSupabase()) {
      console.log('Falling back to localStorage for active schools');
      const schools = await hybridApi.getSchools();
      return schools.filter(school => school.active);
    }
    return [];
  }
};

// Helper function to update user accounts with school info
export const updateSchoolUsers = async (school: School): Promise<void> => {
  try {
    // Get accounts for this school
    const accounts = await hybridApi.getAccounts(school.id);
    
    // Update each account with the latest school info
    for (const account of accounts) {
      const updatedAccount = {
        ...account,
        schoolName: school.name,
        schoolLogo: school.logo,
        schoolEmail: school.email,
        schoolPhone: school.phone,
        schoolPhoneWhatsapp: school.phoneWhatsapp || school.phone,
        schoolPhoneCall: school.phoneCall || school.phone,
        schoolAddress: school.address
      };
      
      // Save the updated account
      await hybridApi.saveAccount(updatedAccount);
    }
  } catch (error) {
    console.error('Error updating school users:', error);
  }
};

export default {
  getSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool
};