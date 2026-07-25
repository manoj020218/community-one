import mongoose from 'mongoose';
import { ValidationError } from '../../common/errors/AppError';
import { Device } from '../device/device.model';
import { Gate } from './gate.model';
import { normalizeGateName } from './gate.utils';

export interface LegacyGateMappingPreview {
  legacyGateName: string;
  deviceCount: number;
  matchedGateId?: string;
  matchedGateName?: string;
}

export class GateMappingService {
  async previewLegacyMappings(societyId: string): Promise<LegacyGateMappingPreview[]> {
    const [gateDocs, deviceGroups] = await Promise.all([
      Gate.find({ societyId, isActive: true }).select('_id name'),
      Device.aggregate([
        {
          $match: {
            societyId: new mongoose.Types.ObjectId(societyId),
            gateName: { $nin: [null, ''] },
            isActive: true,
          },
        },
        { $group: { _id: '$gateName', deviceCount: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const gateMap = new Map(gateDocs.map((gate) => [normalizeGateName(gate.name), gate]));
    return deviceGroups.map((group) => {
      const matchedGate = gateMap.get(normalizeGateName(group._id));
      return {
        legacyGateName: group._id,
        deviceCount: group.deviceCount,
        matchedGateId: matchedGate?._id?.toString(),
        matchedGateName: matchedGate?.name,
      };
    });
  }

  async linkDevicesToGate(
    societyId: string,
    gateId: string,
    input: { deviceIds?: string[]; legacyGateName?: string }
  ): Promise<number> {
    if (!input.deviceIds?.length && !input.legacyGateName?.trim()) {
      throw new ValidationError('Provide deviceIds or legacyGateName for mapping');
    }

    const filter: Record<string, any> = { societyId, isActive: true };
    if (input.deviceIds?.length) filter._id = { $in: input.deviceIds };
    if (input.legacyGateName?.trim()) filter.gateName = input.legacyGateName.trim();

    const result = await Device.updateMany(filter, { gateId });
    return result.modifiedCount;
  }
}

export const gateMappingService = new GateMappingService();
