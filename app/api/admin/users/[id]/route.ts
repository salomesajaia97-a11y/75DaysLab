import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { Challenge } from '@/models/Challenge'
import { DailyLog } from '@/models/DailyLog'
import { Photo } from '@/models/Photo'
import { WaterLog } from '@/models/WaterLog'
import { JournalEntry } from '@/models/JournalEntry'
import { FoodLog } from '@/models/FoodLog'
import { CycleLog } from '@/models/CycleLog'
import { Squad } from '@/models/Squad'
import { v2 as cloudinary } from 'cloudinary'
import mongoose from 'mongoose'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  if (!mongoose.Types.ObjectId.isValid(id))
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })

  if (id === session.user.id)
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })

  await connectDB()

  const user = await User.findById(id)
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Delete Cloudinary photos first (need publicIds)
  const photos = await Photo.find({ userId: id }).select('publicId').lean()
  if (photos.length > 0) {
    const publicIds = photos.map((p) => p.publicId).filter(Boolean)
    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds).catch(() => {
        // Best-effort: continue even if Cloudinary deletion partially fails
      })
    }
  }

  // Cascade delete all user data
  await Promise.all([
    Challenge.deleteMany({ userId: id }),
    DailyLog.deleteMany({ userId: id }),
    Photo.deleteMany({ userId: id }),
    WaterLog.deleteMany({ userId: id }),
    JournalEntry.deleteMany({ userId: id }),
    FoodLog.deleteMany({ userId: id }),
    CycleLog.deleteMany({ userId: id }),
    Squad.deleteMany({ creatorId: id }),
    Squad.updateMany({ members: id }, { $pull: { members: id } }),
  ])

  await User.findByIdAndDelete(id)

  return NextResponse.json({ success: true })
}
