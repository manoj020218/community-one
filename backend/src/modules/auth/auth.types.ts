export interface LoginDto {
  identifier: string; // email or mobile
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    _id: string;
    name: string;
    email: string;
    mobile: string;
    roleCode: string;
    permissions: string[];
    societyId?: string;
    flatId?: string;
    photoUrl?: string;
  };
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface SelectSocietyContextDto {
  societyId: string;
  flatId?: string;
}

export interface OnboardSocietyDto {
  societyName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPersonName: string;
  email: string;
  mobile: string;
  agentCode?: string;
}

export interface OnboardSocietyResult {
  societyName: string;
  societyCode: string;
  email: string;
  password: string;
  trialEndsAt: Date;
}
