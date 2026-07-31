import React from 'react'
import { roles, status } from '../members/MemberFilter';
export interface memberFilterWithKeyTypeRoleType {
    key?: string;
    member_type?: string;
    role?: string;
}

export default function filters() {
    return (
        <div>filters</div>
    )
}

export const MemberFilterWithKeyTypeRole = ({ filter, setFilter }: { filter: memberFilterWithKeyTypeRoleType, setFilter: (memberFilterWithKeyTypeRoleType) => void }) => {
    return (
    <div className="my-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
  <div className="grid gap-4 md:grid-cols-3">
    {/* Search */}
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Search
      </label>
      <input
        type="text"
        placeholder="Name, ID or NID..."
        onChange={(e) =>
          setFilter({ ...filter, key: e.target.value })
        }
        className="h-10 w-full rounded-lg border border-gray-300 px-4 text-sm placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </div>

    {/* Role */}
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Role
      </label>
      <select
        defaultValue=""
        onChange={(e) =>
          setFilter({ ...filter, role: e.target.value })
        }
        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">All Roles</option>
        {roles.map((item) => (
          <option key={item.value} value={item.value}>
            {item.name}
          </option>
        ))}
      </select>
    </div>

    {/* Status */}
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        Status
      </label>
      <select
        defaultValue=""
        onChange={(e) =>
          setFilter({ ...filter, stage: e.target.value })
        }
        className="h-10 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">All Status</option>
        {status.map((item) => (
          <option key={item.value} value={item.value}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  </div>
</div>
    )
}
