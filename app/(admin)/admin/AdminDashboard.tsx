'use client'

import { useEffect, useState } from 'react'
import { Users, ImageIcon, Trophy, ClipboardList, TrendingUp, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

interface Stats {
  totalUsers: number
  totalPhotos: number
  activeChallenges: number
  totalLogs: number
  activeToday: number
  proUsers: number
  dauTrend: { date: string; count: number }[]
  completionByType: { name: string; count: number }[]
  signupsOverTime: { date: string; count: number }[]
  usersByPlan: { name: string; count: number }[]
  topChallenges: { name: string; participants: number }[]
  revenueByPlan: { name: string; revenue: number }[]
  recentUsers: {
    id: string
    username: string
    email: string
    role: string
    onboardingComplete: boolean
    createdAt: string
  }[]
}

const CHART_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4']

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
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        Loading dashboard...
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-destructive">
        Failed to load stats.
      </div>
    )
  }

  const statCards = [
    { label: 'Total Users',       value: stats.totalUsers,       sub: `${stats.activeToday} active today`, icon: Users,       color: '#6366f1' },
    { label: 'Pro Users',         value: stats.proUsers,          sub: 'paid plan',                         icon: CreditCard,  color: '#f59e0b' },
    { label: 'Active Challenges', value: stats.activeChallenges,  sub: 'running now',                       icon: Trophy,      color: '#10b981' },
    { label: 'Total Logs',        value: stats.totalLogs,         sub: 'daily logs recorded',               icon: ClipboardList, color: '#8b5cf6' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform health at a glance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{card.label}</p>
                  <p className="text-3xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
                <div className="h-9 w-9 rounded-lg flex items-center justify-center" style={{ background: card.color + '22' }}>
                  <card.icon className="h-5 w-5" style={{ color: card.color }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Signups over time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">User Signups (30d)</CardTitle>
            <CardDescription>New registrations per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: 'Signups', color: '#6366f1' } }} className="h-[200px]">
              <AreaChart data={stats.signupsOverTime}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" fill="#6366f133" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Users by plan (donut) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Users by Plan</CardTitle>
            <CardDescription>Distribution across subscription tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={Object.fromEntries(
                stats.usersByPlan.map((p, i) => [p.name, { label: p.name, color: CHART_COLORS[i % CHART_COLORS.length] }])
              )}
              className="h-[200px]"
            >
              <PieChart>
                <Pie data={stats.usersByPlan} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                  {stats.usersByPlan.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-2 gap-4">
        {/* DAU trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Daily Activity (30d)</CardTitle>
            <CardDescription>Daily logs submitted per day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: 'Logs', color: '#10b981' } }} className="h-[200px]">
              <BarChart data={stats.dauTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* AI Usage placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">AI Usage</CardTitle>
            <CardDescription>Coming soon — OpenAI call tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: 'Calls', color: '#8b5cf6' } }} className="h-[200px]">
              <LineChart data={[{ date: 'Today', count: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
            <p className="text-xs text-muted-foreground text-center mt-2">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              Tracking not yet wired up
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row 3 */}
      <div className="grid grid-cols-2 gap-4">
        {/* Top challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Active Challenges by Type</CardTitle>
            <CardDescription>Participants per challenge length</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ participants: { label: 'Participants', color: '#f59e0b' } }} className="h-[200px]">
              <BarChart data={stats.topChallenges} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="participants" fill="#f59e0b" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue by plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Monthly Revenue by Plan</CardTitle>
            <CardDescription>Estimated MRR per tier (USD)</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.revenueByPlan.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                No paid plans set up yet
              </div>
            ) : (
              <ChartContainer config={{ revenue: { label: 'Revenue ($)', color: '#06b6d4' } }} className="h-[200px]">
                <BarChart data={stats.revenueByPlan}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion by type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Completion by Activity Type</CardTitle>
          <CardDescription>Total completions across all users</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ count: { label: 'Completions', color: '#6366f1' } }} className="h-[180px]">
            <BarChart data={stats.completionByType}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Recent users table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Recent Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground font-medium uppercase tracking-wide">
                <th className="px-6 py-3 text-left">User</th>
                <th className="px-6 py-3 text-left">Email</th>
                <th className="px-6 py-3 text-left">Role</th>
                <th className="px-6 py-3 text-left">Joined</th>
                <th className="px-6 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentUsers.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-6 py-3 font-medium">@{u.username}</td>
                  <td className="px-6 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-muted text-muted-foreground'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.onboardingComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {u.onboardingComplete ? 'Active' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
              {stats.recentUsers.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No users yet</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
