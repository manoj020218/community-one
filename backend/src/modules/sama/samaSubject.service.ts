import { ValidationError } from '../../common/errors/AppError';
import { AccessPolicy, IAccessPolicyDocument } from './accessPolicy.model';
import { ServiceProviderProfile } from './serviceProviderProfile.model';
import { StaffProfile } from './staffProfile.model';
import { WorkOrder } from './workOrder.model';

export type SamaSubjectType = 'STAFF_PROFILE' | 'SERVICE_PROVIDER' | 'WORK_ORDER';

export class SamaSubjectService {
  async ensureExists(societyId: string, subjectType: SamaSubjectType, subjectId: string): Promise<void> {
    const exists = await ({
      STAFF_PROFILE: StaffProfile.exists({ _id: subjectId, societyId }),
      SERVICE_PROVIDER: ServiceProviderProfile.exists({ _id: subjectId, societyId }),
      WORK_ORDER: WorkOrder.exists({ _id: subjectId, societyId }),
    }[subjectType]);
    if (!exists) throw new ValidationError(`Invalid ${subjectType.toLowerCase()} for this society`);
  }

  async getActivePolicy(societyId: string, policyId: string): Promise<IAccessPolicyDocument> {
    const policy = await AccessPolicy.findOne({ _id: policyId, societyId }).orFail();
    if (policy.status !== 'ACTIVE') throw new ValidationError('Access policy is not active');
    return policy;
  }

  ensurePolicyMatches(
    policy: IAccessPolicyDocument,
    subjectType: SamaSubjectType,
    subjectId: string,
    extra?: { workOrderId?: string }
  ): void {
    const policySubjectId = policy.subjectId.toString();
    const matchesSubject = policy.subjectType === subjectType && policySubjectId === subjectId;
    const matchesWorkOrder = policy.subjectType === 'WORK_ORDER' && policySubjectId === extra?.workOrderId;
    if (!matchesSubject && !matchesWorkOrder) {
      throw new ValidationError('Access policy does not match the assigned SAMA subject');
    }
  }
}

export const samaSubjectService = new SamaSubjectService();
