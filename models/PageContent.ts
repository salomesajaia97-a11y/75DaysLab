import mongoose, { Schema, Document } from 'mongoose'

export interface IPageField {
  key: string
  label: string
  value: string
  type: 'text' | 'textarea' | 'url' | 'image'
}

export interface IPageSection {
  sectionId: string
  label: string
  fields: IPageField[]
}

export interface IPageContent extends Document {
  pageId: string
  sections: IPageSection[]
  updatedAt: Date
}

const PageFieldSchema = new Schema<IPageField>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: String, default: '' },
    type: { type: String, enum: ['text', 'textarea', 'url', 'image'], default: 'text' },
  },
  { _id: false }
)

const PageSectionSchema = new Schema<IPageSection>(
  {
    sectionId: { type: String, required: true },
    label: { type: String, required: true },
    fields: [PageFieldSchema],
  },
  { _id: false }
)

const PageContentSchema = new Schema<IPageContent>(
  {
    pageId: { type: String, required: true, unique: true },
    sections: [PageSectionSchema],
  },
  { timestamps: true }
)

export const PageContent =
  mongoose.models.PageContent ?? mongoose.model<IPageContent>('PageContent', PageContentSchema)
