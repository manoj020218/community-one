import { ReportDefinition, IReportDefinitionDocument } from './report.model';
import { Society } from '../society/society.model';
import { Tower } from '../tower/tower.model';
import { Flat } from '../flat/flat.model';
import { Resident } from '../resident/resident.model';
import { Vehicle } from '../vehicle/vehicle.model';
import { Pet } from '../pet/pet.model';
import { PaymentRecord } from '../payment/payment.model';
import { Receipt } from '../receipt/receipt.model';

export class ReportService {
  async getAllDefinitions(): Promise<IReportDefinitionDocument[]> {
    return ReportDefinition.find({ isActive: true });
  }

  async runReport(code: string, societyId: string, filters: Record<string, any> = {}): Promise<any> {
    switch (code) {
      case 'SOCIETY_LIST':
        return Society.find({ isActive: true }).sort({ name: 1 });
      case 'TOWER_LIST':
        return Tower.find({ societyId, isActive: true }).sort({ name: 1 });
      case 'FLAT_LIST':
        return Flat.find({ societyId, isActive: true }).populate('towerId', 'name').populate('floorId', 'floorNumber').sort({ flatNo: 1 });
      case 'RESIDENT_LIST':
        return Resident.find({ societyId, isActive: true }).populate('flatId', 'flatNo').sort({ name: 1 });
      case 'VEHICLE_LIST':
        return Vehicle.find({ societyId, isActive: true }).populate('flatId', 'flatNo').sort({ vehicleNo: 1 });
      case 'PET_LIST':
        return Pet.find({ societyId, isActive: true }).populate('flatId', 'flatNo').sort({ petName: 1 });
      case 'PAYMENT_LIST':
        return PaymentRecord.find({ societyId }).populate('flatId', 'flatNo').sort({ paymentDate: -1 }).limit(500);
      case 'RECEIPT_LIST':
        return Receipt.find({ societyId }).populate('flatId', 'flatNo').sort({ receiptDate: -1 }).limit(500);
      default:
        return [];
    }
  }
}

export const reportService = new ReportService();
