import { Injectable, Logger } from '@nestjs/common';
import { GeocoderUtil } from './geocoder.util';

export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  stateCode: string; // Add state code field
  zipCode?: string;
}

@Injectable()
export class AddressParserUtil {
  private readonly logger = new Logger(AddressParserUtil.name);

  // State mapping - code to full name
  private readonly stateMap: { [code: string]: string } = {
    'AL': 'Alabama',
    'AK': 'Alaska',
    'AZ': 'Arizona',
    'AR': 'Arkansas',
    'CA': 'California',
    'CO': 'Colorado',
    'CT': 'Connecticut',
    'DE': 'Delaware',
    'FL': 'Florida',
    'GA': 'Georgia',
    'HI': 'Hawaii',
    'ID': 'Idaho',
    'IL': 'Illinois',
    'IN': 'Indiana',
    'IA': 'Iowa',
    'KS': 'Kansas',
    'KY': 'Kentucky',
    'LA': 'Louisiana',
    'ME': 'Maine',
    'MD': 'Maryland',
    'MA': 'Massachusetts',
    'MI': 'Michigan',
    'MN': 'Minnesota',
    'MS': 'Mississippi',
    'MO': 'Missouri',
    'MT': 'Montana',
    'NE': 'Nebraska',
    'NV': 'Nevada',
    'NH': 'New Hampshire',
    'NJ': 'New Jersey',
    'NM': 'New Mexico',
    'NY': 'New York',
    'NC': 'North Carolina',
    'ND': 'North Dakota',
    'OH': 'Ohio',
    'OK': 'Oklahoma',
    'OR': 'Oregon',
    'PA': 'Pennsylvania',
    'RI': 'Rhode Island',
    'SC': 'South Carolina',
    'SD': 'South Dakota',
    'TN': 'Tennessee',
    'TX': 'Texas',
    'UT': 'Utah',
    'VT': 'Vermont',
    'VA': 'Virginia',
    'WA': 'Washington',
    'WV': 'West Virginia',
    'WI': 'Wisconsin',
    'WY': 'Wyoming',
    'DC': 'District of Columbia'
  };

  constructor(private geocoderUtil: GeocoderUtil) {}

  async parseAddress(fullAddress: string): Promise<ParsedAddress> {
    this.logger.log(`Parsing address: ${fullAddress}`);
    const parsed = this.parseAddressWithRegex(fullAddress);
    this.logger.debug(`Parsed result: ${JSON.stringify(parsed)}`);
    return parsed;
  }

  // Method to get full state name from code
  getStateFullName(stateCode: string): string {
    return this.stateMap[stateCode.toUpperCase()] || 'Unknown';
  }

  // Method to get state code from full name
  getStateCode(fullName: string): string {
    const normalizedName = fullName.toLowerCase().trim();
    for (const [code, name] of Object.entries(this.stateMap)) {
      if (name.toLowerCase() === normalizedName) {
        return code;
      }
    }
    return 'Unknown';
  }

  private parseAddressWithRegex(fullAddress: string): ParsedAddress {
    const cleanAddress = fullAddress.trim().replace(/\s+/g, ' ');
    this.logger.debug(`Cleaned address: ${cleanAddress}`);
    
    const patterns = [
      /^(.+?),\s*(.+?),\s*([A-Za-z]{2})$/,
      /^(.+?),\s*(.+?),\s*([A-Za-z]{2})\s+(\d{5}(-\d{4})?)$/,
      /^(.+?),\s*(.+?)\s+([A-Za-z]{2})\s+(\d{5}(-\d{4})?)$/,
      /^(.+?),\s*(.+?)\s+([A-Za-z]{2})$/,
    ];

    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = cleanAddress.match(pattern);
      if (match) {
        this.logger.debug(`Pattern ${i + 1} matched: ${pattern}`);
        const stateCode = match[3].trim().toUpperCase();
        const fullStateName = this.getStateFullName(stateCode);
        
        return {
          street: match[1].trim(),
          city: match[2].trim(),
          state: fullStateName, // Now storing full name
          stateCode: stateCode, // Also store the code
          zipCode: match[4] || undefined,
        };
      }
    }

    this.logger.debug('No regex patterns matched, using fallback parsing');
    
    const parts = cleanAddress.split(',').map(part => part.trim());
    this.logger.debug(`Split parts: ${JSON.stringify(parts)}`);
    
    if (parts.length >= 3) {
      const stateCode = this.extractState(parts[2]);
      const fullStateName = this.getStateFullName(stateCode);
      
      return {
        street: parts[0],
        city: parts[1],
        state: fullStateName,
        stateCode: stateCode,
        zipCode: this.extractZipCode(parts[2]),
      };
    }
    
    if (parts.length === 2) {
      const lastPart = parts[1];
      const stateCode = this.extractState(lastPart);
      const fullStateName = this.getStateFullName(stateCode);
      const zipCode = this.extractZipCode(lastPart);
      
      let city = lastPart;
      if (stateCode && stateCode !== 'Unknown') {
        city = city.replace(new RegExp(`\\s*${stateCode}\\s*`, 'i'), '').trim();
      }
      if (zipCode) {
        city = city.replace(new RegExp(`\\s*${zipCode}\\s*`), '').trim();
      }
      
      return {
        street: parts[0],
        city: city || 'Unknown',
        state: fullStateName,
        stateCode: stateCode,
        zipCode: zipCode,
      };
    }

    const stateCode = this.extractState(cleanAddress);
    const fullStateName = this.getStateFullName(stateCode);
    
    return {
      street: cleanAddress,
      city: 'Unknown',
      state: fullStateName,
      stateCode: stateCode,
      zipCode: this.extractZipCode(cleanAddress),
    };
  }

  private extractState(part: string): string {
    this.logger.debug(`Extracting state from: ${part}`);
    
    // Look for 2-letter state code
    const stateMatch = part.match(/\b([A-Z]{2})\b/);
    if (stateMatch) {
      const state = stateMatch[1].toUpperCase();
      this.logger.debug(`Found state code: ${state}`);
      return state;
    }
    
    // Look for full state name and convert to code
    const normalizedPart = part.toLowerCase();
    for (const [code, fullName] of Object.entries(this.stateMap)) {
      if (normalizedPart.includes(fullName.toLowerCase())) {
        this.logger.debug(`Found full state name: ${fullName} -> ${code}`);
        return code;
      }
    }
    
    // Check state abbreviations
    const stateAbbrs = Object.keys(this.stateMap);
    for (const abbr of stateAbbrs) {
      if (part.toUpperCase().includes(abbr)) {
        this.logger.debug(`Found state abbreviation: ${abbr}`);
        return abbr;
      }
    }
    
    this.logger.debug(`No state found in: ${part}`);
    return 'Unknown';
  }

  private extractZipCode(part: string): string | undefined {
    const zipMatch = part.match(/\b(\d{5}(-\d{4})?)\b/);
    return zipMatch ? zipMatch[1] : undefined;
  }
}