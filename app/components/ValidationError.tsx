"use client";

import { AlertCircle } from "lucide-react";

interface ValidationErrorProps {
  errors: string[];
  show: boolean;
}

export default function ValidationError({ errors, show }: ValidationErrorProps) {
  if (!show || !errors || errors.length === 0) return null;

  return (
    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
      <div className="flex items-start space-x-2">
        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {errors.length === 1 ? (
            <p className="text-sm text-red-700">{errors[0]}</p>
          ) : (
            <ul className="text-sm text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
