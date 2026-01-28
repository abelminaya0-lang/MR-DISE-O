
import { GoogleGenAI, Type } from "@google/genai";
import { RestaurantInfo } from "../types";

interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

async function imageToPart(imageSource: string): Promise<ImagePart> {
  try {
    if (imageSource.startsWith('data:')) {
      const parts = imageSource.split(',');
      const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const data = parts[1];
      return { inlineData: { data, mimeType } };
    } else {
      const response = await fetch(imageSource);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return { inlineData: { data: base64, mimeType: blob.type } };
    }
  } catch (e) {
    console.error("Error en la conversión de imagen:", e);
    throw new Error("Error al procesar la imagen seleccionada.");
  }
}

export async function extractBrandColors(logoBase64: string): Promise<{ hex: string; vibe: string }> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const part = await imageToPart(logoBase64);

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        part,
        { text: "Analiza este logo. Devuelve un JSON: { \"hex\": \"#color_principal_vibrante\", \"vibe\": \"estilo\" }" }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hex: { type: Type.STRING },
          vibe: { type: Type.STRING }
        },
        required: ["hex", "vibe"]
      }
    }
  });

  try {
    return JSON.parse(response.text?.trim() || '{"hex":"#9333ea","vibe":"moderno"}');
  } catch {
    return { hex: '#9333ea', vibe: 'moderno' };
  }
}

export async function generateRestaurantFlyer(
  restaurantInfo: RestaurantInfo,
  productImages: string[], 
  referenceImage: string | null, 
  aspectRatio: '1:1' | '9:16'
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const productParts = await Promise.all(productImages.map(img => imageToPart(img)));
  const refPart = referenceImage ? await imageToPart(referenceImage) : null;
  
  let logoPart: ImagePart | null = null;
  if (restaurantInfo.logo) {
    logoPart = await imageToPart(restaurantInfo.logo);
  }

  const modelName = 'gemini-2.5-flash-image';

  const promptText = `
    ROL: Director Creativo de Agencia de Marketing Gastronómico.
    TAREAS DE DISEÑO:
    1. PROTAGONISMO: El producto de la foto real debe ser el centro visual, con iluminación mejorada y sombras realistas.
    2. TEXTOS REALES (MANDATORIO): 
       - Título: "${restaurantInfo.name}" (Tipografía Bold/Elegante).
       - Oferta: "${restaurantInfo.pricePromo}" (En un badge o tipografía gigante de impacto).
       - Producto: "${restaurantInfo.product}"
       - Contacto: "${restaurantInfo.phone || ''}"
       - Botón/CTA: "${restaurantInfo.ctaText || '¡Ordena Ya!'}"
    3. PALETA: Usa el color ${restaurantInfo.brandColor || '#9333ea'} para crear una atmósfera coherente.
    4. ESTILO: 
       ${refPart 
         ? 'Imita la composición, el uso de texturas y el estilo de la imagen de referencia adjunta.' 
         : 'Crea un diseño "Minimalista Premium" con degradados suaves, tipografía Sans Serif moderna y elementos gráficos limpios.'}
    5. CALIDAD: Evita textos borrosos. Genera una pieza final de nivel profesional para ${aspectRatio === '1:1' ? 'Post de Instagram' : 'Stories/TikTok'}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          ...productParts,
          ...(refPart ? [refPart] : []),
          ...(logoPart ? [logoPart] : []),
          { text: promptText }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio
        }
      }
    });

    let imageUrl = '';
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error('La IA no pudo renderizar el diseño.');
    return imageUrl;
  } catch (error: any) {
    console.error("Error en el motor de diseño:", error);
    throw error;
  }
}
