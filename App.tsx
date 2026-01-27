
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
  const [view, setView] = useState<'dashboard' | 'generator'>('dashboard');
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo>({
    name: '',
    type: 'cevicheria',
    targetAudience: 'popular',
    context: 'local',
    product: 'combo marino',
    pricePromo: '',
    quality: 'ultra',
    brandColor: '#9333ea'
  });

  const [productImages, setProductImages] = useState<string[]>([]);
  const [referenceImage, setReferenceImage] = useState<string[]>([]);
  const [logoImages, setLogoImages] = useState<string[]>([]);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [generatedFlyers, setGeneratedFlyers] = useState<GeneratedFlyer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isKeySelected, setIsKeySelected] = useState<boolean>(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isExtractingColor, setIsExtractingColor] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      try {
        const selected = await window.aistudio.hasSelectedApiKey();
        setIsKeySelected(selected);
      } catch (e) {
        console.error("Error checking API key status", e);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    const updateBranding = async () => {
      if (logoImages.length > 0 && logoImages[0] !== restaurantInfo.logo) {
        setIsExtractingColor(true);
        try {
          const result = await extractBrandColors(logoImages[0]);
          setRestaurantInfo(prev => ({
            ...prev,
            logo: logoImages[0],
            brandColor: result.hex
          }));
        } catch (e) {
          console.error("Branding extraction failed", e);
        } finally {
          setIsExtractingColor(false);
        }
      }
    };
    updateBranding();
  }, [logoImages]);

  const handleSelectKey = async () => {
    try {
      await window.aistudio.openSelectKey();
      setIsKeySelected(true);
      setError(null);
    } catch (e) {
      console.error("Key selection failed", e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRestaurantInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async () => {
    if (!productImages.length || !referenceImage.length) {
      setError("Por favor sube una imagen de producto y selecciona una plantilla.");
      return;
    }

    if (!isKeySelected) {
      await handleSelectKey();
    }

    setError(null);
    setStatus(GenerationStatus.ANALYZING);

    try {
      const formats: ('1:1' | '9:16')[] = ['9:16']; // Default for Stories as per screenshot
      const results: GeneratedFlyer[] = [];

      for (const format of formats) {
        setStatus(GenerationStatus.DESIGNING);
        const imageUrl = await generateRestaurantFlyer(
          restaurantInfo,
          productImages,
          referenceImage[0],
          format
        );
        results.push({ url: imageUrl, format, description: `Banner ${format}` });
      }

      setGeneratedFlyers(results);
      setStatus(GenerationStatus.COMPLETED);
    } catch (err: any) {
      setError("Error al generar el banner. Intenta de nuevo.");
      setStatus(GenerationStatus.ERROR);
    }
  };

  const templates = [
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?w=400&h=700&fit=crop",
    "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=400&h=700&fit=crop"
  ];

  const accentColor = restaurantInfo.brandColor || '#9333ea';

  const Sidebar = () => (
    <div className="w-64 min-h-screen bg-black border-r border-[#1a1a1a] flex flex-col p-4 shrink-0 overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-2 mb-10 px-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white italic" style={{ background: `linear-gradient(90deg, ${accentColor} 0%, #db2777 100%)` }}>
          MR
        </div>
        <span className="font-black text-sm tracking-tight">MR DISEÑO</span>
      </div>

      <nav className="flex-1 space-y-6">
        <div>
          <button onClick={() => setView('dashboard')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-semibold transition-all ${view === 'dashboard' ? 'bg-[#111] text-white' : 'text-gray-400 hover:bg-[#111]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Inicio
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black text-gray-500 uppercase px-2 tracking-widest">Modo Básico</p>
          <button onClick={() => setView('generator')} className={`flex items-center gap-3 w-full p-2.5 rounded-xl text-sm font-semibold transition-all ${view === 'generator' ? 'bg-[#111] text-white' : 'text-gray-400 hover:bg-[#111]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Generador de Banners
          </button>
          <button className="flex items-center gap-3 w-full p-2.5 rounded-xl hover:bg-[#111] text-sm text-gray-500 font-semibold opacity-50 cursor-not-allowed">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Generador de Landings
          </button>
        </div>

        <div className="space-y-4 pt-4">
          <p className="text-[10px] font-black text-gray-500 uppercase px-2 tracking-widest">Uso de Créditos</p>
          <div className="p-4 rounded-2xl border border-purple-500/40 bg-gradient-to-br from-[#111] to-[#000] relative overflow-hidden group">
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <p className="text-xs font-black">Actualiza tu plan</p>
                <p className="text-[10px] text-gray-500">Tu plan actual: Gratis</p>
              </div>
              <div className="p-2 bg-white/5 rounded-lg group-hover:bg-purple-500 transition-colors shadow-inner"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
            </div>
            <div className="absolute top-0 right-0 w-full h-full bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-purple-900/10 rounded-xl border border-white/5 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] text-purple-400 font-black flex items-center gap-2">
                   Créditos usados
                </span>
                <button className="text-[8px] text-gray-500 hover:text-gray-400 mt-1 flex items-center gap-1">
                   Ver estado de cuenta
                </button>
              </div>
              <span className="text-[10px] font-black bg-[#9333ea] text-white px-3 py-1 rounded-full">0/3</span>
            </div>
            
            <div className="p-3 bg-blue-900/10 rounded-xl border border-white/5 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] text-blue-400 font-black flex items-center gap-2">
                   Créditos Adicionales
                </span>
                <button className="text-[8px] text-gray-500 hover:text-gray-400 mt-1 flex items-center gap-1">
                   Ver estado de cuenta
                </button>
              </div>
              <span className="text-[10px] font-black bg-blue-500 text-white px-3 py-1 rounded-full">0</span>
            </div>

            <div className="p-3 bg-green-900/10 rounded-xl border border-white/5 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] text-green-400 font-black flex items-center gap-2">
                   Créditos Ganados
                </span>
                <button className="text-[8px] text-gray-500 hover:text-gray-400 mt-1 flex items-center gap-1">
                   Ver estado de cuenta
                </button>
              </div>
              <span className="text-[10px] font-black bg-green-500 text-white px-3 py-1 rounded-full">0</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
        <button className="w-full p-4 bg-purple-600/10 rounded-2xl flex items-center gap-3 group hover:bg-purple-600/20 transition-all">
          <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-white">Comparte y gana</p>
            <p className="text-[8px] text-gray-500">Obtén 10 créditos c/u</p>
          </div>
        </button>
        <div className="p-2 bg-[#111] rounded-2xl flex items-center justify-between border border-white/5">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 flex items-center justify-center font-black text-purple-400 text-xs">A</div>
          <button className="p-2 text-gray-500 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );

  const Dashboard = () => (
    <div className="flex-1 p-12 max-w-5xl animate-in fade-in duration-500">
      <header className="mb-14">
        <h1 className="text-4xl font-black mb-4 flex items-center gap-3">
          Bienvenido de nuevo, Abel! 👋
        </h1>
        <p className="text-gray-400 text-lg font-medium">¿Qué te gustaría crear hoy?</p>
      </header>

      <div className="grid grid-cols-2 gap-8">
        <div className="p-10 rounded-[2.5rem] bg-[#0d0d0d] border border-white/5 hover:border-purple-500/40 transition-all cursor-pointer group shadow-2xl relative overflow-hidden" onClick={() => setView('generator')}>
          <div className="w-14 h-14 rounded-2xl bg-purple-900/30 flex items-center justify-center mb-8 text-purple-400 group-hover:scale-110 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <h3 className="text-2xl font-black mb-3">Generador de Banners</h3>
          <p className="text-gray-500 text-sm mb-10 max-w-[240px]">Crea banners impresionantes para tus productos en segundos.</p>
          <button className="px-10 py-3.5 rounded-2xl purple-gradient font-black text-sm flex items-center gap-3 shadow-lg shadow-purple-500/20 active:scale-95 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Comenzar
          </button>
        </div>

        <div className="p-10 rounded-[2.5rem] bg-[#0d0d0d] border border-white/5 opacity-80 cursor-not-allowed group shadow-2xl relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] flex items-center justify-center mb-8 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <h3 className="text-2xl font-black mb-3">Generador de Landings</h3>
          <p className="text-gray-500 text-sm mb-10 max-w-[240px]">Construye landing pages de alta conversión automáticamente.</p>
          <button className="px-10 py-3.5 rounded-2xl bg-[#222] text-gray-500 font-black text-sm flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Comenzar
          </button>
        </div>
      </div>
    </div>
  );

  const Generator = () => (
    <div className="flex-1 p-10 max-w-6xl animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-5 mb-10">
        <button onClick={() => setView('dashboard')} className="p-4 bg-[#0d0d0d] border border-white/5 rounded-2xl hover:bg-[#111] transition-all text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </div>
        <div>
          <h2 className="text-2xl font-black tracking-tight">{restaurantInfo.product}</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{restaurantInfo.type}</p>
        </div>
      </div>

      <div className="p-10 rounded-[2.5rem] bg-[#0d0d0d] border border-white/5 space-y-10 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl purple-gradient">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
          </div>
          <div>
            <h3 className="font-black text-sm">Generador de Banners</h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Impulsado por MR DISEÑO AI</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span> 
              Imagen del Producto
            </p>
            <div className="h-[400px] border-2 border-dashed border-[#1a1a1a] rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center hover:border-purple-500/30 transition-all bg-[#0a0a0a]/50 relative group overflow-hidden">
              {productImages.length > 0 ? (
                <div className="relative w-full h-full p-4">
                  <img src={productImages[0]} className="w-full h-full object-contain rounded-3xl" />
                  <button onClick={() => setProductImages([])} className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                   <div className="w-20 h-20 bg-[#111] rounded-[2rem] border border-white/5 flex items-center justify-center mx-auto text-gray-600 group-hover:text-purple-500 transition-all">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   </div>
                   <ImageUploader label="" images={productImages} setImages={setProductImages} maxImages={1} description="Arrastra tu imagen aquí o busca archivos" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span> 
              Plantilla <span className="text-gray-600 font-medium normal-case ml-1">(selecciona de la galería)</span>
            </p>
            <div className="h-[340px] border border-[#1a1a1a] rounded-[2.5rem] flex flex-col items-center justify-center bg-[#0a0a0a] group hover:border-purple-500/30 transition-all overflow-hidden cursor-pointer relative" onClick={() => setIsGalleryOpen(true)}>
              {referenceImage.length > 0 ? (
                <img src={referenceImage[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="text-center group p-10">
                  <div className="w-16 h-16 bg-[#111] rounded-[2rem] border border-white/5 flex items-center justify-center mx-auto mb-6 text-gray-600 group-hover:text-purple-500 transition-all duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-sm font-black mb-1">Seleccionar Plantilla</p>
                  <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">de la Galería ZEPOL AI</p>
                </div>
              )}
            </div>
            <button className="w-full py-4 rounded-2xl border border-[#1a1a1a] text-xs font-black flex items-center justify-center gap-3 hover:bg-white/5 transition-all group" onClick={() => handleSelectKey()}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Subir desde PC
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-[#1a1a1a] space-y-3">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              Tamaño del Banner de Salida
            </p>
            <select className="w-full bg-transparent text-sm font-black focus:outline-none cursor-pointer appearance-none">
              <option className="bg-[#111]">Instagram Stories (9:16)</option>
              <option className="bg-[#111]">Instagram Post (1:1)</option>
            </select>
          </div>
          <div className="p-6 rounded-3xl bg-[#0a0a0a] border border-[#1a1a1a] space-y-3">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              Idioma del Banner de Salida
            </p>
            <select className="w-full bg-transparent text-sm font-black focus:outline-none cursor-pointer appearance-none">
              <option className="bg-[#111]">Español</option>
              <option className="bg-[#111]">Inglés</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
            </div>
            <div>
              <p className="text-sm font-black">Controles Avanzados</p>
              <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Personaliza tu banner</p>
            </div>
          </div>
          <div className="w-12 h-6 bg-[#1a1a1a] rounded-full relative p-1 cursor-pointer border border-white/5">
            <div className="w-4 h-4 bg-gray-600 rounded-full"></div>
          </div>
        </div>

        <button 
          onClick={handleGenerate}
          disabled={status === GenerationStatus.ANALYZING || status === GenerationStatus.DESIGNING}
          className="w-full py-6 rounded-3xl bg-purple-600 text-white font-black text-xl hover:bg-purple-500 transition-all flex items-center justify-center gap-4 shadow-2xl active:scale-[0.98]"
        >
          {status === GenerationStatus.ANALYZING || status === GenerationStatus.DESIGNING ? (
            <svg className="animate-spin h-7 w-7" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Generar Banner
            </>
          )}
        </button>
      </div>

      {status === GenerationStatus.COMPLETED && (
        <div className="mt-16 grid grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
           {generatedFlyers.map((flyer, idx) => (
             <div key={idx} className="bg-[#0d0d0d] p-6 rounded-[3rem] border border-white/5 space-y-6 shadow-2xl group">
                <div className="flex justify-between items-center px-2">
                   <span className="text-[10px] font-black text-white px-4 py-1.5 rounded-full uppercase tracking-widest" style={{ backgroundColor: accentColor }}>{flyer.format}</span>
                   <button onClick={() => downloadImage(flyer.url, `mr-diseno-banner-${idx}.png`)} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   </button>
                </div>
                <div className="rounded-[2rem] overflow-hidden border border-white/5 bg-black aspect-[9/16] relative">
                  <img src={flyer.url} className="w-full h-full object-contain" />
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );

  const GalleryModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsGalleryOpen(false)}></div>
      <div className="relative w-full max-w-6xl bg-[#0d0d0d] rounded-[3rem] border border-white/10 overflow-hidden flex flex-col max-h-[90vh] shadow-3xl">
        <div className="p-10 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-purple-900/30 flex items-center justify-center text-purple-400 border border-purple-500/20">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight">Galería de Banners</h2>
              <div className="flex items-center gap-2 mt-1">
                 <div className="px-4 py-1 bg-purple-500/10 rounded-full text-[10px] font-black text-purple-400 border border-purple-500/20 flex items-center gap-2 uppercase tracking-widest">
                  Favs <span className="ml-1 opacity-60">0</span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setIsGalleryOpen(false)} className="p-4 hover:bg-white/5 rounded-2xl transition-colors text-gray-500 hover:text-white">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-10 py-6 overflow-x-auto whitespace-nowrap space-x-4 no-scrollbar border-b border-white/5 bg-[#0a0a0a]">
          {['Todos', 'Belleza', 'Moda', 'Salud', 'Mascotas', 'Deportes', 'Viajes', 'Suplementos', 'Accesorios', 'Alcohol', 'Comida'].map((cat, i) => (
            <button key={i} className={`px-8 py-3 rounded-2xl text-xs font-black transition-all uppercase tracking-widest ${cat === 'Todos' ? 'purple-gradient text-white shadow-lg' : 'bg-[#111] text-gray-500 border border-white/5 hover:bg-[#1a1a1a]'}`}>
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-10 grid grid-cols-5 gap-6 no-scrollbar bg-black/20">
          {templates.map((src, i) => (
            <div 
              key={i} 
              className={`aspect-[9/16] rounded-3xl overflow-hidden border-4 cursor-pointer transition-all duration-300 relative group ${referenceImage[0] === src ? 'border-purple-500 scale-[0.98]' : 'border-transparent hover:border-white/10'}`}
              onClick={() => setReferenceImage([src])}
            >
              <img src={src} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
          ))}
        </div>

        <div className="p-10 border-t border-white/5 flex items-center justify-between bg-[#0a0a0a]">
          <p className="text-gray-600 text-sm font-bold uppercase tracking-widest flex items-center gap-3">
             Haz clic en un template para seleccionarlo
          </p>
          <div className="flex gap-4">
            <button onClick={() => setIsGalleryOpen(false)} className="px-10 py-4 rounded-2xl border border-white/10 font-black text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all">Cancelar</button>
            <button onClick={() => setIsGalleryOpen(false)} className="px-10 py-4 rounded-2xl purple-gradient font-black text-sm text-white shadow-xl hover:scale-105 active:scale-95 transition-all">Usar Este Template</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-black text-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto no-scrollbar bg-[#010101]">
        {view === 'dashboard' ? <Dashboard /> : <Generator />}
      </main>
      {isGalleryOpen && <GalleryModal />}

      {/* Floating Whatsapp Button */}
      <div className="fixed bottom-10 right-10 z-40">
        <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 active:scale-90 transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9 text-white" fill="currentColor" viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.6-30.6-38.2-3.2-5.6-.3-8.6 2.4-11.3 2.5-2.4 5.5-6.5 8.3-9.7 2.8-3.2 3.7-5.5 5.5-9.2 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.6 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg>
        </div>
      </div>
    </div>
  );
};

export default App;
