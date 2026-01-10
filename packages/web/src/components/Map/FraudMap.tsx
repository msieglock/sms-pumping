import { useMemo } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl';
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

interface FraudMapProps {
  data: GeoBreakdown[];
}

export default function FraudMap({ data }: FraudMapProps) {
  const geojson = useMemo(() => {
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

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [data]);

  return (
    <Map
      initialViewState={{
        longitude: 0,
        latitude: 20,
        zoom: 1.5,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/light-v11"
      mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN || 'pk.placeholder'}
    >
      <NavigationControl position="top-right" />

      <Source id="fraud-data" type="geojson" data={geojson}>
        <Layer
          id="fraud-circles"
          type="circle"
          paint={{
            'circle-radius': ['get', 'radius'],
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.6,
            'circle-stroke-width': 2,
            'circle-stroke-color': ['get', 'color'],
          }}
        />
      </Source>
    </Map>
  );
}
