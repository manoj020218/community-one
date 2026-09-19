export interface LookupSocietyDto {
  code: string;
}

export interface SubmitJoinRequestDto {
  societyCode: string;
  name: string;
  mobile: string;
  email?: string;
  claimedFlatNo?: string;
}

// Present when the request already matched an existing Resident (see
// joinRequest.model.ts#matchedResidentId) — approval only needs a password.
// Absent when the admin is creating a brand-new Resident for this request.
export interface ApproveJoinRequestDto {
  password: string;
  flatId?: string;
  memberType?: string;
  primaryContact?: boolean;
}

export interface RejectJoinRequestDto {
  reason?: string;
}
