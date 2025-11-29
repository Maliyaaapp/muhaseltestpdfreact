import { v4 as uuidv4 } from 'uuid';

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

// Helper functions for localStorage
const getSchoolsFromStorage = (): School[] => {
  try {
    const schools = localStorage.getItem('schools');
    return schools ? JSON.parse(schools) : [];
  } catch (e) {
    console.error('Error parsing schools from localStorage:', e);
    return [];
  }
};

const saveSchoolsToStorage = (schools: School[]): void => {
  try {
    localStorage.setItem('schools', JSON.stringify(schools));
  } catch (e) {
    console.error('Error saving schools to localStorage:', e);
  }
};

export const getSchools = async (): Promise<School[]> => {
  try {
    return getSchoolsFromStorage();
  } catch (error) {
    console.error('Error getting schools:', error);
    throw error;
  }
};

export const getSchool = async (id: string): Promise<School | null> => {
  try {
    const schools = getSchoolsFromStorage();
    return schools.find(s => s.id === id) || null;
  } catch (error) {
    console.error('Error getting school:', error);
    throw error;
  }
};

export const createSchool = async (schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'>): Promise<School> => {
  try {
    const schools = getSchoolsFromStorage();
    const now = new Date().toISOString();
    
    const newSchool: School = {
      id: uuidv4(),
      ...schoolData,
      createdAt: now,
      updatedAt: now
    };
    
    schools.push(newSchool);
    saveSchoolsToStorage(schools);
    
    return newSchool;
  } catch (error) {
    console.error('Error creating school:', error);
    throw error;
  }
};

export const updateSchool = async (id: string, schoolData: Partial<School>): Promise<School> => {
  try {
    const schools = getSchoolsFromStorage();
    const schoolIndex = schools.findIndex(s => s.id === id);
    
    if (schoolIndex === -1) {
      throw new Error('School not found');
    }
    
    // Update the school
    schools[schoolIndex] = {
      ...schools[schoolIndex],
      ...schoolData,
      updatedAt: new Date().toISOString()
    };
    
    saveSchoolsToStorage(schools);
    
    return schools[schoolIndex];
  } catch (error) {
    console.error('Error updating school:', error);
    throw error;
  }
};

export const deleteSchool = async (id: string): Promise<void> => {
  try {
    const schools = getSchoolsFromStorage();
    const filteredSchools = schools.filter(s => s.id !== id);
    
    saveSchoolsToStorage(filteredSchools);
  } catch (error) {
    console.error('Error deleting school:', error);
    throw error;
  }
};

export const getActiveSchools = async (): Promise<School[]> => {
  try {
    const schools = getSchoolsFromStorage();
    return schools.filter(s => s.active);
  } catch (error) {
    console.error('Error getting active schools:', error);
    throw error;
  }
};