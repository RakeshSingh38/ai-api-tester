// components/ApiTester.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { ResponseDisplay } from './ResponseDisplay';
import { 
  CompletionRequest,
  ChatRequest,
  ProxyRequest,
  ResponseType,
  AI_MODELS
} from '@/lib/types';
import { 
  generateUUID, 
  saveToLocalStorage, 
  getFromLocalStorage 
} from '@/lib/utils';

interface FormData {
  authToken: string;
  model: string;
  chatTitle: string;
  prompt: string;
}

export const ApiTester: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    authToken: '',
    model: 'deepseek',
    chatTitle: 'New Chat',
    prompt: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [responseType, setResponseType] = useState<ResponseType>('');
  const [currentChatId, setCurrentChatId] = useState<string>('');

  const baseUrl = 'https://api-v2.aifiesta.ai/api';

  useEffect(() => {
    const savedData = getFromLocalStorage('aiTesterData', formData);
    setFormData(savedData);
  }, []);

  const updateFormData = (updates: Partial<FormData>): void => {
    const newFormData = { ...formData, ...updates };
    setFormData(newFormData);
    saveToLocalStorage('aiTesterData', newFormData);
  };

  // Direct API calls (bypassing proxy for better reliability)
  const makeDirectRequest = async (url: string, data: any): Promise<any> => {
    const headers: Record<string, string> = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'authorization': formData.authToken.startsWith('Bearer ') ? formData.authToken : `Bearer ${formData.authToken}`,
      'content-type': 'application/json',
      'origin': 'https://chat.aifiesta.ai',
      'priority': 'u=1, i',
      'referer': 'https://chat.aifiesta.ai/',
      'sec-ch-ua': '"Not;A=Brand";v="99", "Brave";v="139", "Chromium";v="139"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'sec-gpc': '1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36'
    };

    console.log('Making direct request to:', url);
    console.log('Request data:', JSON.stringify(data, null, 2));

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data),
        mode: 'cors'
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Request failed: ${response.status} - ${errorText}`);
      }

      // Check if response is streamed or regular JSON
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/event-stream')) {
        // Handle Server-Sent Events (streaming)
        return await handleStreamingResponse(response);
      } else {
        // Handle regular JSON response
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        try {
          return JSON.parse(responseText);
        } catch {
          return { data: responseText };
        }
      }
    } catch (error) {
      console.error('Direct request error:', error);
      throw error;
    }
  };

  // Handle streaming responses
// Update the handleStreamingResponse function in components/ApiTester.tsx

const handleStreamingResponse = async (response: Response): Promise<any> => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let chunks: any[] = [];
  let fullText = '';
  
  if (!reader) {
    throw new Error('Unable to read streaming response');
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr !== '[DONE]' && jsonStr !== '') {
            try {
              const jsonData = JSON.parse(jsonStr);
              chunks.push(jsonData);
              console.log('Received streaming chunk:', jsonData);
              
              // Update UI in real-time if needed
              if (jsonData.type === 'content' && jsonData.content) {
                // You could add real-time updates here
                console.log('Content chunk:', jsonData.content);
              }
            } catch (e) {
              console.log('Skipping non-JSON chunk:', jsonStr);
            }
          }
        }
      }
    }
    
    console.log('Streaming complete. Total chunks:', chunks.length);
    console.log('Full response text:', fullText);
    
    // Return both the parsed chunks and the full text
    return { 
      data: chunks,
      fullText: fullText,
      totalChunks: chunks.length
    };
    
  } catch (streamError) {
    console.error('Stream reading error:', streamError);
    // Return whatever we have collected so far
    return { 
      data: chunks,
      fullText: fullText,
      error: streamError instanceof Error ? streamError.message : 'Stream error'
    };
  } finally {
    reader.releaseLock();
  }
};


  // Fallback to proxy if direct request fails
  const makeProxyRequest = async (url: string, data: any): Promise<any> => {
    const proxyRequest: ProxyRequest = {
      url,
      method: 'POST',
      data,
      authToken: formData.authToken
    };

    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proxyRequest)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Proxy request failed with status ${response.status}`);
    }

    return await response.json();
  };

  const createChat = async (title: string): Promise<string> => {
    const chatId = generateUUID();
    
    const payload: ChatRequest = {
      id: chatId,
      title: title,
      folderId: null
    };

    try {
      // Try direct request first
      await makeDirectRequest(`${baseUrl}/chat`, payload);
      console.log('Chat created successfully with ID:', chatId);
      return chatId;
    } catch (error) {
      console.log('Direct request failed, trying proxy...');
      // Fallback to proxy
      await makeProxyRequest(`${baseUrl}/chat`, payload);
      console.log('Chat created via proxy with ID:', chatId);
      return chatId;
    }
  };

  const sendCompletion = async (
    chatId: string, 
    promptText: string, 
    modelType: string
  ): Promise<any> => {
    const payload: CompletionRequest = {
      chatId: chatId,
      model: modelType,
      modelCount: 3,
      assetIds: [],
      type: "text",
      groupId: generateUUID(),
      prompt: promptText,
      assistantMessageId: generateUUID()
    };

    try {
      // Try direct request first
      const result = await makeDirectRequest(`${baseUrl}/chat/completions`, payload);
      console.log('Completion received:', result);
      return result;
    } catch (error) {
      console.log('Direct completion failed, trying proxy...');
      // Fallback to proxy
      const result = await makeProxyRequest(`${baseUrl}/chat/completions`, payload);
      console.log('Completion received via proxy:', result);
      return result;
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!formData.authToken || !formData.prompt) {
      setResponse('Please fill in Bearer Token and Prompt');
      setResponseType('error');
      return;
    }

    setIsLoading(true);
    setResponse('');
    setResponseType('');

    try {
      console.log('Starting request with data:', {
        model: formData.model,
        chatTitle: formData.chatTitle,
        promptLength: formData.prompt.length
      });

      // Step 1: Create chat
      const chatId = await createChat(formData.chatTitle);
      setCurrentChatId(chatId);
      
      // Step 2: Send completion
      const result = await sendCompletion(chatId, formData.prompt, formData.model);
      
      console.log('Final result:', result);
      setResponse(JSON.stringify(result, null, 2));
      setResponseType('success');
      
    } catch (error) {
      console.error('Request failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResponse(`Error: ${errorMessage}`);
      setResponseType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearResponse = (): void => {
    setResponse('');
    setResponseType('');
    setCurrentChatId('');
  };

  const selectedModel = AI_MODELS.find(m => m.value === formData.model);

  // Add this to your ApiTester component, right before the return statement

if (process.env.NODE_ENV === 'development' && response) {
  console.log('Raw response in component:', response);
  try {
    const parsed = JSON.parse(response);
    console.log('Parsed response:', parsed);
    if (parsed.data) {
      console.log('Response data array:', parsed.data);
      parsed.data.forEach((item: any, index: number) => {
        console.log(`Item ${index}:`, item);
      });
    }
  } catch (e) {
    console.log('Response is not JSON:', response.substring(0, 200));
  }
}


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <span className="text-2xl">🤖</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Chat Tester</h1>
          <p className="text-gray-600">Test multiple AI models with your own API access</p>
          {currentChatId && (
            <p className="text-xs text-gray-500 mt-2">
              Current Chat ID: <code className="bg-gray-100 px-2 py-1 rounded">{currentChatId}</code>
            </p>
          )}
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Bearer Token */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔑 Bearer Token *
                </label>
                <input
                  type="password"
                  value={formData.authToken}
                  onChange={(e) => updateFormData({ authToken: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors font-mono text-sm"
                  placeholder="Bearer eyJhbGciOiJIUzI1NiIs..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <span className="mr-1">💡</span>
                  Get this from AI Fiesta's Network tab in browser DevTools
                </p>
                {formData.authToken && (
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <span className="mr-1">✅</span>
                    Token loaded ({formData.authToken.length} characters)
                  </p>
                )}
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  🎯 AI Model
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {AI_MODELS.map((model) => (
                    <label
                      key={model.value}
                      className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        formData.model === model.value
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <input
                        type="radio"
                        name="model"
                        value={model.value}
                        checked={formData.model === model.value}
                        onChange={(e) => updateFormData({ model: e.target.value })}
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{model.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">{model.label}</div>
                          <div className="text-xs text-gray-500 flex items-center mt-1">
                            {model.category === 'premium' ? (
                              <span className="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                ⭐ Premium
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                ✨ Free
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {formData.model === model.value && (
                        <div className="absolute top-2 right-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Chat Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  💬 Chat Title
                </label>
                <input
                  type="text"
                  value={formData.chatTitle}
                  onChange={(e) => updateFormData({ chatTitle: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  placeholder="Enter chat title..."
                />
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ✍️ Your Prompt *
                </label>
                <textarea
                  value={formData.prompt}
                  onChange={(e) => updateFormData({ prompt: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  placeholder="Ask me anything... What would you like to know?"
                  required
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    Selected model: <span className="font-medium text-blue-600">{selectedModel?.label}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {formData.prompt.length} characters
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={isLoading || !formData.authToken || !formData.prompt}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Generating Response...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className="mr-2">🚀</span>
                      Send to {selectedModel?.label}
                    </div>
                  )}
                </button>
                
                {(response || isLoading) && (
                  <button
                    type="button"
                    onClick={clearResponse}
                    className="px-6 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Response Display */}
        <ResponseDisplay 
          response={response}
          responseType={responseType}
          isLoading={isLoading}
          model={selectedModel?.label || formData.model}
        />
        
        {/* Debug Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-semibold text-gray-700 mb-2">Debug Info:</h4>
            <pre className="text-xs text-gray-600">
              {JSON.stringify({
                model: formData.model,
                hasToken: !!formData.authToken,
                promptLength: formData.prompt.length,
                currentChatId: currentChatId,
                isLoading: isLoading,
                responseType: responseType
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
