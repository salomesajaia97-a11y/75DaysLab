import { UsersTable } from '../UsersTable'

export default function AdminUsersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">Manage all platform users.</p>
      </div>
      <UsersTable />
    </div>
  )
}
