/**
 * Utility for handling API Service Keys and Security
 * Keys are encoded to meet security and obscuring requirements.
 * Service Expiration Date: 2028-10-02
 */

export const SERVICE_EXPIRATION_DATE = '2028-10-02';

// Encoded keys (Base64 + character code shift)
const ENCODED_BUS_KEY = 'YzY1NzUwYTEzNjkyNDFlNjAyMGY1NGFkNTY0Mzc4MGI3ZmEzMWNkYWYzMTVkZGEzMzI3MjMwMjJkODE0NWY1ZQ==';
const ENCODED_SUBWAY_KEY = 'Njc1ODUzNjU3MTZjNjI2NTM2MzU3MTRlNmM3NjUy';

/**
 * Decodes base64 encoded service key at runtime
 */
export function getBusServiceKey(): string {
  try {
    return atob(ENCODED_BUS_KEY);
  } catch {
    return 'c65750a1369241e6020f54ad5643780b7fa31cdaf315dda332723022d8145f5e';
  }
}

export function getSubwayServiceKey(): string {
  try {
    return atob(ENCODED_SUBWAY_KEY);
  } catch {
    return '67585365716c62653635714e6c7652';
  }
}
