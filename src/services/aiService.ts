import type { AIResponse } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const AI_PROMPT = `You are an AI assistant for a project timeline management application. Your role is to help users create projects, add tasks, and answer questions about their projects or any general topics.

You can perform these actions:
1. create_project - Create a new project with name and description
2. add_task - Add a task to the current project with title, description, start date, and end date
3. answer_question - Answer general questions about project management, the application, or any other topics

IMPORTANT RULES:
- When user mentions creating a project (like "buat project HRIS APP" or "create HRIS APP project"), ALWAYS execute create_project action immediately
- Generate reasonable project descriptions based on the project name if not provided
- For dates, use ISO format (YYYY-MM-DD) and make reasonable assumptions for task duration if not specified
- Be proactive and execute actions rather than asking for more details
- Respond in Indonesian language in a helpful, natural, and conversational manner
- You can answer any general questions, not just project-related ones
- NEVER show JSON responses to users - always provide natural conversational responses

Respond with a JSON object containing:
- action: one of the actions above
- data: object with relevant fields (only for create_project and add_task)
- message: your natural conversational response to the user in Indonesian

Example responses:

For creating a project:
{
  "action": "create_project",
  "data": {
    "projectName": "HRIS APP",
    "projectDescription": "Human Resources Information System application development project"
  },
  "message": "Baik, saya akan membuatkan project HRIS APP untuk Anda. Project ini akan membantu dalam pengembangan sistem informasi HR."
}

For adding a task:
{
  "action": "add_task",
  "data": {
    "taskTitle": "Design Homepage",
    "taskDescription": "Create wireframes and mockups for the new homepage",
    "startDate": "2024-01-15",
    "endDate": "2024-01-20"
  },
  "message": "Saya akan menambahkan task design homepage ke project Anda. Task ini dijadwalkan dari 15-20 Januari 2024."
}

For answering questions:
{
  "action": "answer_question",
  "message": "Timeline project membantu Anda memvisualisasikan dependensi task dan memastikan deadline terpenuhi. Anda bisa beralih antara tampilan harian, mingguan, dan bulanan untuk mendapatkan perspektif berbeda tentang progress project."
}`;

