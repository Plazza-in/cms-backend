import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { AuthService } from './auth.service';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  mobile_number: string;
}

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  mobile_number: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  async sendOtp(@Body() sendOtpDto: SendOtpDto) {
    try {
      const result = await this.authService.sendOtp(sendOtpDto.mobile_number);
      return result;
    } catch (error) {
      throw new UnauthorizedException('Failed to send OTP');
    }
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    try {
      const result = await this.authService.verifyOtp(verifyOtpDto.mobile_number, verifyOtpDto.otp);
      return result;
    } catch (error) {
      throw new UnauthorizedException('Invalid OTP or verification failed');
    }
  }
}
