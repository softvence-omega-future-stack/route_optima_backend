import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import NodeGeocoder from 'node-geocoder';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
}

@Injectable()
export class GeocoderUtil {
  private geocoder: NodeGeocoder.Geocoder;
  private readonly logger = new Logger(GeocoderUtil.name);

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY is not set in environment variables');
    }

    const options: NodeGeocoderOptions = {
      provider: 'google',
      apiKey: apiKey,
      // Optional: specify language and region
      language: 'en',
      region: 'us',
    } as NodeGeocoderOptions;

    this.geocoder = NodeGeocoder(options);
  }

  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      if (!this.geocoder) {
        this.logger.warn('Geocoder not initialized - missing API key');
        return null;
      }

      this.logger.log(`Geocoding address: ${address}`);
      
      const results = await this.geocoder.geocode(address);
      
      if (results && results.length > 0) {
        const result = results[0];
        
        if (result.latitude && result.longitude) {
          this.logger.log(`Geocoding successful: ${result.latitude}, ${result.longitude}`);
          
          return {
            latitude: result.latitude,
            longitude: result.longitude,
            formattedAddress: result.formattedAddress,
            city: result.city,
            state: result.state,
            zipcode: result.zipcode,
            country: result.countryCode || result.country,
          };
        }
      }
      
      this.logger.warn(`No geocoding results found for address: ${address}`);
      return null;
    } catch (error) {
      this.logger.error(`Geocoding error for address "${address}":`, error.message);
      return null;
    }
  }

  /**
   * Batch geocode multiple addresses
   */
  async geocodeAddresses(addresses: string[]): Promise<(GeocodeResult | null)[]> {
    const results: (GeocodeResult | null)[] = [];
    
    for (const address of addresses) {
      const result = await this.geocodeAddress(address);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Check if geocoder is properly configured
   */
  isConfigured(): boolean {
    return !!this.geocoder;
  }
}

// Type definitions for better TypeScript support
interface NodeGeocoderOptions {
  provider: string;
  apiKey?: string;
  language?: string;
  region?: string;
  fetch?: any;
}