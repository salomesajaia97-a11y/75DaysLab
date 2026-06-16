import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/mongoose'
import { User } from '@/models/User'
import { Photo } from '@/models/Photo'
import { Challenge } from '@/models/Challenge'
import { DailyLog } from '@/models/DailyLog'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await connectDB()

  const [totalUsers, totalPhotos, activeChallenges, totalLogs] = await Promise.all([
    User.countDocuments(),
    Photo.countDocuments(),
    Challenge.countDocuments({ isActive: true }),
    DailyLog.countDocuments(),
  ])

  // DAU trend: logs per day for last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
  const dauRaw = await DailyLog.aggregate([
    { $match: { date: { $gte: thirtyDaysAgo.toISOString().slice(0, 10) } } },
    { $group: { _id: '$date', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  const dauMap: Record<string, number> = {}
  dauRaw.forEach((d) => { dauMap[d._id] = d.count })
  const dauTrend = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const label = `${d.toLocaleString('en', { month: 'short' })} ${d.getDate()}`
    return { date: label, count: dauMap[key] ?? 0 }
  })

  // Completion by type
  const completionRaw = await DailyLog.aggregate([
    {
      $group: {
        _id: null,
        water: { $sum: { $cond: ['$waterCompleted', 1, 0] } },
        journal: { $sum: { $cond: ['$journalCompleted', 1, 0] } },
        nutrition: { $sum: { $cond: ['$nutritionCompleted', 1, 0] } },
        workout: { $sum: { $cond: ['$workoutCompleted', 1, 0] } },
        photo: { $sum: { $cond: ['$photoUploaded', 1, 0] } },
      },
    },
  ])
  const comp = completionRaw[0] ?? { water: 0, journal: 0, nutrition: 0, workout: 0, photo: 0 }
  const completionByType = [
    { name: 'Water', count: comp.water },
    { name: 'Journal', count: comp.journal },
    { name: 'Nutrition', count: comp.nutrition },
    { name: 'Workout', count: comp.workout },
    { name: 'Photo', count: comp.photo },
  ]

  // Recent users
  const recentUsers = await User.find({})
    .select('username email role createdAt onboardingComplete')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean()

  return NextResponse.json({
    totalUsers,
    totalPhotos,
    activeChallenges,
    totalLogs,
    dauTrend,
    completionByType,
    recentUsers: recentUsers.map((u) => ({
      id: String(u._id),
      username: u.username,
      email: u.email,
      role: u.role ?? 'user',
      onboardingComplete: u.onboardingComplete,
      createdAt: u.createdAt,
    })),
  })
}
