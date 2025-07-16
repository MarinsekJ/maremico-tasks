'use client'

import { useState } from 'react'

export default function TestPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Input Test</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-black"
            placeholder="Enter email"
          />
          <p className="text-sm text-gray-600 mt-1">Value: {email}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded text-black"
            placeholder="Enter password"
          />
          <p className="text-sm text-gray-600 mt-1">Value: {password}</p>
        </div>
        
        <button
          onClick={() => console.log('Form data:', { email, password })}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Log Values
        </button>
      </div>
    </div>
  )
} 