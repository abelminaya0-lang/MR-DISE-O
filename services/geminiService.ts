
import { GoogleGenAI, Type } from "@google/genai";
import { RestaurantInfo } from "../types";

interface ImagePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

const getBase64Data = (base64: string) => {
  const parts = base64.split(',');
  if (parts.length < 2) return { data: '', mimeType: 'image/png' };
  const header = parts[0];
  const data = parts[1];
  const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
  return { data, mimeType };
};

export async function extractBrandColors(logoBase64: string): Promise<{ hex: string; vibe: string }> {
  // Create a new GoogleGenAI instance right before making an API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const { data, mimeType } = getBase64Data(logoBase64);

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data, mimeType } },
        { text: "Analiza este logo. Devuelve únicamente un objeto JSON con el color hexadecimal predominante (hex) y una palabra que describa el estilo visual (vibe) como 'moderno', 'rustico', 'elegante' o 'divertido'." }
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
    // Correct way to get text content is using the .text property and trimming it for robust parsing
    const text = response.text?.trim() || '{}';
    return JSON.parse(text);
  } catch {
    return { hex: '#f97316', vibe: 'moderno' };
  }
}

export async function generateRestaurantFlyer(
  restaurantInfo: RestaurantInfo,
  productImages: string[], 
  referenceImage: string, 
  aspectRatio: '1:1' | '9:16'
): Promise<string> {
  // Create a new GoogleGenAI instance right before making an API call to ensure current key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const productParts: ImagePart[] = productImages.map(img => {
    const { data, mimeType } = getBase64Data(img);
    return { inlineData: { data, mimeType } };
  });

  const refInfo = getBase64Data(referenceImage);
  const refPart: ImagePart = { inlineData: { data: refInfo.data, mimeType: refInfo.mimeType } };

  let logoPart: ImagePart | null = null;
  if (restaurantInfo.logo) {
    const lInfo = getBase64Data(restaurantInfo.logo);
    logoPart = { inlineData: { data: lInfo.data, mimeType: lInfo.mimeType } };
  }

  // Use high-quality model if requested, else default to gemini-2.5-flash-image
  const modelName = restaurantInfo.quality === 'ultra' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

  const prompt = `
    ACTÚA COMO UN DISEÑADOR GRÁFICO SENIOR DE MARKETING GASTRONÓMICO.
    
    ESTRECHA FIDELIDAD REQUERIDA: Debes REPLICAR EXACTAMENTE la composición, disposición de elementos, ángulos de cámara y esquema de iluminación de la IMAGEN DE REFERENCIA adjunta.
    
    OBJETIVO:
    - Sustituir los productos de la referencia por los PRODUCTOS DEL USUARIO adjuntos.
    - Integrar el LOGO DEL USUARIO en la esquina o posición donde el diseño sea más efectivo (o donde esté en la referencia).
    - Usar el color de marca "${restaurantInfo.brandColor || '#f97316'}" para elementos gráficos, formas o textos.
    
    DATOS DEL FLYER:
    - Nombre: "${restaurantInfo.name}"
    - Producto Principal: "${restaurantInfo.product}"
    - Oferta/Precio: "${restaurantInfo.pricePromo}"
    - Vibe de Marca: "${restaurantInfo.type}"
    
    INSTRUCCIONES CRÍTICAS:
    1. REPLICA la estructura de capas de la referencia (fondo, elementos decorativos, sombras).
    2. Mantén el estilo de las tipografías de la referencia pero aplicadas al contenido del usuario.
    3. Asegura que el producto "${restaurantInfo.product}" se vea extremadamente apetitoso y real, no generado por IA (estilo fotografía publicitaria).
    4. El diseño final debe ser una versión personalizada de la referencia, no una interpretación libre.
  `;

  const contents = {
    parts: [
      ...productParts,
      refPart,
      ...(logoPart ? [logoPart] : []),
      { text: prompt }
    ]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          // imageSize is only supported for gemini-3-pro-image-preview
          ...(restaurantInfo.quality === 'ultra' ? { imageSize: "4K" } : {})
        }
      }
    });

    let imageUrl = '';
    // Find the image part in candidates
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) throw new Error('No image returned from model');
    return imageUrl;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
