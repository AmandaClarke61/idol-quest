"use client"
import React, { useEffect, useState } from 'react'
import supabase from '../lib/supabaseClient'

export default function LogoutButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user)
    })
  }, [])

  if (!isLoggedIn) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  return (
    <button
      onClick={handleLogout}
      style={{
        position: 'fixed',
        top: '24px',
        right: '32px',
        zIndex: 1000,
        background: 'linear-gradient(90deg, #f8d6e5 60%, #d6e8f8 100%)',
        color: '#b07aff',
        border: 'none',
        borderRadius: '18px',
        boxShadow: '0 2px 12px 0 rgba(160, 200, 255, 0.10)',
        padding: '0.6em 1.4em',
        fontWeight: 600,
        fontSize: '1em',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      className="glossy"
    >
      退出登录
    </button>
  )
} 