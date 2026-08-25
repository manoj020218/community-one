import mongoose, { Schema, Document, Model } from 'mongoose';

export type PatrolScanStatus = 'HIT' | 'LATE';
export type PatrolScanMethod = 'QR' | 'NFC';

export interface IPatrolScanDocument extends Document {
  societyId: string;
  roundId: string;
  checkpointId: string;
  scannedAt: Date;
  status: PatrolScanStatus;
  method: PatrolScanMethod;
  lat: number;
  lng: number;
  gpsAccuracyM?: number;
  createdAt?: Date;
}

const PatrolScanSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true },
    roundId: { type: Schema.Types.ObjectId, ref: 'PatrolRound', required: true },
    checkpointId: { type: Schema.Types.ObjectId, ref: 'PatrolCheckpoint', required: true },
    scannedAt: { type: Date, required: true },
    // HIT = scanned within the round/route's alert threshold of the previous scan;
    // LATE = scanned, but after the threshold had already elapsed. A checkpoint with no
    // PatrolScan row at all by the time its round ends is a MISS — derived at query time
    // (join PatrolRoute.checkpointIds against this collection), not stored as its own row.
    status: { type: String, enum: ['HIT', 'LATE'], required: true },
    method: { type: String, enum: ['QR', 'NFC'], required: true },
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    gpsAccuracyM: { type: Number },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PatrolScanSchema.index({ societyId: 1, roundId: 1, checkpointId: 1 }, { unique: true });

export const PatrolScan: Model<IPatrolScanDocument> = mongoose.model<IPatrolScanDocument>('PatrolScan', PatrolScanSchema);
