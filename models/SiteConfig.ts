import mongoose, { Schema, Document } from 'mongoose'

export interface ISiteConfig extends Document {
  theme: {
    primaryColor: string
    accentColor: string
    backgroundColor: string
    textColor: string
    fontFamily: 'jakarta' | 'fraunces' | 'nunito' | 'georgian'
    fontSize: 'sm' | 'md' | 'lg'
    borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full'
  }
  updatedAt: Date
  updatedBy?: mongoose.Types.ObjectId
}

const SiteConfigSchema = new Schema<ISiteConfig>(
  {
    theme: {
      primaryColor: { type: String, default: '#2d3142' },
      accentColor: { type: String, default: '#ede9e3' },
      backgroundColor: { type: String, default: '#f5f3ef' },
      textColor: { type: String, default: '#2d3142' },
      fontFamily: { type: String, enum: ['jakarta', 'fraunces', 'nunito', 'georgian'], default: 'fraunces' },
      fontSize: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
      borderRadius: { type: String, enum: ['none', 'sm', 'md', 'lg', 'full'], default: 'md' },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export const SiteConfig =
  mongoose.models.SiteConfig ?? mongoose.model<ISiteConfig>('SiteConfig', SiteConfigSchema)
