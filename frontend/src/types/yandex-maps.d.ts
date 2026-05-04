declare global {
  interface Window {
    ymaps: {
      ready: (callback: () => void) => void;
      Map: new (container: HTMLElement, state: {
        center: [number, number];
        zoom: number;
      }) => {
        geoObjects: {
          add: (object: any) => void;
          remove: (object: any) => void;
        };
        events: {
          add: (event: string, callback: (e: any) => void) => void;
        };
      };
      Placemark: new (coordinates: [number, number], properties?: any, options?: any) => {
        geometry: {
          setCoordinates: (coordinates: [number, number]) => void;
        };
      };
    };
  }
}

export {};
