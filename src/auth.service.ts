import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface AuthUser {
  user_id: string;
  name: string;
  role: string;
  mobile_number: string;
  email: string;
  photo_url?: string;
  access_token: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    success: boolean;
    message: string;
    data: AuthUser;
  };
  error: null;
  message: string;
}

@Injectable()
export class AuthService {
  private readonly authServiceUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.authServiceUrl = this.configService.get<string>('authService.url') || 'https://staging.plazza.in/inventory/api/auth';
  }

  async sendOtp(mobileNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Sending OTP to:', mobileNumber);
      console.log('Auth service URL:', this.authServiceUrl);
      
      const response = await axios.post(`${this.authServiceUrl}/send-otp`, {
        mobile_number: mobileNumber,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('Response received:', response.data);
      const data = response.data as any;
      return {
        success: data.success,
        message: data.message || 'OTP sent successfully',
      };
    } catch (error) {
      console.error('Send OTP Error:', error.response?.data || error.message);
      console.error('Error details:', error);
      throw new UnauthorizedException(`Failed to send OTP: ${error.response?.data?.message || error.message}`);
    }
  }

  async verifyOtp(mobileNumber: string, otp: string): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${this.authServiceUrl}/verify-otp`, {
        mobile_number: mobileNumber,
        otp: otp,
      });

      return response.data as AuthResponse;
    } catch (error) {
      console.error('Verify OTP Error:', error.response?.data || error.message);
      throw new UnauthorizedException(`Invalid OTP or verification failed: ${error.response?.data?.message || error.message}`);
    }
  }

  async validateToken(token: string): Promise<AuthUser> {
    try {
      console.log('Validating token:', token.substring(0, 50) + '...');
      // For now, we'll decode the JWT token to get user info
      // In production, you might want to verify the token with the auth service
      const payload = this.decodeJwtToken(token);
      console.log('Decoded payload:', payload);
      
      if (!payload) {
        throw new UnauthorizedException('Invalid token');
      }

      return {
        user_id: payload.sub,
        name: payload.name,
        role: payload.role,
        mobile_number: payload.mobile_number,
        email: payload.email || '',
        photo_url: payload.photo_url,
        access_token: token,
      };
    } catch (error) {
      console.error('Token validation error:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  isAdmin(user: AuthUser): boolean {
    return user.role === 'admin';
  }

  private decodeJwtToken(token: string): any {
    try {
      if (!token || typeof token !== 'string') {
        return null;
      }
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        Buffer.from(base64, 'base64')
          .toString('binary')
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('JWT decode error:', error);
      return null;
    }
  }
}
