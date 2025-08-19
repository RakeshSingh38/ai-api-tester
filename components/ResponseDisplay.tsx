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
      
      // Handle the new format with events array
      if (parsed.data && Array.isArray(parsed.data)) {
        const startEvent = parsed.data.find((event: any) => event.type === 'start');
        const contentEvents = parsed.data.filter((event: any) => event.type === 'content' && event.content);
        
        return (
          <div className="space-y-4">
            {/* Show start event */}
            {startEvent && (
              <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                <span className="text-blue-800 font-medium">
                  {startEvent.model.toUpperCase()} started generating response...
                </span>
              </div>
            )}
            
            {/* Show content */}
            {contentEvents.length > 0 ? (
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="prose prose-gray max-w-none">
                  {contentEvents.map((event: any, index: number) => (
                    <div key={index} className="mb-2">
                      <div className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
                        {event.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : startEvent ? (
              <div className="text-center py-8 text-gray-500">
                <div className="animate-pulse">
                  <div className="text-lg mb-2">🤖</div>
                  <div>Waiting for {startEvent.model} to respond...</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Processing response...
              </div>
            )}
            
            {/* Debug info */}
            {parsed.totalEvents && (
              <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-100 rounded">
                📊 Received {parsed.totalEvents} events from stream
              </div>
            )}
          </div>
        );
      }
      
      // Handle legacy single event format
      if (parsed.type) {
        if (parsed.type === 'start') {
          return (
            <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
              <span className="text-blue-800 font-medium">
                {parsed.model?.toUpperCase() || 'AI'} started generating...
              </span>
            </div>
          );
        }
        
        if (parsed.type === 'content' && parsed.content) {
          return (
            <div className="bg-gray-50 rounded-lg p-4 border">
              <div className="prose prose-gray max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
                  {parsed.content}
                </div>
              </div>
            </div>
          );
        }
      }
      
      // Fallback: show formatted JSON
      return (
        <pre className="whitespace-pre-wrap text-sm text-gray-600 font-mono bg-gray-50 p-4 rounded-lg border max-h-96 overflow-auto">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
      
    } catch (parseError) {
      // Handle raw text responses
      console.log('Failed to parse response as JSON:', parseError);
      
      // Try to extract events from raw stream text
      if (responseText.includes('data: {')) {
        const events: any[] = [];
        const lines = responseText.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const event = JSON.parse(jsonStr);
                events.push(event);
              } catch (e) {
                console.log('Failed to parse line:', jsonStr);
              }
            }
          }
        }
        
        if (events.length > 0) {
          const startEvent = events.find(e => e.type === 'start');
          const contentEvents = events.filter(e => e.type === 'content' && e.content);
          
          return (
            <div className="space-y-4">
              {startEvent && (
                <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                  <span className="text-blue-800 font-medium">
                    {startEvent.model?.toUpperCase() || 'AI'} started generating...
                  </span>
                </div>
              )}
              
              {contentEvents.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="prose prose-gray max-w-none">
                    {contentEvents.map((event: any, index: number) => (
                      <div key={index} className="mb-2">
                        <div className="whitespace-pre-wrap text-gray-800 text-sm leading-relaxed">
                          {event.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-500 mt-4 p-2 bg-gray-100 rounded">
                📊 Parsed {events.length} events from raw stream
              </div>
            </div>
          );
        }
      }
      
      // Last resort: show raw text
      return (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="whitespace-pre-wrap text-gray-800 text-sm">
            {responseText}
          </div>
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
