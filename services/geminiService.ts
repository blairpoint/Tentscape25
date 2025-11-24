import { GoogleGenAI, Type } from "@google/genai";
import { Stage } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// Fallback data if API is not available
const MOCK_STAGES: Stage[] = [
  {
    id: 's1',
    name: 'Nebula Main Stage',
    type: 'MAIN',
    position: { x: 50, y: 50 },
    currentDJ: 'Solomon Key',
    nextDJ: 'Lunar Disciple',
    endTime: '22:30',
    vibe: 'Techno / House'
  },
  {
    id: 's2',
    name: 'Quantum Tent',
    type: 'TENT',
    position: { x: 20, y: 30 },
    currentDJ: 'Entropy',
    nextDJ: 'Maxwell Demon',
    endTime: '21:45',
    vibe: 'Drum & Bass'
  },
  {
    id: 's3',
    name: 'Zenith Garden',
    type: 'OUTDOOR',
    position: { x: 80, y: 70 },
    currentDJ: 'Floral Beats',
    nextDJ: 'Sun Tapes',
    endTime: '20:15',
    vibe: 'Ambient / Chill'
  }
];

export const generateFestivalData = async (): Promise<Stage[]> => {
  const ai = getClient();
  if (!ai) {
    console.warn("No API Key found, using mock data.");
    return MOCK_STAGES;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Generate a JSON list of 3 imaginary music festival stages with creative sci-fi names. Include current DJ, next DJ, end time, and stage coordinates (x,y between 10-90).',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['MAIN', 'TENT', 'OUTDOOR'] },
              position: {
                type: Type.OBJECT,
                properties: {
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER }
                }
              },
              currentDJ: { type: Type.STRING },
              nextDJ: { type: Type.STRING },
              endTime: { type: Type.STRING },
              vibe: { type: Type.STRING }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return MOCK_STAGES;
    return JSON.parse(text) as Stage[];

  } catch (error) {
    console.error("GenAI Error:", error);
    return MOCK_STAGES;
  }
};

export const chatAboutFestival = async (query: string, stages: Stage[]) => {
  const ai = getClient();
  if (!ai) return "I'm sorry, I can't connect to the festival network right now.";

  const stageContext = stages.map(s => `${s.name}: ${s.currentDJ} playing now until ${s.endTime}, then ${s.nextDJ}.`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are the AI assistant for TentScape festival. 
      Current Stage Status:
      ${stageContext}
      
      User Query: ${query}
      
      Keep it brief, helpful, and in the tone of a cool festival guide.`,
    });
    return response.text || "No response generated.";
  } catch (e) {
    return "Connection interference. Try again.";
  }
}
