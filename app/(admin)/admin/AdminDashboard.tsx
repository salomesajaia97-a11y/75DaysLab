'use client'

import { useEffect, useState } from 'react'
import { Users, ImageIcon, Trophy, ClipboardList } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Stats {
  totalUsers: number
  totalPhotos: number
  activeChallenges: number
  totalLogs: number
  dauTrend: { date: string; count: number }[]
  completionByType: { name: string; count: number }[]
  recentUsers: {
    id: string
    username: string
    email: string
    role: string
    onboardingComplete: boolean
    createdAt: string
  }[]
}

const statCards = (s: Stats) => [
  {
    label: 'Total Users',
    value: s.totalUsers,
    sub: `${s.totalUsers} active`,
    icon: Users,
    iconColor: '#7c3aed',
    iconBg: '#ede9fe',
  },
  {
    label: 'Total Uploads',
    value: s.totalPhotos,
    sub: 'photos uploaded',
    icon: ImageIcon,
    iconColor: '#7c3aed',
    iconBg: '#ede9fe',
  },
  {
    label: 'Active Challenges',
    value: s.activeChallenges,
    sub: 'challenges running',
    icon: Trophy,
    iconColor: '#7c3aed',
    iconBg: '#ede9fe',
  },
  {
    label: 'Total Logs',
    value: s.totalLogs,
    sub: 'daily logs recorded',
    icon: ClipboardList,
    iconColor: '#7c3aed',
    iconBg: '#ede9fe',
  },
]

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        Loading...
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-red-500">
        Failed to load stats.
      </div>
    )
  }

  const cards = statCards(stats)

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform health at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
              </div>
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center"
                style={{ background: card.iconBg }}
              >
                <card.icon className="h-5 w-5" style={{ color: card.iconColor }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-[3fr_2fr] gap-4 mb-6">
        {/* DAU Trend */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-semibold text-gray-800 mb-4">DAU Trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={stats.dauTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontSize: 12, color: '#374151' }}
                itemStyle={{ fontSize: 12, color: '#6b21a8' }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#6b21a8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Completion by Type */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="font-semibold text-gray-800 mb-4">Completion by Type</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={stats.completionByType}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                labelStyle={{ fontSize: 12, color: '#374151' }}
                itemStyle={{ fontSize: 12, color: '#4c1d95' }}
              />
              <Bar dataKey="count" fill="#5b21b6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-800">Recent Users</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium uppercase tracking-wide">
              <th className="px-6 py-3 text-left">User</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Role</th>
              <th className="px-6 py-3 text-left">Joined</th>
              <th className="px-6 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentUsers.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 last:border-0">
                <td className="px-6 py-3 font-medium text-gray-900">@{u.username}</td>
                <td className="px-6 py-3 text-gray-500">{u.email}</td>
                <td className="px-6 py-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={
                      u.role === 'admin'
                        ? { background: '#fef3c7', color: '#92400e' }
                        : { background: '#f3f4f6', color: '#374151' }
                    }
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-3">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    style={
                      u.onboardingComplete
                        ? { background: '#d1fae5', color: '#065f46' }
                        : { background: '#fef3c7', color: '#92400e' }
                    }
                  >
                    {u.onboardingComplete ? 'Active' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
            {stats.recentUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  No users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
