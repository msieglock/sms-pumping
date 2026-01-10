import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTheme } from '@mui/material/styles';
import type { GeoBreakdown } from '../../types';

// Country coordinates (simplified)
const COUNTRY_COORDS: Record<string, [number, number]> = {
  US: [-95.7129, 37.0902],
  CA: [-106.3468, 56.1304],
  GB: [-3.4360, 55.3781],
  DE: [10.4515, 51.1657],
  FR: [2.2137, 46.2276],
  JP: [138.2529, 36.2048],
  AU: [133.7751, -25.2744],
  BR: [-51.9253, -14.2350],
  IN: [78.9629, 20.5937],
  MX: [-102.5528, 23.6345],
  ID: [113.9213, -0.7893],
  PH: [121.7740, 12.8797],
  NG: [8.6753, 9.0820],
  PK: [69.3451, 30.3753],
  TH: [100.9925, 15.8700],
  VN: [108.2772, 14.0583],
};

const MAP_STYLES = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
};

interface FraudMapProps {
  data: GeoBreakdown[];
}

export default function FraudMap({ data }: FraudMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: isDark ? MAP_STYLES.dark : MAP_STYLES.light,
      center: [0, 20],
      zoom: 1.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
      setIsLoaded(true);

      // Add source for fraud data
      map.addSource('fraud-data', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add circle layer
      map.addLayer({
        id: 'fraud-circles',
        type: 'circle',
        source: 'fraud-data',
        paint: {
          'circle-radius': ['get', 'radius'],
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.6,
          'circle-stroke-width': 2,
          'circle-stroke-color': ['get', 'color'],
        },
      });

      // Add popup on click
      map.on('click', 'fraud-circles', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const props = feature.properties;
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number];

          new maplibregl.Popup()
            .setLngLat(coords)
            .setHTML(`
              <div style="padding: 8px; font-family: sans-serif;">
                <strong>${props?.country || 'Unknown'}</strong><br/>
                Total: ${props?.total?.toLocaleString() || 0}<br/>
                Blocked: ${props?.blocked?.toLocaleString() || 0}<br/>
                Block Rate: ${((props?.blockRate || 0) * 100).toFixed(1)}%
              </div>
            `)
            .addTo(map);
        }
      });

      // Change cursor on hover
      map.on('mouseenter', 'fraud-circles', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'fraud-circles', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update style when theme changes
  useEffect(() => {
    if (mapRef.current && isLoaded) {
      mapRef.current.setStyle(isDark ? MAP_STYLES.dark : MAP_STYLES.light);
    }
  }, [isDark, isLoaded]);

  // Update data
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const features = data
      .filter((d) => COUNTRY_COORDS[d.country])
      .map((d) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: COUNTRY_COORDS[d.country],
        },
        properties: {
          country: d.country,
          total: d.total,
          blocked: d.blocked,
          blockRate: d.block_rate,
          color:
            d.block_rate > 0.3
              ? '#ef4444'
              : d.block_rate > 0.1
              ? '#f59e0b'
              : '#10b981',
          radius: Math.max(10, Math.min(50, Math.sqrt(d.total) * 2)),
        },
      }));

    const source = mapRef.current.getSource('fraud-data') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features,
      });
    }
  }, [data, isLoaded]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
      {!isLoaded && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
        }}>
          Loading map...
        </div>
      )}
    </div>
  );
}
