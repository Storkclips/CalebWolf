import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SiteIdentityContext = createContext({
  mode: 'name',
  siteName: 'Caleb Wolf',
  svgPath: '',
  viewBox: '0 0 24 24',
});

export const useSiteIdentity = () => useContext(SiteIdentityContext);

export const SiteIdentityProvider = ({ children }) => {
  const [identity, setIdentity] = useState({
    mode: 'name',
    siteName: 'Caleb Wolf',
    svgPath: '',
    viewBox: '0 0 24 24',
  });

  useEffect(() => {
    supabase.from('site_identity').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        setIdentity({
          mode: data.logo_mode || 'name',
          siteName: data.site_name || 'Caleb Wolf',
          svgPath: data.logo_svg_path || '',
          viewBox: data.logo_svg_viewbox || '0 0 24 24',
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
