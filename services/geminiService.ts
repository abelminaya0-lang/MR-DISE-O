
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
    throw new Error("No se pudo procesar la imagen.");
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
        { text: "Analiza este logo de restaurante. Devuelve un JSON estrictamente con este formato: { \"hex\": \"#color_principal\", \"vibe\": \"estilo_visual\" }" }
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
    ROL: Director de Arte Senior y Especialista en Marketing Gastronómico.
    OBJETIVO: Crear un flyer publicitario de ALTO IMPACTO y CALIDAD PREMIUM.
    
    ESTRUCTURA DE DATOS (OBLIGATORIO USAR):
    - NOMBRE DEL NEGOCIO: "${restaurantInfo.name}"
    - PRODUCTO A DESTACAR: "${restaurantInfo.product}" (Usa la foto real adjunta como elemento central).
    - PROMOCIÓN/PRECIO: "${restaurantInfo.pricePromo}" (Haz que resalte visualmente).
    - CONTACTO/TELÉFONO: "${restaurantInfo.phone || ''}"
    - LLAMADA A LA ACCIÓN: "${restaurantInfo.ctaText || '¡Pide ahora!'}"
    
    ESTILO VISUAL:
    - COLOR DE MARCA: ${restaurantInfo.brandColor || '#9333ea'}. Úsalo para acentos, fondos y tipografía.
    ${refPart ? '- INSPIRACIÓN: Sigue fielmente la composición y estética de la IMAGEN DE REFERENCIA.' : '- CREATIVIDAD LIBRE: Crea un diseño moderno, limpio y apetitoso que combine con el producto.'}
    
    REGLAS CRÍTICAS:
    1. NO USAR TEXTO GENÉRICO. Usa exactamente los datos proporcionados.
    2. El producto debe verse DELICIOSO. Mejora la iluminación y el entorno digitalmente.
    3. Tipografía: Moderna, legible y con jerarquía clara.
    4. Logo: Integra el logo adjunto de forma elegante.
    5. Formato: ${aspectRatio === '1:1' ? 'Cuadrado (Post)' : 'Vertical (Story)'}.
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

    if (!imageUrl) throw new Error('Error en el renderizado de la imagen.');
    return imageUrl;
  } catch (error: any) {
    console.error("Error en motor de diseño:", error);
    throw error;
  }
}
