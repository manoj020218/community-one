import { ReportDefinition, IReportDefinitionDocument } from './report.model';
import { Society } from '../society/society.model';
import { Tower } from '../tower/tower.model';
import { Flat } from '../flat/flat.model';
import { Resident } from '../resident/resident.model';
import { Vehicle } from '../vehicle/vehicle.model';
import { Pet } from '../pet/pet.model';
import { PaymentRecord } from '../payment/payment.model';
import { Receipt } from '../receipt/receipt.model';

// Platform-wide reports that list data across every society — only meaningful (and safe) for
// a Jenix Super Admin/Support user managing the whole platform, never for a single society's
// own admin, who has no business seeing other societies at all.
const PLATFORM_WIDE_REPORT_CODES = ['SOCIETY_LIST'];

export class ReportService {
  async getAllDefinitions(isSuper: boolean): Promise<IReportDefinitionDocument[]> {
    const query: Record<string, unknown> = { isActive: true };
    if (!isSuper) query.code = { $nin: PLATFORM_WIDE_REPORT_CODES };
    return ReportDefinition.find(query);
  }

  async runReport(code: string, societyId: string, filters: Record<string, any> = {}, isSuper = false): Promise<any> {
    switch (code) {
      case 'SOCIETY_LIST':
        // Defense in depth: even if a non-super caller somehow invokes this code directly, it
        // never leaks other societies — it can only ever return their own.
        return isSuper ? Society.find({ isActive: true }).sort({ name: 1 }) : Society.find({ _id: societyId, isActive: true });
      case 'TOWER_LIST':
        return Tower.find({ societyId, isActive: true }).populate('societyId', 'shortId').sort({ name: 1 });
      case 'FLAT_LIST':
        return Flat.find({ societyId, isActive: true }).populate('societyId', 'shortId').populate('towerId', 'name').populate('floorId', 'floorNumber').sort({ flatNo: 1 });
      case 'RESIDENT_LIST':
        return Resident.find({ societyId, isActive: true }).populate('societyId', 'shortId').populate('flatId', 'flatNo').sort({ name: 1 });
      case 'VEHICLE_LIST':
        return Vehicle.find({ societyId, isActive: true }).populate('societyId', 'shortId').populate('flatId', 'flatNo').sort({ vehicleNo: 1 });
      case 'PET_LIST':
        return Pet.find({ societyId, isActive: true }).populate('societyId', 'shortId').populate('flatId', 'flatNo').sort({ petName: 1 });
      case 'PAYMENT_LIST':
        return PaymentRecord.find({ societyId }).populate('societyId', 'shortId').populate('flatId', 'flatNo').sort({ paymentDate: -1 }).limit(500);
      case 'RECEIPT_LIST':
        return Receipt.find({ societyId }).populate('societyId', 'shortId').populate('flatId', 'flatNo').sort({ receiptDate: -1 }).limit(500);
      default:
        return [];
    }
  }
}

export const reportService = new ReportService();
