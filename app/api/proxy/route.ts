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

    // Handle streaming responses for completions endpoint
    if (url.includes('/chat/completions')) {
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(data)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        return NextResponse.json(
          { message: `Request failed: ${response.status} - ${errorText}` },
          { status: response.status }
        );
      }

      // Read the entire streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullStreamText = '';
      let events: any[] = [];

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            fullStreamText += chunk;
            
            // Parse each line that starts with "data: "
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr && jsonStr !== '[DONE]') {
                  try {
                    const eventData = JSON.parse(jsonStr);
                    events.push(eventData);
                    console.log('Parsed event:', eventData);
                  } catch (e) {
                    console.log('Failed to parse:', jsonStr);
                  }
                }
              }
            }
          }
          
          console.log('Stream reading complete. Total events:', events.length);
          console.log('Full stream text:', fullStreamText);
          
          // Return all collected events
          return NextResponse.json({ 
            data: events,
            streamText: fullStreamText,
            totalEvents: events.length 
          });
          
        } catch (streamError) {
          console.error('Stream reading error:', streamError);
          return NextResponse.json({ 
            data: events,
            error: 'Stream interrupted',
            partialText: fullStreamText 
          });
        } finally {
          reader.releaseLock();
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
