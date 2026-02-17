import type { ArtboardPreset, ArtboardCategory } from './types';

/** All available artboard presets */
export const ARTBOARD_PRESETS: ArtboardPreset[] = [
  // Paper Sizes (ISO 216)
  {
    id: 'a4-portrait',
    category: 'paper',
    label: 'A4',
    width: 794,
    height: 1123,
    description: '210 × 297 mm @ 96 DPI',
  },
  {
    id: 'a4-landscape',
    category: 'paper',
    label: 'A4 (Landscape)',
    width: 1123,
    height: 794,
    description: '297 × 210 mm @ 96 DPI',
  },
  {
    id: 'a3-portrait',
    category: 'paper',
    label: 'A3',
    width: 1123,
    height: 1587,
    description: '297 × 420 mm @ 96 DPI',
  },
  {
    id: 'a3-landscape',
    category: 'paper',
    label: 'A3 (Landscape)',
    width: 1587,
    height: 1123,
    description: '420 × 297 mm @ 96 DPI',
  },
  {
    id: 'letter-portrait',
    category: 'paper',
    label: 'Letter',
    width: 816,
    height: 1056,
    description: '8.5 × 11 in @ 96 DPI',
  },
  {
    id: 'letter-landscape',
    category: 'paper',
    label: 'Letter (Landscape)',
    width: 1056,
    height: 816,
    description: '11 × 8.5 in @ 96 DPI',
  },
  {
    id: 'legal-portrait',
    category: 'paper',
    label: 'Legal',
    width: 816,
    height: 1344,
    description: '8.5 × 14 in @ 96 DPI',
  },
  {
    id: 'legal-landscape',
    category: 'paper',
    label: 'Legal (Landscape)',
    width: 1344,
    height: 816,
    description: '14 × 8.5 in @ 96 DPI',
  },
  {
    id: 'tabloid-portrait',
    category: 'paper',
    label: 'Tabloid',
    width: 1056,
    height: 1632,
    description: '11 × 17 in @ 96 DPI',
  },

  // Social Media Banners
  {
    id: 'youtube-channel',
    category: 'social',
    label: 'YouTube Channel',
    width: 2560,
    height: 1440,
    description: '2560 × 1440 px',
  },
  {
    id: 'youtube-video',
    category: 'video',
    label: 'YouTube Video',
    width: 1920,
    height: 1080,
    description: '1920 × 1080 px (16:9)',
  },
  {
    id: 'linkedin-banner',
    category: 'social',
    label: 'LinkedIn Banner',
    width: 1584,
    height: 396,
    description: '1584 × 396 px',
  },
  {
    id: 'linkedin-post',
    category: 'social',
    label: 'LinkedIn Post',
    width: 1200,
    height: 1200,
    description: '1200 × 1200 px (1:1)',
  },
  {
    id: 'facebook-post',
    category: 'social',
    label: 'Facebook Post',
    width: 1200,
    height: 630,
    description: '1200 × 630 px',
  },
  {
    id: 'facebook-cover',
    category: 'social',
    label: 'Facebook Cover',
    width: 1640,
    height: 856,
    description: '1640 × 856 px',
  },
  {
    id: 'instagram-post',
    category: 'social',
    label: 'Instagram Post',
    width: 1080,
    height: 1080,
    description: '1080 × 1080 px (1:1)',
  },
  {
    id: 'instagram-story',
    category: 'social',
    label: 'Instagram Story',
    width: 1080,
    height: 1920,
    description: '1080 × 1920 px (9:16)',
  },
  {
    id: 'twitter-post',
    category: 'social',
    label: 'X/Twitter Post',
    width: 1200,
    height: 675,
    description: '1200 × 675 px (16:9)',
  },
  {
    id: 'twitter-header',
    category: 'social',
    label: 'X/Twitter Header',
    width: 1500,
    height: 500,
    description: '1500 × 500 px',
  },
  {
    id: 'pinterest-pin',
    category: 'social',
    label: 'Pinterest Pin',
    width: 1000,
    height: 1500,
    description: '1000 × 1500 px (2:3)',
  },
  {
    id: 'tiktok-vertical',
    category: 'video',
    label: 'TikTok Vertical',
    width: 1080,
    height: 1920,
    description: '1080 × 1920 px (9:16)',
  },
  {
    id: 'tiktok-horizontal',
    category: 'video',
    label: 'TikTok Horizontal',
    width: 1920,
    height: 1080,
    description: '1920 × 1080 px (16:9)',
  },

  // Print/Common
  {
    id: 'business-card',
    category: 'print',
    label: 'Business Card',
    width: 1050,
    height: 600,
    description: '3.5 × 2 in @ 300 DPI',
  },
  {
    id: 'poster-a2',
    category: 'print',
    label: 'Poster A2',
    width: 1587,
    height: 2245,
    description: '420 × 594 mm @ 96 DPI',
  },
  {
    id: 'poster-a1',
    category: 'print',
    label: 'Poster A1',
    width: 2245,
    height: 3179,
    description: '594 × 841 mm @ 96 DPI',
  },

  // Video formats
  {
    id: 'video-4k',
    category: 'video',
    label: '4K Video',
    width: 3840,
    height: 2160,
    description: '3840 × 2160 px (16:9)',
  },
  {
    id: 'video-1080p',
    category: 'video',
    label: '1080p HD',
    width: 1920,
    height: 1080,
    description: '1920 × 1080 px (16:9)',
  },
  {
    id: 'video-720p',
    category: 'video',
    label: '720p HD',
    width: 1280,
    height: 720,
    description: '1280 × 720 px (16:9)',
  },
  {
    id: 'video-vertical',
    category: 'video',
    label: 'Vertical Video',
    width: 1080,
    height: 1920,
    description: '1080 × 1920 px (9:16)',
  },
  {
    id: 'video-square',
    category: 'video',
    label: 'Square Video',
    width: 1080,
    height: 1080,
    description: '1080 × 1080 px (1:1)',
  },

  // Monitor Screens
  {
    id: 'screen-vga',
    category: 'screens',
    label: 'VGA',
    width: 640,
    height: 480,
    description: '640 × 480 px (4:3)',
  },
  {
    id: 'screen-svga',
    category: 'screens',
    label: 'SVGA',
    width: 800,
    height: 600,
    description: '800 × 600 px (4:3)',
  },
  {
    id: 'screen-xga',
    category: 'screens',
    label: 'XGA',
    width: 1024,
    height: 768,
    description: '1024 × 768 px (4:3)',
  },
  {
    id: 'screen-hd',
    category: 'screens',
    label: 'HD',
    width: 1366,
    height: 768,
    description: '1366 × 768 px',
  },
  {
    id: 'screen-fullhd',
    category: 'screens',
    label: 'Full HD',
    width: 1920,
    height: 1080,
    description: '1920 × 1080 px (16:9)',
  },
  {
    id: 'screen-2k',
    category: 'screens',
    label: '2K QHD',
    width: 2560,
    height: 1440,
    description: '2560 × 1440 px (16:9)',
  },
  {
    id: 'screen-4k',
    category: 'screens',
    label: '4K UHD',
    width: 3840,
    height: 2160,
    description: '3840 × 2160 px (16:9)',
  },
  {
    id: 'screen-8k',
    category: 'screens',
    label: '8K UHD',
    width: 7680,
    height: 4320,
    description: '7680 × 4320 px (16:9)',
  },

  // iPhone
  {
    id: 'screen-iphone-se',
    category: 'screens',
    label: 'iPhone SE',
    width: 375,
    height: 667,
    description: '375 × 667 px',
  },
  {
    id: 'screen-iphone-xr',
    category: 'screens',
    label: 'iPhone XR / 11',
    width: 414,
    height: 896,
    description: '414 × 896 px',
  },
  {
    id: 'screen-iphone-12',
    category: 'screens',
    label: 'iPhone 12 / 13 / 14',
    width: 390,
    height: 844,
    description: '390 × 844 px',
  },
  {
    id: 'screen-iphone-14-pro-max',
    category: 'screens',
    label: 'iPhone 14 Pro Max',
    width: 430,
    height: 932,
    description: '430 × 932 px',
  },
  {
    id: 'screen-iphone-15-pro-max',
    category: 'screens',
    label: 'iPhone 15 Pro Max',
    width: 430,
    height: 932,
    description: '430 × 932 px',
  },

  // Samsung Galaxy
  {
    id: 'screen-samsung-s20',
    category: 'screens',
    label: 'Samsung Galaxy S20',
    width: 360,
    height: 800,
    description: '360 × 800 px',
  },
  {
    id: 'screen-samsung-s21',
    category: 'screens',
    label: 'Samsung Galaxy S21',
    width: 360,
    height: 800,
    description: '360 × 800 px',
  },
  {
    id: 'screen-samsung-s23',
    category: 'screens',
    label: 'Samsung Galaxy S23',
    width: 360,
    height: 780,
    description: '360 × 780 px',
  },
  {
    id: 'screen-samsung-s24-ultra',
    category: 'screens',
    label: 'Samsung Galaxy S24 Ultra',
    width: 412,
    height: 932,
    description: '412 × 932 px',
  },

  // Google Pixel
  {
    id: 'screen-pixel-7',
    category: 'screens',
    label: 'Google Pixel 7',
    width: 412,
    height: 915,
    description: '412 × 915 px',
  },
  {
    id: 'screen-pixel-7-pro',
    category: 'screens',
    label: 'Google Pixel 7 Pro',
    width: 412,
    height: 892,
    description: '412 × 892 px',
  },

  // iPad
  {
    id: 'screen-ipad-mini',
    category: 'screens',
    label: 'iPad Mini',
    width: 768,
    height: 1024,
    description: '768 × 1024 px',
  },
  {
    id: 'screen-ipad',
    category: 'screens',
    label: 'iPad',
    width: 810,
    height: 1080,
    description: '810 × 1080 px',
  },
  {
    id: 'screen-ipad-pro-11',
    category: 'screens',
    label: 'iPad Pro 11"',
    width: 834,
    height: 1194,
    description: '834 × 1194 px',
  },
  {
    id: 'screen-ipad-pro-12-9',
    category: 'screens',
    label: 'iPad Pro 12.9"',
    width: 1024,
    height: 1366,
    description: '1024 × 1366 px',
  },
];

/** Presets grouped by category */
export const ARTBOARD_PRESETS_BY_CATEGORY = ARTBOARD_PRESETS.reduce((acc, preset) => {
  if (!acc[preset.category]) {
    acc[preset.category] = [];
  }
  acc[preset.category].push(preset);
  return acc;
}, {} as Record<ArtboardCategory, ArtboardPreset[]>);

/** Get preset by ID */
export const getPresetById = (id: string): ArtboardPreset | undefined => {
  return ARTBOARD_PRESETS.find(p => p.id === id);
};

/** Get category label */
export const getCategoryLabel = (category: ArtboardCategory): string => {
  const labels: Record<ArtboardCategory, string> = {
    paper: 'Paper',
    social: 'Social Media',
    print: 'Print',
    video: 'Video',
    screens: 'Screens',
    custom: 'Custom',
  };
  return labels[category] ?? category;
};
