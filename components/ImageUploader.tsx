
import React, { useRef } from 'react';

interface ImageUploaderProps {
  label: string;
  images: string[];
  setImages: (images: string[]) => void;
  maxImages?: number;
  description?: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  label, 
  images, 
  setImages, 
  maxImages = 1,
  description 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Cast FileList to File array to ensure type safety and avoid 'unknown' inference issues in certain TS environments
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string].slice(0, maxImages));
      };
      // Explicitly ensures file is treated as a Blob (File extends Blob)
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col">
        <label className="text-sm font-semibold text-gray-300 mb-1">{label}</label>
        {description && <p className="text-xs text-gray-500 mb-2">{description}</p>}
      </div>
      
      <div className="flex flex-wrap gap-4">
        {images.map((img, idx) => (
          <div key={idx} className="relative group w-32 h-32 rounded-xl overflow-hidden border border-purple-500/30">
            <img src={img} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => removeImage(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        
        {images.length < maxImages && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-xl hover:border-purple-500 hover:bg-purple-500/5 transition-all group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500 group-hover:text-purple-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs text-gray-500 group-hover:text-purple-400 font-medium">Subir</span>
          </button>
        )}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
        multiple={maxImages > 1}
      />
    </div>
  );
};

export default ImageUploader;
