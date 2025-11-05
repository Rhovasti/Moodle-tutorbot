// API service for communicating with backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Send a message to the backend and get a streaming response
 */
export async function* sendMessageStream(message: string): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for session
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.chunk) {
            yield data.chunk;
          } else if (data.error) {
            throw new Error(data.error);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Send a message and get a complete response (non-streaming)
 */
export async function sendMessage(message: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.message;
}

/**
 * Get chat history from the backend
 */
export async function getChatHistory(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.messages || [];
}

/**
 * Clear chat history
 */
export async function clearChatHistory(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}

/**
 * Get memories from the backend
 */
export async function getMemories(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/api/memories`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.memories || [];
}

/**
 * Save memories in bulk (single content string)
 */
export async function saveMemories(content: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/memories/bulk`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
}

/**
 * Create a new memory
 */
export async function createMemory(content: string, category?: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/memories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ content, category }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.memory;
}

/**
 * Update a memory
 */
export async function updateMemory(id: string, content: string, category?: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/memories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ content, category }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.memory;
}

/**
 * Delete a memory
 */
export async function deleteMemory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/memories/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
}
