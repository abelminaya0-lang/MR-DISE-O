
import React, { useState, useEffect } from 'react';
import { RestaurantInfo, GenerationStatus, GeneratedFlyer } from './types';
import ImageUploader from './components/ImageUploader';
import { generateRestaurantFlyer, extractBrandColors } from './services/geminiService';

const downloadImage = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>({
    name: '',
    type: 'Comida Rápida',
    targetAudience: 'popular',
    context: 'local',
    product: '',
    pricePromo: '',
    phone: '',
    ctaText: '¡Ordena hoy!',
    quality: 'ultra',
    brandColor: '#9333ea'
  });

  const [productImages, setProductImages] = useState<string[]>([]);
  const [referenceImage, setReferenceImage] = useState<string[]>([]);
  const [logoImages, setLogoImages] = useState<string[]>([]);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [generatedFlyer, setGeneratedFlyer] = useState<GeneratedFlyer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isKeySelected, setIsKeySelected] = useState<boolean>(false);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16'>('9:16');

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const selected = await window.aistudio.hasSelectedApiKey();
          setIsKeySelected(selected);
        }
      } catch (e) { console.error(e); }
    };
    checkKey();
  }, []);

  // Proceso automático del logo para obtener colores de marca
  useEffect(() => {
    const processLogo = async () => {
      if (logoImages.length > 0 && logoImages[0] !== restaurantInfo.logo) {
        setStatus(GenerationStatus.BRANDING);
        try {
          const result = await extractBrandColors(logoImages[0]);
          setRestaurantInfo(prev => ({
            ...prev,
            logo: logoImages[0],
            brandColor: result.hex
          }));
          setStatus(GenerationStatus.IDLE);
          setError(null);
        } catch (e) {
          console.error("No se pudo extraer el color", e);
          setStatus(GenerationStatus.IDLE);
        }
      }
    };
    processLogo();
  }, [logoImages]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setIsKeySelected(true);
    }
  };

  const nextStep = () => {
    if (step === 1 && productImages.length === 0) {
      setError("Necesito la foto de tu producto para empezar.");
      return;
    }
    if (step === 2 && logoImages.length === 0) {
      setError("Sube tu logo para que el diseño tenga tus colores.");
      return;
    }
    setError(null);
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  const handleGenerate = async () => {
    if (!isKeySelected && window.aistudio) {
      await handleSelectKey();
    }
    
    setError(null);
    setStatus(GenerationStatus.DESIGNING);

    try {
      const imageUrl = await generateRestaurantFlyer(
        restaurantInfo,
        productImages,
        referenceImage.length > 0 ? referenceImage[0] : null,
        aspectRatio
      );

      setGeneratedFlyer({ url: imageUrl, format: aspectRatio, description: 'Flyer Final' });
      setStatus(GenerationStatus.COMPLETED);
      setStep(6);
    } catch (err: any) {
      setError("Hubo un error en el servidor de diseño. Inténtalo de nuevo.");
      setStatus(GenerationStatus.ERROR);
    }
  };

  const templates = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&h=800&fit=crop",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&h=800&fit=crop",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&h=800&fit=crop",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=800&fit=crop",
    "https://images.unsplash.com/photo-1476224489421-38c584e8d1fb?w=500&h=800&fit=crop"
  ];

  return (
    <div className="flex min-h-screen bg-black text-white font-['Inter'] selection:bg-purple-500/30">
      {/* SIDEBAR: NAVEGACIÓN DE PASOS */}
      <div className="w-80 border-r border-white/5 bg-[#050505] p-10 flex flex-col shrink-0">
        <div className="flex items-center gap-4 mb-20 group">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white italic shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all group-hover:scale-110" style={{ background: `linear-gradient(135deg, ${restaurantInfo.brandColor || '#9333ea'} 0%, #db2777 100%)` }}>
            MR
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter">MR DISEÑO</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Estudio AI</p>
          </div>
        </div>

        <div className="space-y-6 flex-1">
          {[
            { n: 1, l: "Producto", d: "Foto del plato" },
            { n: 2, l: "Identidad", d: "Logo y Colores" },
            { n: 3, l: "Inspiración", d: "Estilo visual" },
            { n: 4, l: "Marketing", d: "Datos del flyer" },
            { n: 5, l: "Publicación", d: "Elegir formato" }
          ].map((item) => (
            <div key={item.n} className={`flex items-center gap-5 p-4 rounded-3xl transition-all ${step === item.n ? 'bg-white/5 border border-white/10 shadow-lg' : 'opacity-20'}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-inner ${step === item.n ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{item.n}</div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest">{item.l}</span>
                <span className="text-[10px] text-gray-500 font-medium">{item.d}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-10 border-t border-white/5">
           <button onClick={handleSelectKey} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isKeySelected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'}`}>
             {isKeySelected ? "✓ IA CONECTADA" : "⚿ CONFIGURAR API"}
           </button>
        </div>
      </div>

      {/* ÁREA DE TRABAJO */}
      <main className="flex-1 p-20 overflow-y-auto no-scrollbar relative bg-[#010101]">
        <div className="max-w-4xl mx-auto">
          
          {/* PASO 1: FOTO PRODUCTO */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-4 block">Fase de Producción</span>
              <h2 className="text-5xl font-black mb-6 italic tracking-tight">TU PRODUCTO <span className="text-white/20">ESTRELLA</span></h2>
              <p className="text-gray-400 mb-12 text-lg font-medium leading-relaxed">Sube la mejor foto de tu plato. No te preocupes por el fondo, nuestro motor de IA lo transformará en una pieza publicitaria de lujo.</p>
              
              <div className="bg-[#080808] p-16 rounded-[4rem] border border-white/5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                 <ImageUploader label="" images={productImages} setImages={setProductImages} maxImages={1} description="Click para seleccionar la foto del plato" />
              </div>

              <div className="mt-16 flex justify-end">
                <button onClick={nextStep} className="px-14 py-6 bg-white text-black font-black rounded-3xl hover:bg-gray-200 transition-all flex items-center gap-4 group shadow-xl shadow-white/5 active:scale-95">
                  PASO SIGUIENTE: LOGO
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* PASO 2: LOGO E IDENTIDAD */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-6 duration-500">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-4 block">Identidad Visual</span>
              <h2 className="text-5xl font-black mb-6 italic tracking-tight">TU LOGOTIPO</h2>
              <p className="text-gray-400 mb-12 text-lg font-medium">Extraeremos automáticamente tu paleta de colores para que el flyer sea 100% fiel a tu marca.</p>
              
              <div className="bg-[#080808] p-16 rounded-[4rem] border border-white/5 shadow-2xl space-y-10">
                 <ImageUploader label="" images={logoImages} setImages={setLogoImages} maxImages={1} description="Sube tu logo (PNG transparente preferido)" />
                 
                 {status === GenerationStatus.BRANDING ? (
                    <div className="flex items-center gap-4 text-purple-400 font-black animate-pulse text-sm uppercase tracking-widest p-6 bg-purple-500/5 rounded-3xl border border-purple-500/10">
                       <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       Analizando ADN de marca...
                    </div>
                 ) : restaurantInfo.brandColor && (
                    <div className="flex items-center gap-6 p-8 bg-white/5 rounded-[2.5rem] border border-white/10 animate-in zoom-in-95 duration-500">
                       <div className="w-20 h-20 rounded-3xl shadow-2xl flex items-center justify-center" style={{ backgroundColor: restaurantInfo.brandColor }}>
                          <span className="text-white text-[10px] font-black bg-black/20 px-2 py-1 rounded-lg">BRAND</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Color de Marca Identificado</p>
                          <p className="font-mono text-2xl font-black tracking-tighter">{restaurantInfo.brandColor}</p>
                       </div>
                    </div>
                 )}
              </div>

              <div className="mt-16 flex justify-between">
                <button onClick={prevStep} className="px-12 py-6 bg-white/5 text-white font-black rounded-3xl hover:bg-white/10 transition-all border border-white/5">ATRÁS</button>
                <button onClick={nextStep} className="px-14 py-6 bg-white text-black font-black rounded-3xl hover:bg-gray-200 transition-all active:scale-95 shadow-xl">CONTINUAR</button>
              </div>
            </div>
          )}

          {/* PASO 3: INSPIRACIÓN / REFERENCIA */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-6 duration-500">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-4 block">Dirección de Arte</span>
              <h2 className="text-5xl font-black mb-6 italic tracking-tight">EL ESTILO <span className="text-white/20">VISUAL</span></h2>
              <p className="text-gray-400 mb-12 text-lg font-medium">Usa una referencia que te guste o deja que nuestra IA cree un diseño original único.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="bg-[#080808] p-12 rounded-[3.5rem] border border-white/5 hover:border-white/10 transition-all">
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-8 tracking-[0.2em] text-center">Sube tu Referencia</p>
                    <ImageUploader label="" images={referenceImage} setImages={setReferenceImage} maxImages={1} description="Opcional: Captura de pantalla de un diseño que te guste" />
                 </div>
                 
                 <div className="bg-[#080808] p-12 rounded-[3.5rem] border border-white/5">
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-8 tracking-[0.2em] text-center">Galería de Estilos</p>
                    <div className="grid grid-cols-3 gap-4">
                       {templates.map((url, i) => (
                         <div 
                           key={i} 
                           onClick={() => setReferenceImage([url])}
                           className={`aspect-[9/16] rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300 ${referenceImage[0] === url ? 'border-purple-500 scale-95 shadow-[0_0_20px_rgba(147,51,234,0.4)]' : 'border-transparent opacity-40 hover:opacity-100 hover:scale-105'}`}
                         >
                           <img src={url} className="w-full h-full object-cover" alt="Templante" />
                         </div>
                       ))}
                       <button onClick={() => setReferenceImage([])} className={`aspect-[9/16] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-[8px] font-black uppercase text-center p-2 transition-all ${referenceImage.length === 0 ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-white/10 text-gray-600 hover:text-white hover:border-white/30'}`}>
                          CREATIVIDAD LIBRE
                       </button>
                    </div>
                 </div>
              </div>

              <div className="mt-16 flex justify-between">
                <button onClick={prevStep} className="px-12 py-6 bg-white/5 text-white font-black rounded-3xl hover:bg-white/10 transition-all border border-white/5">ATRÁS</button>
                <button onClick={nextStep} className="px-14 py-6 bg-white text-black font-black rounded-3xl hover:bg-gray-200 transition-all shadow-xl">CONTINUAR</button>
              </div>
            </div>
          )}

          {/* PASO 4: DATOS REALES (NO ARBITRARIOS) */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-6 duration-500">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-4 block">Estrategia de Venta</span>
              <h2 className="text-5xl font-black mb-6 italic tracking-tight">DATOS <span className="text-white/20">REALES</span></h2>
              <p className="text-gray-400 mb-12 text-lg font-medium">Ingresa el contenido exacto. Nuestra IA no inventará datos; usará exactamente lo que tú digas.</p>
              
              <div className="bg-[#080808] p-16 rounded-[4rem] border border-white/5 shadow-3xl grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-8">
                    <div className="group">
                       <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1 group-focus-within:text-purple-500 transition-colors">Nombre del Negocio</label>
                       <input type="text" value={restaurantInfo.name} onChange={e => setRestaurantInfo({...restaurantInfo, name: e.target.value})} className="w-full mt-3 bg-white/5 p-6 rounded-3xl border border-white/10 outline-none focus:border-purple-500/50 transition-all font-bold text-lg" placeholder="Ej: Gastro King" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Producto Estrella</label>
                       <input type="text" value={restaurantInfo.product} onChange={e => setRestaurantInfo({...restaurantInfo, product: e.target.value})} className="w-full mt-3 bg-white/5 p-6 rounded-3xl border border-white/10 outline-none focus:border-purple-500/50 transition-all font-bold text-lg" placeholder="Ej: Pizza Napolitana" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Promoción o Precio</label>
                       <input type="text" value={restaurantInfo.pricePromo} onChange={e => setRestaurantInfo({...restaurantInfo, pricePromo: e.target.value})} className="w-full mt-3 bg-white/5 p-6 rounded-3xl border border-white/10 outline-none focus:border-purple-500/50 transition-all font-black text-purple-500 text-xl" placeholder="Ej: Solo $12.99 / 2x1 Martes" />
                    </div>
                 </div>
                 <div className="space-y-8">
                    <div>
                       <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">WhatsApp de Pedidos</label>
                       <input type="text" value={restaurantInfo.phone} onChange={e => setRestaurantInfo({...restaurantInfo, phone: e.target.value})} className="w-full mt-3 bg-white/5 p-6 rounded-3xl border border-white/10 outline-none focus:border-purple-500/50 transition-all font-bold" placeholder="Ej: +54 9 11 0000 0000" />
                    </div>
                    <div>
                       <label className="text-[10px] font-black text-gray-600 uppercase tracking-widest ml-1">Llamada a la Acción</label>
                       <input type="text" value={restaurantInfo.ctaText} onChange={e => setRestaurantInfo({...restaurantInfo, ctaText: e.target.value})} className="w-full mt-3 bg-white/5 p-6 rounded-3xl border border-white/10 outline-none focus:border-purple-500/50 transition-all font-bold" placeholder="Ej: ¡Pide por Rappi ahora!" />
                    </div>
                    <div className="p-8 bg-purple-500/5 rounded-3xl border border-purple-500/10 flex items-center gap-4">
                       <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.8)]"></div>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Diseño optimizado para <span className="text-white">Conversión</span></p>
                    </div>
                 </div>
              </div>

              <div className="mt-16 flex justify-between">
                <button onClick={prevStep} className="px-12 py-6 bg-white/5 text-white font-black rounded-3xl hover:bg-white/10 transition-all">ATRÁS</button>
                <button onClick={nextStep} className="px-14 py-6 bg-white text-black font-black rounded-3xl hover:bg-gray-200 transition-all shadow-xl">CONTINUAR AL FINAL</button>
              </div>
            </div>
          )}

          {/* PASO 5: FORMATO Y GENERACIÓN */}
          {step === 5 && (
            <div className="animate-in fade-in slide-in-from-right-6 duration-500 text-center">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mb-4 block">Toque Final</span>
              <h2 className="text-5xl font-black mb-6 italic tracking-tight">EL FORMATO</h2>
              <p className="text-gray-400 mb-16 text-lg font-medium max-w-xl mx-auto">Selecciona dónde vas a publicar tu anuncio. Ajustaremos el lienzo automáticamente.</p>
              
              <div className="flex justify-center gap-10 mb-20">
                 <button onClick={() => setAspectRatio('1:1')} className={`group relative w-72 p-12 rounded-[4rem] border-2 transition-all duration-500 ${aspectRatio === '1:1' ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_40px_rgba(147,51,234,0.2)]' : 'border-white/5 hover:border-white/10'}`}>
                    <div className="aspect-square bg-white/10 rounded-3xl mb-8 flex items-center justify-center text-[10px] font-black group-hover:bg-white/20 transition-all shadow-inner">POST</div>
                    <p className="font-black text-sm uppercase tracking-widest mb-1">Cuadrado (1:1)</p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">Facebook / Instagram Feed</p>
                 </button>
                 
                 <button onClick={() => setAspectRatio('9:16')} className={`group relative w-72 p-12 rounded-[4rem] border-2 transition-all duration-500 ${aspectRatio === '9:16' ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_40px_rgba(147,51,234,0.2)]' : 'border-white/5 hover:border-white/10'}`}>
                    <div className="aspect-[9/16] bg-white/10 rounded-3xl mb-8 mx-auto w-24 flex items-center justify-center text-[10px] font-black group-hover:bg-white/20 transition-all shadow-inner">STORY</div>
                    <p className="font-black text-sm uppercase tracking-widest mb-1">Vertical (9:16)</p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tighter">Stories / Reels / TikTok</p>
                 </button>
              </div>

              <div className="max-w-md mx-auto relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-[2.5rem] blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                <button 
                  onClick={handleGenerate}
                  disabled={status === GenerationStatus.DESIGNING}
                  className="relative w-full py-10 bg-black border border-white/20 rounded-[2.5rem] font-black text-2xl flex items-center justify-center gap-5 transition-all active:scale-95 disabled:opacity-50"
                >
                  {status === GenerationStatus.DESIGNING ? (
                    <div className="flex items-center gap-4">
                       <svg className="animate-spin h-8 w-8 text-purple-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       <span className="animate-pulse tracking-widest">RENDERIZANDO...</span>
                    </div>
                  ) : "GENERAR MI FLYER PROFESIONAL"}
                </button>
              </div>
              
              <button onClick={prevStep} className="mt-12 text-gray-500 font-black text-[10px] uppercase tracking-[0.4em] hover:text-white transition-colors">Modificar Contenido</button>
            </div>
          )}

          {/* PASO 6: RESULTADO FINAL */}
          {step === 6 && generatedFlyer && (
            <div className="animate-in fade-in zoom-in-95 duration-1000 max-w-xl mx-auto">
               <div className="bg-[#080808] p-12 rounded-[5rem] border border-white/5 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)]">
                  <div className="flex justify-between items-center mb-12 px-6">
                     <div>
                        <h2 className="text-3xl font-black italic tracking-tighter">DISEÑO FINALIZADO</h2>
                        <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.3em] mt-1">Gastro AI Engine v2.5</p>
                     </div>
                     <button onClick={() => setStep(1)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-gray-500 hover:text-white transition-all hover:bg-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                     </button>
                  </div>
                  
                  <div className={`rounded-[3.5rem] overflow-hidden border border-white/5 bg-black ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'} mb-14 shadow-2xl relative group`}>
                     <img src={generatedFlyer.url} className="w-full h-full object-contain" alt="Resultado Final" />
                     <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center p-12 text-center backdrop-blur-sm">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 text-green-500 border border-green-500/30">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-2xl font-black italic mb-4">¿Te gusta el resultado?</p>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed">Este diseño ha sido optimizado con los datos de tu menú y tus colores de marca para asegurar la máxima conversión en redes sociales.</p>
                     </div>
                  </div>

                  <button 
                    onClick={() => downloadImage(generatedFlyer.url, `MR-DISEÑO-${restaurantInfo.product}.png`)}
                    className="w-full py-8 bg-white text-black font-black rounded-[2.5rem] text-xl hover:bg-gray-100 transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    DESCARGAR EN ALTA RESOLUCIÓN
                  </button>
               </div>
               
               <p className="text-center mt-16 text-gray-700 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">MR DISEÑO Studio Output • Proudly Made with Gemini</p>
            </div>
          )}

          {error && (
            <div className="mt-12 p-6 bg-red-500/5 border border-red-500/10 rounded-[2rem] text-red-500 text-center font-black text-xs uppercase tracking-widest animate-in fade-in slide-in-from-top-4 duration-500">
              <span className="block mb-1">¡UPS! ALGO SALIÓ MAL</span>
              <span className="text-red-300 opacity-60 text-[10px] font-medium">{error}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
