
export interface RestaurantInfo {
  name: string;
  type: string;
  targetAudience: 'popular' | 'familiar' | 'premium';
  context: 'delivery' | 'local' | 'temporada';
  product: string;
  pricePromo: string;
  phone?: string;
  ctaText?: string;
  quality: 'standard' | 'ultra';
  logo?: string;
  brandColor?: string;
}

export interface GeneratedFlyer {
  url: string;
  format: '1:1' | '9:16';
  description: string;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  BRANDING = 'BRANDING',
  DESIGNING = 'DESIGNING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
