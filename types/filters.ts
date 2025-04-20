export type PropertyWithLocation = {
  id: number;
  location: {
    id: number;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates: {
      longitude: number;
      latitude: number;
    };
  };
};
