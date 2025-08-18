// components/ResponseDisplay.tsx
'use client';

import React from 'react';
import { ResponseType } from '@/lib/types';

interface ResponseDisplayProps {
  response: string;
  responseType: ResponseType;
  isLoading: boolean;
  model: string;
}

export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({
  response,
  responseType,
  isLoading,
  model
}) => {
  if (!response && !isLoading) return null;

  const formatResponse = (responseText: string) => {
    try {
      const parsed = JSON.parse(responseText);
      
      // Extract actual AI response content
      if (parsed.data && Array.isArray(parsed.data)) {
        const contentItems = parsed.data.filter((item: any) => item.type === 'content' && item.content);
        
        if (contentItems.length > 0) {
          return (
            <div className="space-y-3">
              {contentItems.map((item: any, index: number) => (
                <div key={index} className="prose prose-gray max-w-none">
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {item.content}
                  </div>
                </div>
              ))}
            </div>
          );
        }
      }
      
      // Fallback to formatted JSON
      return (
        <pre className="whitespace-pre-wrap text-sm text-gray-600 font-mono bg-gray-50 p-3 rounded">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return (
        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
          {responseText}
        </div>
      );
    }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
          AI Response
        </h3>
        {isLoading && (
          <div className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm font-medium">Generating...</span>
          </div>
        )}
      </div>
      
      <div 
        className={`rounded-xl border-2 overflow-hidden ${
          responseType === 'error' 
            ? 'bg-red-50 border-red-200' 
            : 'bg-white border-gray-200 shadow-sm'
        }`}
      >
        <div className={`px-4 py-2 text-sm font-medium ${
          responseType === 'error'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-50 text-gray-700'
        }`}>
          {responseType === 'error' ? '❌ Error' : `🤖 ${model.toUpperCase()}`}
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
              </div>
            </div>
          ) : responseType === 'error' ? (
            <div className="text-red-700 font-medium">
              {response}
            </div>
          ) : (
            formatResponse(response)
          )}
        </div>
      </div>
    </div>
  );
};
