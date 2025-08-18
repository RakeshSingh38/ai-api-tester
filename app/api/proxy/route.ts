// app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method, data, authToken } = body;

    const headers: Record<string, string> = {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
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

    if (authToken) {
      headers['authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
    }

    console.log('Making request to:', url);
    console.log('Request data:', JSON.stringify(data, null, 2));

    // Handle streaming responses for completions endpoint
    if (url.includes('/chat/completions')) {
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(data)
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        return NextResponse.json(
          { message: `Request failed: ${response.status} - ${errorText}` },
          { status: response.status }
        );
      }

      // Check if it's a streaming response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/event-stream')) {
        // Handle Server-Sent Events
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let result = '';
        let chunks = [];

        if (reader) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              result += chunk;
              
              // Parse SSE data
              const lines = chunk.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6);
                  if (jsonStr.trim() !== '[DONE]' && jsonStr.trim() !== '') {
                    try {
                      const jsonData = JSON.parse(jsonStr);
                      chunks.push(jsonData);
                    } catch (e) {
                      // Skip invalid JSON
                    }
                  }
                }
              }
            }
            
            console.log('Streaming chunks received:', chunks.length);
            return NextResponse.json({ data: chunks });
          } catch (streamError) {
            console.error('Stream reading error:', streamError);
            return NextResponse.json({ data: chunks });
          }
        }
      } else {
        // Handle regular JSON response
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        try {
          const jsonData = JSON.parse(responseText);
          return NextResponse.json(jsonData);
        } catch {
          return NextResponse.json({ data: responseText });
        }
      }
    } else {
      // Handle regular requests (like chat creation)
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(data)
      });

      const responseText = await response.text();
      console.log('Regular response:', response.status, responseText);

      if (!response.ok) {
        return NextResponse.json(
          { message: `Request failed: ${response.status} - ${responseText}` },
          { status: response.status }
        );
      }

      try {
        const jsonData = JSON.parse(responseText);
        return NextResponse.json(jsonData);
      } catch {
        return NextResponse.json({ data: responseText });
      }
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { message: `Proxy server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
