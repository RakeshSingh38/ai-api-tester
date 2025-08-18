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
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
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

    await makeProxyRequest(`${baseUrl}/chat`, payload);
    return chatId;
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

    return await makeProxyRequest(`${baseUrl}/chat/completions`, payload);
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
      const chatId = await createChat(formData.chatTitle);
      const result = await sendCompletion(chatId, formData.prompt, formData.model);
      
      setResponse(JSON.stringify(result, null, 2));
      setResponseType('success');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setResponse(errorMessage);
      setResponseType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModel = AI_MODELS.find(m => m.value === formData.model);

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
                <p className="text-xs text-gray-500 mt-1">
                  Get this from AI Fiesta's Network tab in browser DevTools
                </p>
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
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
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
                          <div className="text-xs text-gray-500 flex items-center">
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
                    Selected model: <span className="font-medium">{selectedModel?.label}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {formData.prompt.length} characters
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !formData.authToken || !formData.prompt}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
      </div>
    </div>
  );
};
