import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobStatus } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobResponseDto } from './dto/job-response.dto';
import axios from 'axios';

// Add these interfaces for Google Maps API response
interface GoogleGeocodeResponse {
  status: string;
  error_message?: string;
  results: {
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    address_components: {
      long_name: string;
      short_name: string;
      types: string[];
    }[];
  }[];
}

interface GeocodeResult {
  lat: number | null; 
  lng: number | null;  
  formattedAddress: string;
  state: string | null;  
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly googleMapsApiKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY is not defined in environment variables');
    }
    this.googleMapsApiKey = apiKey;
  }

private async geocodeAddress(address: string, zipCode?: string): Promise<GeocodeResult> {
  if (!this.googleMapsApiKey) {
    this.logger.warn('Google Maps API key not configured - skipping geocoding');
    return {
      lat: null,
      lng: null,
      formattedAddress: address,
      state: null,
    };
  }

  try {
    const fullAddress = zipCode ? `${address}, ${zipCode}, USA` : `${address}, USA`;
    this.logger.log(`Geocoding address: ${fullAddress}`);

    const response = await axios.get<GoogleGeocodeResponse>(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address: fullAddress,
          key: this.googleMapsApiKey,
        },
        timeout: 10000,
      },
    );

    // TypeScript now knows the structure of response.data
    if (response.data.status !== 'OK') {
      const errorMessage = response.data.error_message || 'No error message';
      this.logger.error(`Geocoding failed: ${response.data.status}`, errorMessage);
      throw new HttpException(
        `Address geocoding failed: ${response.data.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = response.data.results[0];
    const location = result.geometry.location;
    
    // Extract state from address components
    const stateComponent = result.address_components.find(component =>
      component.types.includes('administrative_area_level_1'),
    );

    const geocodeResult: GeocodeResult = {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.formatted_address,
      state: stateComponent ? stateComponent.short_name : '',
    };

    this.logger.log(`Geocoding successful: ${geocodeResult.formattedAddress}`);
    return geocodeResult;

  } catch (error) {
    this.logger.error('Geocoding error:', error.message);
    
    if (error instanceof HttpException) {
      throw error;
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new HttpException(
        'Geocoding service timeout',
        HttpStatus.REQUEST_TIMEOUT,
      );
    }
    
    throw new HttpException(
      'Geocoding service unavailable',
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

  private async validateAndGeocodeUSAddress(address: string, zipCode?: string): Promise<GeocodeResult> {
    const result = await this.geocodeAddress(address, zipCode);
    
    // Basic USA validation
    if (!result.state) {
      throw new HttpException('Address must be in the USA', HttpStatus.BAD_REQUEST);
    }

    return result;
  }

  async createJob(createJobDto: CreateJobDto): Promise<JobResponseDto> {
    try {
      // Validate technician exists and is active
      const technician = await this.prisma.technician.findFirst({
        where: {
          id: createJobDto.technicianId,
          isActive: true,
        },
      });

      if (!technician) {
        throw new HttpException('Technician not found or inactive', HttpStatus.NOT_FOUND);
      }

      // Validate time slot exists
      const timeSlot = await this.prisma.timeSlot.findUnique({
        where: { id: createJobDto.timeSlotId },
      });

      if (!timeSlot) {
        throw new HttpException('Time slot not found', HttpStatus.NOT_FOUND);
      }

      // Geocode the address and store coordinates
      let geocodeResult: GeocodeResult;
      try {
        geocodeResult = await this.validateAndGeocodeUSAddress(
          createJobDto.serviceAddress,
          createJobDto.zipCode,
        );
      } catch (error) {
        // If geocoding fails, create job without coordinates but with original address
        this.logger.warn('Geocoding failed, creating job with original address');
        
        const job = await this.prisma.job.create({
          data: {
            customerName: createJobDto.customerName,
            customerPhone: createJobDto.customerPhone,
            customerEmail: createJobDto.customerEmail,
            jobDescription: createJobDto.jobDescription,
            serviceAddress: createJobDto.serviceAddress, // Use original address
            zipCode: createJobDto.zipCode,
            // No coordinates since geocoding failed
            latitude: null,
            longitude: null,
            state: null,
            scheduledDate: new Date(createJobDto.scheduledDate),
            timeSlotId: createJobDto.timeSlotId,
            technicianId: createJobDto.technicianId,
            status: JobStatus.PENDING,
          },
          include: {
            technician: true,
            timeSlot: true,
          },
        });

        return this.mapToJobResponseDto(job);
      }

      // Create the job with coordinates
      const job = await this.prisma.job.create({
        data: {
          customerName: createJobDto.customerName,
          customerPhone: createJobDto.customerPhone,
          customerEmail: createJobDto.customerEmail,
          jobDescription: createJobDto.jobDescription,
          serviceAddress: geocodeResult.formattedAddress, // Use formatted address from Google
          zipCode: createJobDto.zipCode,
          // Store the coordinates and state in the database
          latitude: geocodeResult.lat,
          longitude: geocodeResult.lng,
          state: geocodeResult.state,
          scheduledDate: new Date(createJobDto.scheduledDate),
          timeSlotId: createJobDto.timeSlotId,
          technicianId: createJobDto.technicianId,
          status: JobStatus.PENDING,
        },
        include: {
          technician: true,
          timeSlot: true,
        },
      });

      return this.mapToJobResponseDto(job);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Failed to create job:', error);
      throw new HttpException(
        'Failed to create job',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper method to convert Prisma job to response DTO
  private mapToJobResponseDto(job: any): JobResponseDto {
    return {
      id: job.id,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      customerEmail: job.customerEmail,
      jobDescription: job.jobDescription,
      serviceAddress: job.serviceAddress,
      zipCode: job.zipCode,
      scheduledDate: job.scheduledDate,
      status: job.status,
      technicianId: job.technicianId,
      timeSlotId: job.timeSlotId,
      coordinates: job.latitude && job.longitude ? {
        lat: job.latitude,
        lng: job.longitude,
      } : null,
      state: job.state,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}