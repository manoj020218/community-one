import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPatrolSettingsDocument extends Document {
  societyId: string;
  defaultAlertThresholdMinutes: number;
  defaultAlertSoundKey: string;
  updatedAt?: Date;
}

const PatrolSettingsSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: 'Society', required: true, unique: true },
    defaultAlertThresholdMinutes: { type: Number, default: 5 },
    defaultAlertSoundKey: { type: String, default: 'chime' },
  },
  { timestamps: true }
);

export const PatrolSettings: Model<IPatrolSettingsDocument> = mongoose.model<IPatrolSettingsDocument>('PatrolSettings', PatrolSettingsSchema);
