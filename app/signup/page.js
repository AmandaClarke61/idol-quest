'use client'

import { useState } from 'react'
import supabase from '../../lib/supabaseClient'
import Link from 'next/link'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', content: '' })

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', content: '' })

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        setMessage({ type: 'error', content: error.message })
      } else if (data?.user) {
        setMessage({
          type: 'success',
          content: '注册成功！请检查你的邮箱以完成验证。'
        })
        // 清空表单
        setEmail('')
        setPassword('')
      }
    } catch (error) {
      setMessage({ type: 'error', content: '发生错误，请稍后重试。' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: `url('/practice-room-bg.jpg') center center / cover no-repeat fixed`,
        position: 'relative',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: 500,
          margin: '0 auto',
          padding: '3em 2em',
          background: 'rgba(255,255,255,0.85)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px 0 rgba(200,160,255,0.15)',
          backdropFilter: 'blur(8px)',
          position: 'relative',
          top: 60,
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">SM练习生</h1>
          <h2 className="text-2xl font-semibold text-indigo-600">星光之路</h2>
          <p className="text-gray-600 mt-2">开启你的练习生生涯</p>
        </div>

        <form className="space-y-6" onSubmit={handleSignUp}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                电子邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                placeholder="请输入你的邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                placeholder="请设置你的密码（至少6位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">密码至少需要6个字符</p>
            </div>
          </div>

          {message.content && (
            <div
              className={`p-4 rounded-lg text-center ${
                message.type === 'error' 
                  ? 'bg-red-50 text-red-700 border border-red-200' 
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              {message.content}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                注册中...
              </span>
            ) : (
              '注册账号'
            )}
          </button>

          <div className="text-center">
            <p className="text-gray-600">
              已有账号？{' '}
              <Link 
                href="/login" 
                className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
              >
                立即登录
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
} 