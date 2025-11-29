import { getImages } from '../services/unsplashApi';

export const loadSchoolImages = async (width = 800, height = 600) => {
  try {
    const images = await getImages({
      search_terms: 'Oman school building architecture',
      width,
      height,
      number_of_photos: 5
    });
    return images;
  } catch (error) {
    console.error('Error loading school images:', error);
    return [];
  }
};

export const loadLogoImages = async (width = 400, height = 400) => {
  try {
    const images = await getImages({
      search_terms: 'school logo education',
      width,
      height,
      number_of_photos: 5
    });
    return images;
  } catch (error) {
    console.error('Error loading logo images:', error);
    return [];
  }
};

export  const getFallbackImage = (type: 'school' | 'logo' = 'school') => {
  if (type === 'logo') {
    return 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwyfHxPbWFuJTIwc2Nob29sJTIwYnVpbGRpbmclMjBhcmNoaXRlY3R1cmV8ZW58MHx8fHwxNzQ2NTEwMTY0fDA&ixlib=rb-4.1.0&fit=fillmax&h=400&w=400';
  }
  return 'https://images.unsplash.com/photo-1680181013556-bcd12a4c5d23?ixid=M3w3MjUzNDh8MHwxfHNlYXJjaHwxfHxPbWFuJTIwc2Nob29sJTIwYnVpbGRpbmclMjBhcmNoaXRlY3R1cmV8ZW58MHx8fHwxNzQ2NTEwMTY0fDA&ixlib=rb-4.1.0&fit=fillmax&h=600&w=800';
}; 

export default {
  loadSchoolImages,
  loadLogoImages,
  getFallbackImage
};
 