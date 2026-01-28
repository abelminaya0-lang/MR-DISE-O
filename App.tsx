
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
    ctaText: '¡Pide Ahora!',
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
      setError("Primero sube la foto de tu producto.");
      return;
    }
    if (step === 2 && logoImages.length === 0) {
      setError("Sube tu logo para obtener tus colores.");
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
      setError("Error de conexión con el motor de diseño. Revisa tu API Key.");
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

  const brandColor = restaurantInfo.brandColor || '#9333ea';

  return (
    <div className="flex min-h-screen bg-black text-white font-['Inter'] selection:bg-purple-500/30">
      {/* SIDEBAR */}
      <div className="w-80 border-r border-white/5 bg-[#030303] p-10 flex flex-col shrink-0">
        <div className="flex items-center gap-4 mb-20 group cursor-default">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white italic shadow-lg transition-all group-hover:rotate-6" 
            style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #db2777 100%)` }}
          >
            MR
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter">MR DISEÑO</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Gastro AI Studio</p>
          </div>
        </div>

        <div className="space-y-6 flex-1">
          {[
            { n: 1, l: "Producto", d: "Foto real" },
            { n: 2, l: "Identidad", d: "Logo y Colores" },
            { n: 3, l: "Estilo", d: "Inspiración" },
            { n: 4, l: "Contenido", d: "Datos finales" },
            { n: 5, l: "Formato", d: "Redes Sociales" }
          ].map((item) => (
            <div key={item.n} className={`flex items-center gap-5 p-4 rounded-3xl transition-all duration-500 ${step === item.n ? 'bg-white/5 border border-white/10 shadow-xl' : 'opacity-20'}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black ${step === item.n ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>{item.n}</div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest">{item.l}</span>
                <span className="text-[10px] text-gray-500 font-medium">{item.d}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-10 border-t border-white/5">
           <button onClick={handleSelectKey} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${isKeySelected ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse'}`}>
             {isKeySelected ? "✓ IA CONECTADA" : "⚿ CONFIGURAR API"}
           </button>
        </div>
      </div>

      {/* ÁREA DE TRABAJO */}
      <main className="flex-1 p-20 overflow-y-auto no-scrollbar relative bg-[#010101]">
        <div className="max-w-4xl mx-auto">
          
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em] mb-4 block">Fase 01 / Producción</span>
              <h2 className="text-6xl font-black mb-6 italic tracking-tight">TU MEJOR <span className="text-white/20">PLATO</span></h2>
              <p className="text-gray-400 mb-14 text-xl font-medium leading-relaxed max-w-2xl">Sube la foto del producto que quieres vender. Nuestro motor AI se encargará de iluminarlo y posicionarlo como en una revista.</p>
              
              <div className="bg-[#080808] p-16 rounded-[4rem] border border-white/5 shadow-2xl group transition-all hover:border-white/10">
                 <ImageUploader label="" images={productImages} setImages={setProductImages} maxImages={1} description="Click para subir la foto principal" />
              </div>

              <div className="mt-16 flex justify-end">
                <button onClick={nextStep} className="px-14 py-7 bg-white text-black font-black rounded-3xl hover:scale-105 transition-all flex items-center gap-4 group shadow-2xl active:scale-95">
                  SIGUIENTE: SUBIR LOGO
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-700">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em] mb-4 block">Fase 02 / Branding</span>
              <h2 className="text-6xl font-black mb-6 italic tracking-tight">TU <span className="text-white/20">MARCA</span></h2>
              <p className="text-gray-400 mb-14 text-xl font-medium">Extraeremos los colores de tu logotipo para que el diseño final sea coherente con tu negocio.</p>
              
              <div className="bg-[#080808] p-16 rounded-[4rem] border border-white/5 shadow-2xl space-y-12">
                 <ImageUploader label="" images={logoImages} setImages={setLogoImages} maxImages={1} description="Sube tu logo (PNG transparente recomendado)" />
                 
                 {status === GenerationStatus.BRANDING ? (
                    <div className="flex items-center gap-5 p-8 bg-purple-500/5 rounded-3xl border border-purple-500/10">
                       <svg className="animate-spin h-7 w-7 text-purple-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       <span className="font-black text-xs uppercase tracking-widest text-purple-400 animate-pulse">Analizando colores de marca...</span>
                    </div>
                 ) : restaurantInfo.brandColor && (
                    <div className="flex items-center gap-8 p-10 bg-white/5 rounded-[3rem] border border-white/10 animate-in zoom-in-95 duration-500">
                       <div className="w-24 h-24 rounded-[2rem] shadow-2xl flex items-center justify-center transition-transform hover:scale-110" style={{ backgroundColor: restaurantInfo.brandColor }}>
                          <span className="text-white text-[10px] font-black bg-black/30 px-3 py-1.5 rounded-xl backdrop-blur-md">COL</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Color Primario Detectado</p>
                          <p className="font-mono text-3xl font-black tracking-tighter">{restaurantInfo.brandColor}</p>
                       </div>
                    </div>
                 )}
              </div>

              <div className="mt-16 flex justify-between">
                <button onClick={prevStep} className="px-12 py-7 bg-white/5 text-white font-black rounded-3xl hover:bg-white/10 transition-all border border-white/5">ATRÁS</button>
                <button onClick={nextStep} className="px-14 py-7 bg-white text-black font-black rounded-3xl hover:scale-105 transition-all shadow-2xl">SIGUIENTE</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-700">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em] mb-4 block">Fase 03 / Dirección</span>
              <h2 className="text-6xl font-black mb-6 italic tracking-tight">TU <span className="text-white/20">VIBE</span></h2>
              <p className="text-gray-400 mb-14 text-xl font-medium">Sube una referencia que te inspire o deja que nuestra IA cree algo totalmente original.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="bg-[#080808] p-12 rounded-[3.5rem] border border-white/5 flex flex-col items-center">
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-8 tracking-[0.3em]">Referencia Propia</p>
                    <ImageUploader label="" images={referenceImage} setImages={setReferenceImage} maxImages={1} />
                 </div>
                 
                 <div className="bg-[#080808] p-12 rounded-[3.5rem] border border-white/5">
                    <p className="text-[10px] font-black uppercase text-gray-500 mb-8 tracking-[0.3em] text-center">Presets de Estilo</p>
                    <div className="grid grid-cols-3 gap-4">
                       {templates.map((url, i) => (
                         <div 
                           key={i} 
                           onClick={() => setReferenceImage([url])}
                           className={`aspect-[9/16] rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300 ${referenceImage[0] === url ? 'border-purple-500 scale-95 shadow-xl shadow-purple-500/20' : 'border-transparent opacity-30 hover:opacity-100 hover:scale-105'}`}
                         >
                           <img src={url} className="w-full h-full object-cover" />
                         </div>
                       ))}
                       <button 
                        onClick={() => setReferenceImage([])} 
                        className={`aspect-[9/16] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-[9px] font-black uppercase text-center p-4 transition-all ${referenceImage.length === 0 ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-white/10 text-gray-700 hover:text-white hover:border-white/30'}`}
                       >
                          MODO <br/> CREATIVO
                       </button>
                    </div>
                 </div>
              </div>

              <div className="mt-16 flex justify-between">
                <button onClick={prevStep} className="px-12 py-7 bg-white/5 text-white font-black rounded-3xl hover:bg-white/10 transition-all border border-white/5">ATRÁS</button>
                <button onClick={nextStep} className="px-14 py-7 bg-white text-black font-black rounded-3xl hover:scale-105 transition-all shadow-2xl">SIGUIENTE</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-700">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em] mb-4 block">Fase 04 / Contenido</span>
              <h2 className="text-6xl font-black mb-6 italic tracking-tight">DATOS <span className="text-white/20">REALES</span></h2>
              <p className="text-gray-400 mb-14 text-xl font-medium">Ingresa exactamente lo que quieres que aparezca. Sin inventos, solo lo que vende.</p>
              
              <div className="bg-[#080808] p-16 rounded-[4rem] border border-white/5 shadow-2xl grid grid-cols-1 md:grid-cols-2 gap-10">
                 <div className="space-y-10">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Nombre del Negocio</label>
                       <input type="text" value={restaurantInfo.name} onChange={e => setRestaurantInfo({...restaurantInfo, name: e.target.value})} className="w-full bg-white/5 p-7 rounded-[2rem] border border-white/10 outline-none focus:border-purple-500/50 transition-all font-bold text-lg" placeholder="Ej: Burguer House" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Producto Estrella</label>
                       <input type="text" value={restaurantInfo.product} onChange={e => setRestaurantInfo({...restaurantInfo, product: e.target.value})} className="w-full bg-white/5 p-7 rounded-[2rem] border border-white/10 outline-none focus:border-purple-500/50 transition-all font-bold text-lg" placeholder="Ej: Pizza Double Cheese" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Promoción de Impacto</label>
                       <input type="text" value={restaurantInfo.pricePromo} onChange={e => setRestaurantInfo({...restaurantInfo, pricePromo: e.target.value})} className="w-full bg-white/5 p-7 rounded-[2rem] border border-white/10 outline-none focus:border-purple-500/50 transition-all font-black text-purple-500 text-2xl" placeholder="Ej: $19.90 / 2x1 SOLO HOY" />
                    </div>
                 </div>
                 <div className="space-y-10">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">WhatsApp / Delivery</label>
                       <input type="text" value={restaurantInfo.phone} onChange={e => setRestaurantInfo({...restaurantInfo, phone: e.target.value})} className="w-full bg-white/5 p-7 rounded-[2rem] border border-white/10 outline-none focus:border-purple-500/50 transition-all font-bold" placeholder="Ej: +54 9 11 1234 5678" />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] ml-2">Llamada a la Acción</label>
                       <input type="text" value={restaurantInfo.ctaText} onChange={e => setRestaurantInfo({...restaurantInfo, ctaText: e.target.value})} className="w-full bg-white/5 p-7 rounded-[2rem] border border-white/10 outline-none focus:border-purple-500/50 transition-all font-bold italic" placeholder="Ej: ¡Pide por Rappi Ahora!" />
                    </div>
                    <div className="p-10 bg-gradient-to-br from-purple-950/20 to-transparent rounded-[2.5rem] border border-purple-500/10 flex items-center gap-5">
                       <div className="w-3 h-3 rounded-full bg-purple-500 animate-ping"></div>
                       <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-relaxed">Diseño optimizado para <br/><span className="text-white">Alta Conversión</span></p>
                    </div>
                 </div>
              </div>

              <div className="mt-16 flex justify-between">
                <button onClick={prevStep} className="px-12 py-7 bg-white/5 text-white font-black rounded-3xl hover:bg-white/10 transition-all">ATRÁS</button>
                <button onClick={nextStep} className="px-14 py-7 bg-white text-black font-black rounded-3xl hover:scale-105 transition-all shadow-2xl">CASI LISTO</button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-700 text-center">
              <span className="text-[10px] font-black text-purple-500 uppercase tracking-[0.4em] mb-4 block">Fase 05 / Exportación</span>
              <h2 className="text-6xl font-black mb-8 italic tracking-tight">EL <span className="text-white/20">LIENZO</span></h2>
              <p className="text-gray-400 mb-20 text-xl font-medium max-w-2xl mx-auto leading-relaxed">¿Para qué red social quieres tu anuncio? Ajustaremos las dimensiones de forma automática.</p>
              
              <div className="flex justify-center gap-12 mb-24">
                 <button onClick={() => setAspectRatio('1:1')} className={`group relative w-80 p-14 rounded-[4.5rem] border-2 transition-all duration-700 ${aspectRatio === '1:1' ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_50px_rgba(147,51,234,0.1)]' : 'border-white/5 hover:border-white/10 hover:scale-105'}`}>
                    <div className="aspect-square bg-white/10 rounded-3xl mb-10 flex items-center justify-center text-[11px] font-black group-hover:bg-white/20 transition-all">POST FEED</div>
                    <p className="font-black text-base uppercase tracking-widest mb-1">Cuadrado (1:1)</p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Facebook & Instagram</p>
                 </button>
                 
                 <button onClick={() => setAspectRatio('9:16')} className={`group relative w-80 p-14 rounded-[4.5rem] border-2 transition-all duration-700 ${aspectRatio === '9:16' ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_50px_rgba(147,51,234,0.1)]' : 'border-white/5 hover:border-white/10 hover:scale-105'}`}>
                    <div className="aspect-[9/16] bg-white/10 rounded-3xl mb-10 mx-auto w-24 flex items-center justify-center text-[11px] font-black group-hover:bg-white/20 transition-all">FULL STORY</div>
                    <p className="font-black text-base uppercase tracking-widest mb-1">Vertical (9:16)</p>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Stories, Reels & TikTok</p>
                 </button>
              </div>

              <div className="max-w-xl mx-auto relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-[3rem] blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-gradient-x"></div>
                <button 
                  onClick={handleGenerate}
                  disabled={status === GenerationStatus.DESIGNING}
                  className="relative w-full py-11 bg-black border border-white/20 rounded-[3rem] font-black text-3xl flex items-center justify-center gap-6 transition-all active:scale-95 disabled:opacity-50"
                >
                  {status === GenerationStatus.DESIGNING ? (
                    <div className="flex items-center gap-5">
                       <svg className="animate-spin h-9 w-9 text-purple-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       <span className="animate-pulse tracking-widest text-2xl uppercase">Componiendo Diseño...</span>
                    </div>
                  ) : "DISEÑAR FLYER FINAL"}
                </button>
              </div>
              
              <button onClick={prevStep} className="mt-14 text-gray-600 font-black text-[10px] uppercase tracking-[0.5em] hover:text-white transition-colors">Modificar Detalles</button>
            </div>
          )}

          {step === 6 && generatedFlyer && (
            <div className="animate-in fade-in zoom-in-95 duration-1000 max-w-2xl mx-auto">
               <div className="bg-[#080808] p-14 rounded-[5.5rem] border border-white/5 shadow-[0_50px_100px_-30px_rgba(0,0,0,1)]">
                  <div className="flex justify-between items-center mb-14 px-8">
                     <div>
                        <h2 className="text-4xl font-black italic tracking-tighter">LISTO PARA <span className="text-purple-500">VENDER</span></h2>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mt-2">MR DISEÑO Studio Output</p>
                     </div>
                     <button onClick={() => setStep(1)} className="w-14 h-14 bg-white/5 rounded-3xl flex items-center justify-center text-gray-500 hover:text-white transition-all hover:bg-white/10">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                     </button>
                  </div>
                  
                  <div className={`rounded-[4rem] overflow-hidden border border-white/5 bg-black ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-square'} mb-16 shadow-2xl relative group cursor-crosshair`}>
                     <img src={generatedFlyer.url} className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" alt="Diseño Final" />
                     <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center p-14 text-center backdrop-blur-md">
                        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mb-8 text-green-500 border border-green-500/20">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <p className="text-3xl font-black italic mb-6 tracking-tight">¡Quedó Increíble!</p>
                        <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-xs">El diseño ha sido optimizado para resaltar los colores de tu marca y aumentar los clics en tus anuncios.</p>
                     </div>
                  </div>

                  <button 
                    onClick={() => downloadImage(generatedFlyer.url, `MR-STU-${restaurantInfo.product}.png`)}
                    className="w-full py-9 bg-white text-black font-black rounded-[3rem] text-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-5 shadow-3xl active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    DESCARGAR EN ALTA CALIDAD
                  </button>
               </div>
               
               <p className="text-center mt-20 text-gray-800 text-[11px] font-black uppercase tracking-[0.6em] animate-pulse">PROUDLY POWERED BY GEMINI NANO • 2024</p>
            </div>
          )}

          {error && (
            <div className="mt-14 p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] text-red-500 text-center font-black text-sm uppercase tracking-widest animate-in slide-in-from-top-6 duration-700">
              <span className="block mb-2 italic">HUBO UN CONTRATIEMPO</span>
              <span className="text-red-300/60 text-[11px] font-bold normal-case">{error}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