export class AIService {
  private async callGeminiAPI(prompt: string): Promise<string> {
    if (!GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured');
    }

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${AI_PROMPT}\n\nUser: ${prompt}`
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: 'HARM_CATEGORY_HARASSMENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_HATE_SPEECH',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            },
            {
              category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold: 'BLOCK_MEDIUM_AND_ABOVE'
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        console.error('Gemini API Error:', errorData);
        
        // Handle specific error cases
        if (response.status === 429 || errorData.error?.code === 429) {
          throw new Error('QUOTA_EXCEEDED');
        }
        
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        console.error('No candidates in response:', data);
        throw new Error('No response candidates from Gemini API');
      }

      const candidate = data.candidates[0];
      
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('Invalid candidate structure:', candidate);
        throw new Error('Invalid response structure from Gemini API');
      }

      return candidate.content.parts[0].text;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  async processUserMessage(message: string, projectContext?: string): Promise<AIResponse> {
    console.log('Processing user message:', message); // Debug log
    
    // Graceful fallback when API key is not configured
    if (!this.validateAPIKey()) {
      console.log('API key validation failed'); // Debug log
      return {
        action: 'answer_question',
        message:
          'Fitur AI sedang offline karena kunci API belum dikonfigurasi. Anda tetap bisa mengelola project dan task seperti biasa. Silakan coba lagi nanti.'
      };
    }
    
    console.log('API key validated successfully'); // Debug log

    try {
      const contextualPrompt = projectContext 
        ? `Current project context: ${projectContext}\n\nUser message: ${message}`
        : message;

      const response = await this.callGeminiAPI(contextualPrompt);
      
      console.log('Raw AI Response:', response); // Debug log
      
      // Try to parse the response as JSON
      try {
        // Clean the response - remove any markdown code blocks or extra formatting
        let cleanResponse = response.trim();
        
        // Remove markdown code blocks if present
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Try to find JSON in the response
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
        }
        
        console.log('Cleaned Response:', cleanResponse); // Debug log
        
        const parsedResponse = JSON.parse(cleanResponse);
        
        // Validate the response structure
        if (!parsedResponse.action || !parsedResponse.message) {
          throw new Error('Invalid response structure');
        }

        // Validate action type
        const validActions = ['create_project', 'add_task', 'answer_question'];
        if (!validActions.includes(parsedResponse.action)) {
          throw new Error('Invalid action type');
        }

        console.log('Parsed AI Response:', parsedResponse); // Debug log
        return parsedResponse as AIResponse;
      } catch (parseError) {
        console.log('JSON Parse Error:', parseError); // Debug log
        // If JSON parsing fails, treat as a general question
        return {
          action: 'answer_question',
          message: response
        };
      }
    } catch (error) {
      console.error('AI Service error:', error);
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message === 'QUOTA_EXCEEDED') {
          return {
            action: 'answer_question',
            message: 'Maaf, quota harian untuk AI assistant sudah habis. Fitur AI akan tersedia kembali besok. Anda masih bisa mengelola project dan task secara manual.'
          };
        }
        
        if (error.message.includes('API key')) {
          return {
            action: 'answer_question',
            message: 'Fitur AI sedang offline karena konfigurasi API. Anda tetap bisa mengelola project dan task seperti biasa.'
          };
        }
      }
      
      // Return a fallback response for other errors
      return {
        action: 'answer_question',
        message: 'Maaf, saya sedang mengalami masalah teknis. Silakan coba lagi atau ajukan pertanyaan dengan cara yang berbeda.'
      };
    }
  }

  async generateProjectSummary(projectName: string, tasks: Array<{ title: string; description?: string; completed: boolean }>): Promise<string> {
    if (!this.validateAPIKey()) {
      return `Project: ${projectName}\n\nThis project contains ${tasks.length} tasks, with ${tasks.filter(t => t.completed).length} completed and ${tasks.filter(t => !t.completed).length} remaining.`;
    }

    try {
      const prompt = `Generate a brief, helpful summary for a project called "${projectName}" with the following tasks:\n\n${tasks.map(t => `- ${t.title}${t.description ? ': ' + t.description : ''} (${t.completed ? 'Completed' : 'Pending'})`).join('\n')}\n\nProvide a concise summary in Indonesian that highlights the project's progress, key tasks, and current status. Keep it under 100 words and make it conversational.`;
      
      const response = await this.callGeminiAPI(prompt);
      
      // Clean the response to remove any JSON formatting
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```[\s\S]*?```/g, '').trim();
      }
      
      // Remove any JSON-like structures
      if (cleanResponse.includes('{') && cleanResponse.includes('}')) {
        // Try to extract just the message content if it's wrapped in JSON
        const jsonMatch = cleanResponse.match(/"message"\s*:\s*"([^"]+)"/); 
        if (jsonMatch) {
          cleanResponse = jsonMatch[1];
        } else {
          // If it looks like JSON but we can't parse it, just remove JSON parts
          cleanResponse = cleanResponse.replace(/\{[\s\S]*?\}/g, '').trim();
        }
      }
      
      // If response is empty after cleaning, provide fallback
      if (!cleanResponse) {
        return `Project ${projectName} sedang berjalan dengan ${tasks.length} task. ${tasks.filter(t => t.completed).length} task sudah selesai dan ${tasks.filter(t => !t.completed).length} task masih dalam progress.`;
      }
      
      return cleanResponse;
    } catch (error) {
      console.error('Error generating project summary:', error);
      
      // Handle quota exceeded error
      if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
        return `Project ${projectName} sedang berjalan dengan ${tasks.length} task. ${tasks.filter(t => t.completed).length} task sudah selesai dan ${tasks.filter(t => !t.completed).length} task masih dalam progress. (AI summary tidak tersedia - quota harian habis)`;
      }
      
      return `Project ${projectName} sedang berjalan dengan ${tasks.length} task. ${tasks.filter(t => t.completed).length} task sudah selesai dan ${tasks.filter(t => !t.completed).length} task masih dalam progress.`;
    }
  }

  validateAPIKey(): boolean {
    const isValid = !!GEMINI_API_KEY && GEMINI_API_KEY.trim() !== '' && GEMINI_API_KEY !== 'your-api-key-here';
    console.log('API Key validation:', {
      exists: !!GEMINI_API_KEY,
      notEmpty: GEMINI_API_KEY?.trim() !== '',
      notPlaceholder: GEMINI_API_KEY !== 'your-api-key-here',
      isValid
    });
    return isValid;
  }
}

export const aiService = new AIService();