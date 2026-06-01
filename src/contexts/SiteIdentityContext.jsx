import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const defaults = {
  mode: 'name',
  siteName: 'Caleb Wolf',
  svgPath: '',
  viewBox: '0 0 24 24',
  logoSize: 22,
  heroLogoEnabled: false,
  heroLogoSvgPath: '',
  heroLogoViewbox: '0 0 24 24',
  heroLogoColor: '#ffffff',
  heroLogoPosX: 50,
  heroLogoPosY: 50,
  heroLogoSize: 120,
};

const SiteIdentityContext = createContext(defaults);

export const useSiteIdentity = () => useContext(SiteIdentityContext);

export const SiteIdentityProvider = ({ children }) => {
  const [identity, setIdentity] = useState(defaults);

  useEffect(() => {
    supabase.from('site_identity').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        setIdentity({
          mode: data.logo_mode || 'name',
          siteName: data.site_name || 'Caleb Wolf',
          svgPath: data.logo_svg_path || '',
          viewBox: data.logo_svg_viewbox || '0 0 24 24',
          logoSize: data.logo_size ?? 22,
          heroLogoEnabled: data.hero_logo_enabled ?? false,
          heroLogoSvgPath: data.hero_logo_svg_path || data.logo_svg_path || '',
          heroLogoViewbox: data.hero_logo_viewbox || data.logo_svg_viewbox || '0 0 24 24',
          heroLogoColor: data.hero_logo_color || '#ffffff',
          heroLogoPosX: data.hero_logo_position_x ?? 50,
          heroLogoPosY: data.hero_logo_position_y ?? 50,
          heroLogoSize: data.hero_logo_size ?? 120,
        });
      }
    });
  }, []);

  return (
    <SiteIdentityContext.Provider value={identity}>
      {children}
    </SiteIdentityContext.Provider>
  );
};
