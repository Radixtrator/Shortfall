'use client';

import { useRef, useState } from 'react';

interface FileUploadProps {
  onUpload: (content: string, fileName: string) => void;
  label: string;
  accept?: string;
  id: string;
}

export default function FileUpload({ onUpload, label, accept = '.csv,.txt', id }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setFileName(file.name);
      onUpload(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
        ${isDragging 
          ? 'border-orange-400 bg-orange-500/10' 
	  : 'border-[#333333] hover:border-[#555555]'
        }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept={accept}
        className="hidden"
        id={id}
      />
      <div className="space-y-2">
        <svg
          className="mx-auto h-12 w-12 text-neutral-400"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M11.19 2.25c.78.01 1.52.48 1.81 1.25l5 11.95c.09.26.14.55.13.8a2.02 2.02 0 0 1-1.23 1.8L9.53 21.1c-.26.12-.53.15-.79.15A2 2 0 0 1 6.93 20L1.97 8.05c-.42-1.01.07-2.18 1.09-2.6l7.36-3.05c.25-.09.51-.15.77-.15m3.48 0h1.45a2 2 0 0 1 2 2v6.35zm5.46 1.54l1.34.57a1.99 1.99 0 0 1 1.09 2.6l-2.43 5.86zm-8.94.43L3.8 7.29L8.77 19.3l7.4-3.06zM8.65 8.54l3.23 2.41l-.44 4.01l-3.23-2.42z" />
        </svg>
        <div className="text-sm text-gray-300">
          <span className="font-semibold text-orange-400">{label}</span>
          <p className="mt-1">or drag and drop</p>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          CSV or TXT files
        </p>
        {fileName && (
          <p className="text-sm text-green-600 dark:text-green-400 mt-2">
            ✓ {fileName}
          </p>
        )}
      </div>
    </div>
  );
}
