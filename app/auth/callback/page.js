'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import supabase from '../../../lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    setStatus('success')
    router.replace('/login')
  }, [router])

  return (
    <div style={{textAlign:'center',marginTop:'4em'}}>
      {status === 'loading' ? '正在验证...' : '验证成功，正在跳转到登录页...'}
    </div>
  )
} 