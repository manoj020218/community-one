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
