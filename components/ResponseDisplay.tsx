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

  const formatStreamingResponse = (responseText: string) => {
    try {
      const parsed = JSON.parse(responseText);
      
      // Handle streaming data format
      if (parsed.data && Array.isArray(parsed.data)) {
        const startItem = parsed.data.find((item: any) => item.type === 'start');
        const contentItems = parsed.data.filter((item: any) => item.type === 'content' && item.content);
        
        return (
          <div className="space-y-4">
            {/* Model Start Indicator */}
            {startItem && (
              <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-blue-800 font-medium">
                  {startItem.model.toUpperCase()} is generating response...
                </span>
              </div>
            )}
            
            {/* Content Items */}
            {contentItems.length > 0 ? (
              <div className="space-y-3">
                {contentItems.map((item: any, index: number) => (
                  <div key={index} className="prose prose-gray max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed text-sm">
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <div className="animate-pulse">Waiting for content...</div>
              </div>
            )}
          </div>
        );
      }
      
      // Handle single streaming event (like the start event)
      if (parsed.type === 'start') {
        return (
          <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-blue-800 font-medium">
              {parsed.model.toUpperCase()} started generating...
            </span>
          </div>
        );
      }
      
      if (parsed.type === 'content' && parsed.content) {
        return (
          <div className="prose prose-gray max-w-none">
            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
              {parsed.content}
            </div>
          </div>
        );
      }
      
      // Fallback to formatted JSON
      return (
        <pre className="whitespace-pre-wrap text-sm text-gray-600 font-mono bg-gray-50 p-4 rounded-lg border">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
      
    } catch {
      // Handle raw streaming response text
      if (responseText.includes('data: {')) {
        const lines = responseText.split('\n');
        const events = lines
          .filter(line => line.startsWith('data: '))
          .map(line => {
            try {
              return JSON.parse(line.slice(6));
            } catch {
              return null;
            }
          })
          .filter(Boolean);
          
        if (events.length > 0) {
          return (
            <div className="space-y-3">
              {events.map((event: any, index: number) => (
                <div key={index}>
                  {event.type === 'start' && (
                    <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                      <span className="text-blue-800 font-medium">
                        {event.model.toUpperCase()} started generating...
                      </span>
                    </div>
                  )}
                  {event.type === 'content' && event.content && (
                    <div className="prose prose-gray max-w-none">
                      <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                        {event.content}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        }
      }
      
      // Plain text fallback
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
          <div className="flex items-center text-blue-600 bg-blue-50 px-3 py-2 rounded-full">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
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
        <div className={`px-4 py-3 text-sm font-medium flex items-center ${
          responseType === 'error'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-50 text-gray-700'
        }`}>
          {responseType === 'error' ? (
            <>
              <span className="mr-2">❌</span>
              Error
            </>
          ) : (
            <>
              <span className="mr-2">🤖</span>
              {model.toUpperCase()}
            </>
          )}
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <div className="animate-pulse space-y-3">
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
            formatStreamingResponse(response)
          )}
        </div>
      </div>
    </div>
  );
};
