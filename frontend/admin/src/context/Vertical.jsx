import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../../../shared/api';
import { getLabels, getVerticalFeatures } from '../../../shared/vertical';

const VerticalContext = createContext({
  settings: null,
  labels: getLabels({}),
  features: [],
  verticalFeatures: getVerticalFeatures({}),
  loading: true,
});

export function VerticalProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api('/settings/public')
      .then(setSettings)
      .catch(() => setSettings(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => {
    const labels = getLabels(settings || {});
    const verticalFeatures = getVerticalFeatures(settings || {});
    const features = Array.isArray(settings?.features) ? settings.features : [];
    return { settings, labels, features, verticalFeatures, loading };
  }, [settings, loading]);

  return <VerticalContext.Provider value={value}>{children}</VerticalContext.Provider>;
}

export function useVertical() {
  return useContext(VerticalContext);
}
