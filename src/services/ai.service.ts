
import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from "@google/genai";

export interface Ingredient {
  name: string;
  amount?: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  prepTime: number;
  calories: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  dietaryTags: string[];
  ingredients: { name: string; amount: string; isMissing: boolean }[];
  steps: string[];
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AIService {
  private ai = new GoogleGenAI({ apiKey: (process as any).env.API_KEY });

  async analyzeFridge(base64Image: string): Promise<{ ingredients: string[], recipes: Recipe[] }> {
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      Analyze this fridge image. 
      1. Identify all visible food items and ingredients.
      2. Suggest 4 unique recipes that can be made using these items.
      3. For each recipe, list ingredients and indicate if they are likely missing from the fridge.
      4. Provide clear step-by-step instructions.
    `;

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Image,
      },
    };

    const response = await this.ai.models.generateContent({
      model,
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ingredients: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recipes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  prepTime: { type: Type.NUMBER },
                  calories: { type: Type.NUMBER },
                  difficulty: { type: Type.STRING },
                  dietaryTags: { type: Type.ARRAY, items: { type: Type.STRING } },
                  ingredients: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        amount: { type: Type.STRING },
                        isMissing: { type: Type.BOOLEAN }
                      }
                    }
                  },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  imageUrl: { type: Type.STRING }
                },
                required: ["id", "name", "prepTime", "calories", "difficulty", "ingredients", "steps"]
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text);
  }
}
