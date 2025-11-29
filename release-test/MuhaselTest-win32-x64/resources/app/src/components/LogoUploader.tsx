import React, { useRef, useState, useEffect } from 'react';

interface LogoUploaderProps {
  initialLogo?: string;
  onFileChange: (file: File | null) => void;
}

const LogoUploader: React.FC<LogoUploaderProps> = ({ initialLogo, onFileChange }) => {
  const [preview, setPreview] = useState<string | undefined>(initialLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Update preview if initialLogo changes
    setPreview(initialLogo);
  }, [initialLogo]);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (file) {
      // Create a preview for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Notify parent about the file change
      onFileChange(file);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onFileChange(null);
  };

  return (
    <div className="logo-uploader">
      <div className="flex flex-col items-center">
        {preview ? (
          <div className="relative mb-4">
            <img 
              src={preview} 
              alt="School Logo" 
              className="w-32 h-32 object-contain border rounded-md"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ) : (
          <div 
            className="w-32 h-32 border-2 border-dashed rounded-md flex items-center justify-center text-gray-400 mb-4 cursor-pointer"
            onClick={handleClick}
          >
            Add Logo
          </div>
        )}
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        
        <button
          type="button"
          onClick={handleClick}
          className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm"
        >
          {preview ? 'Change Logo' : 'Upload Logo'}
        </button>
      </div>
    </div>
  );
};

export default LogoUploader; 