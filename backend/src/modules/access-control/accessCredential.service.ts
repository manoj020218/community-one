import { ConflictError, NotFoundError } from '../../common/errors/AppError';
import { Device } from '../device/device.model';
import { Resident } from '../resident/resident.model';
import { CreateCredentialDto } from './access-control.types';
import { AccessZoneCredential, IAccessZoneCredentialDocument } from './accessCredential.model';

const CREDENTIAL_POPULATE: Array<{ path: string; select: string }> = [
  { path: 'residentId', select: 'name mobile' },
  { path: 'deviceId', select: 'deviceName deviceType make' },
];

export class AccessCredentialService {
  async create(dto: CreateCredentialDto, createdBy: string): Promise<IAccessZoneCredentialDocument> {
    const [resident, device] = await Promise.all([
      Resident.findOne({ _id: dto.residentId, societyId: dto.societyId, isActive: true }),
      Device.findOne({ _id: dto.deviceId, societyId: dto.societyId, isActive: true }),
    ]);
    if (!resident) throw new NotFoundError('Resident');
    if (!device) throw new NotFoundError('Device');

    const existing = await AccessZoneCredential.findOne({ deviceId: dto.deviceId, deviceExternalUserId: dto.deviceExternalUserId });
    if (existing) throw new ConflictError('This device user ID is already mapped to a resident');

    const credential = await AccessZoneCredential.create({ ...dto, createdBy });
    return this.findById(credential._id!.toString());
  }

  async listBySociety(societyId: string): Promise<IAccessZoneCredentialDocument[]> {
    return AccessZoneCredential.find({ societyId }).populate(CREDENTIAL_POPULATE).sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IAccessZoneCredentialDocument> {
    const credential = await AccessZoneCredential.findById(id).populate(CREDENTIAL_POPULATE);
    if (!credential) throw new NotFoundError('Access credential');
    return credential;
  }

  async revoke(id: string): Promise<IAccessZoneCredentialDocument> {
    const credential = await AccessZoneCredential.findByIdAndUpdate(id, { status: 'REVOKED' }, { new: true }).populate(CREDENTIAL_POPULATE);
    if (!credential) throw new NotFoundError('Access credential');
    return credential;
  }

  async resolve(deviceId: string, deviceExternalUserId: string): Promise<string | null> {
    const credential = await AccessZoneCredential.findOne({ deviceId, deviceExternalUserId, status: 'ACTIVE' });
    if (!credential) return null;
    return credential.residentId.toString();
  }
}

export const accessCredentialService = new AccessCredentialService();
