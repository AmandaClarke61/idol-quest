'use client'
import { useEffect, useState, useRef } from 'react'
import supabase from '../../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import LogoutButton from '../../components/LogoutButton'

// 属性动画样式
// 建议放在组件顶部或全局css，但这里直接内联
const AttributeAnimationStyle = () => (
  <style jsx global>{`
    .attr-animate-up {
      animation: attrUp 1s cubic-bezier(.36,2,.5,1) both;
    }
    .attr-animate-down {
      animation: attrDown 1s cubic-bezier(.36,2,.5,1) both;
    }
    .attr-flash-up {
      animation: attrFlashUp 1s;
    }
    .attr-flash-down {
      animation: attrFlashDown 1s;
    }
    @keyframes attrUp {
      0% { transform: translateY(0); }
      20% { transform: translateY(-16px) scale(1.2); }
      40% { transform: translateY(-8px) scale(1.1);}
      100% { transform: translateY(0) scale(1);}
    }
    @keyframes attrDown {
      0% { transform: translateY(0); }
      20% { transform: translateY(16px) scale(1.2);}
      40% { transform: translateY(8px) scale(1.1);}
      100% { transform: translateY(0) scale(1);}
    }
    @keyframes attrFlashUp {
      0% { background: #d1fae5; }
      80% { background: #d1fae5; }
      100% { background: transparent; }
    }
    @keyframes attrFlashDown {
      0% { background: #fee2e2; }
      80% { background: #fee2e2; }
      100% { background: transparent; }
    }
  `}</style>
);

// 自定义模态弹窗组件
function RestartModal({ open, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(30, 27, 75, 0.18)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '20px',
          boxShadow: '0 8px 32px 0 rgba(160, 160, 255, 0.18)',
          padding: '2.2em 2em 1.5em 2em',
          minWidth: 320,
          maxWidth: '90vw',
          textAlign: 'center',
        }}
      >
        <div className="text-2xl font-bold text-indigo-700 mb-2">重新开始游戏</div>
        <div className="text-gray-700 text-base mb-6">确定要重新开始吗？这将清除所有对话记录和角色数据，无法恢复。</div>
        <div className="flex justify-center gap-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            style={{ minWidth: 90 }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-md transition-colors"
            style={{ minWidth: 90 }}
          >
            确认重置
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GamePage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [scenario, setScenario] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [gameState, setGameState] = useState('character-creation')
  const [playerStats, setPlayerStats] = useState({
    attributes: {
      Vocal: 0,
      Dance: 0,
      Rap: 0,
      Visual: 0,
      Charisma: 0,
      Resilience: 0,
      Creativity: 0
    },
    primaryTalent: null,
    personalityTrait: null
  })
  
  // 添加游戏对话状态
  const [gameLog, setGameLog] = useState([])
  const [currentAction, setCurrentAction] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const logRef = useRef(null)

  // Gemini DND 剧情相关状态
  const [dmStory, setDmStory] = useState('')
  const [dmOptions, setDmOptions] = useState([])
  const [dmHistory, setDmHistory] = useState([])

  // 记录上一次 action
  const [lastAction, setLastAction] = useState(null)

  const [attributeChanges, setAttributeChanges] = useState({});

  // 记录上一次属性值
  const [lastAttributes, setLastAttributes] = useState(playerStats.attributes);
  // 记录动画类型
  const [attrAnim, setAttrAnim] = useState({}); // { Vocal: 'up' | 'down' | null }

  // 新增：用户信息
  const [user, setUser] = useState(null);

  const [showRestartModal, setShowRestartModal] = useState(false);

  // 新增：角色创建步骤状态
  const [creationStep, setCreationStep] = useState('talent') // 'talent' | 'personality'

  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    // 登录校验
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
      } else {
        setUser(user);
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  // 新增：登录校验通过后，自动判断用户是否有能力属性，并加载历史对话
  useEffect(() => {
    if (!checkingAuth && user) {
      async function fetchProfileAndHistory() {
        // 查询能力属性
        const { data: profile } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profile && profile.ability) {
          // 有能力属性，直接进入 playing
          setPlayerStats(prev => ({
            ...prev,
            ...profile.ability
          }));
          setGameState('playing');
          // 查询历史对话
          const { data: history } = await supabase
            .from('chat_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });
          if (history && history.length > 0) {
            setGameLog(
              history.map(item => ({
                type: item.role === 'user' ? 'player' : 'ai',
                content: item.message
              }))
            );
          }
        }
      }
      fetchProfileAndHistory();
    }
  }, [checkingAuth, user]);

  useEffect(() => {
    const fetchScenario = async () => {
      try {
        setLoading(true)
        const res = await fetch('/scenarios/sm_trainee_scenario.json')
        
        if (!res.ok) {
          throw new Error(`HTTP错误! 状态码: ${res.status}`)
        }

        const data = await res.json()
        setScenario(data)
      } catch (err) {
        console.error('加载失败:', err)
        setError(`加载失败: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    fetchScenario()
  }, [])

  // 进入 playing 阶段后，自动请求 Gemini DND 剧情
  useEffect(() => {
    if (gameState === 'playing') {
      fetchNextTurn(null, ""); // 第一轮用 null，确保不会产生属性变化
    }
    // eslint-disable-next-line
  }, [gameState])

  // 剧情区只显示最新AI回复，日志区显示全部历史
  useEffect(() => {
    if (gameState === 'playing' && dmStory) {
      setGameLog(prev => ([...prev, { type: 'ai', content: dmStory }]))
    }
  }, [dmStory])

  // 日志区域自动滚动到底部
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [gameLog])

  // 监听属性变化
  useEffect(() => {
    const handleAttributeChange = (attr, newValue) => {
      setAttributeChanges(prev => ({ ...prev, [attr]: newValue }));
      setTimeout(() => {
        setAttributeChanges(prev => ({ ...prev, [attr]: null }));
      }, 1000);
    };

    // 示例：假设属性变化时调用此函数
    // handleAttributeChange('Vocal', playerStats.attributes.Vocal);
  }, [playerStats.attributes]);

  useEffect(() => {
    const changes = {};
    Object.entries(playerStats.attributes).forEach(([key, value]) => {
      if (lastAttributes[key] !== undefined && value !== lastAttributes[key]) {
        changes[key] = value > lastAttributes[key] ? 'up' : 'down';
      }
    });
    setAttrAnim(changes);
    setLastAttributes(playerStats.attributes);
    if (Object.keys(changes).length > 0) {
      setTimeout(() => {
        setAttrAnim({});
      }, 1000);
    }
    // eslint-disable-next-line
  }, [playerStats.attributes]);

  // 请求 Gemini DND 剧情
  async function fetchNextTurn(action = null, currentStory = "") {
    setLastAction(action)
    console.log('fetchNextTurn 被调用，action:', action)
    setIsProcessing(true)
    try {
      // 构造 player 对象（使用标准属性名）
      const player = {
        name: '练习生',
        level: 1,
        vocal: playerStats.attributes['Vocal'] || 0,
        dance: playerStats.attributes['Dance'] || 0,
        rap: playerStats.attributes['Rap'] || 0,
        resilience: playerStats.attributes['Resilience'] || 0,
        creativity: playerStats.attributes['Creativity'] || 0,
        visual: playerStats.attributes['Visual'] || 0,
        charisma: playerStats.attributes['Charisma'] || 0,
      }
      const scenarioObj = {
        title: scenario && (scenario["Dnd-Scenario"] || scenario.title) || '练习生日常',
        detail: currentStory || scenario?.startingPoint || scenario?.description || '你是一名SM娱乐公司的练习生，开启你的星光之路。',
      }
      const baseSkills = scenario?.baseSkills || {}
      // 用完整的 gameLog 作为历史
      const history = gameLog.map(item => {
        if (item.type === 'player') {
          return `[你选择了]: ${item.actionId || item.content}`;
        }
        return `[AI回复]: ${item.content}`;
      }).join('\n');

      const requestBody = { 
        player, 
        scenario: scenarioObj, 
        history, 
        baseSkills, 
        action: action === null ? undefined : action 
      };
      
      console.log('发送到API的完整数据:', JSON.stringify(requestBody, null, 2));
      
      const res = await fetch('/api/game-action/next-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) throw new Error('AI 剧情生成失败')
      const data = await res.json()
      console.log('API返回的完整数据:', JSON.stringify(data, null, 2));

      // 如果是开局（没有action），强制不允许属性变化
      if (!action) {
        data.appliedEffects = {};
      }

      setDmStory(data.story)
      setDmOptions(data.options)
      setDmHistory(prev => ([...prev, { summary: data.story }]))
      // AI 回复写入 chat_history
      if (user) {
        await supabase.from('chat_history').insert({
          user_id: user.id,
          message: data.story,
          role: 'assistant'
        });
      }
      // 若有属性变化，自动更新
      if (data.appliedEffects) {
        console.log('收到的属性变化:', data.appliedEffects);
        const attrMap = {
          vocal: 'Vocal',
          dance: 'Dance',
          rap: 'Rap',
          resilience: 'Resilience',
          creativity: 'Creativity',
          visual: 'Visual',
          charisma: 'Charisma',
        }
        const newAttributes = { ...playerStats.attributes }
        Object.entries(data.appliedEffects).forEach(([k, v]) => {
          if (attrMap[k] && typeof v === 'number') {
            console.log(`更新属性 ${k} -> ${attrMap[k]}: ${v}`);
            newAttributes[attrMap[k]] += v
          }
        })
        console.log('更新后的属性:', newAttributes);
        setPlayerStats(prev => ({
          ...prev,
          attributes: newAttributes
        }))
      } else {
        console.log('没有收到属性变化');
      }
    } catch (e) {
      console.error('fetchNextTurn 错误:', e)
      setDmStory('AI 剧情生成失败：' + (e?.message || e))
      setDmOptions([])
    } finally {
      setIsProcessing(false)
      console.log('fetchNextTurn 结束，isProcessing:', false)
    }
  }

  // 玩家选择分支
  async function handleOptionSelect(optionId) {
    const chosen = dmOptions.find(opt => opt.id === optionId)
    if (chosen) {
      setGameLog(prev => ([...prev, { type: 'player', content: chosen.text.replace(/（.*?）|\(.*?\)/g, '').trim(), actionId: optionId }]));
      // 写入 chat_history
      if (user) {
        await supabase.from('chat_history').insert({
          user_id: user.id,
          message: chosen.text.replace(/（.*?）|\(.*?\)/g, '').trim(),
          role: 'user'
        });
      }
      fetchNextTurn(chosen.text.replace(/（.*?）|\(.*?\)/g, '').trim(), dmStory)
    } else {
      fetchNextTurn(optionId, dmStory)
    }
  }

  // 玩家点击基础技能按钮
  function handleSkillClick(skillKey) {
    console.log('handleSkillClick 被点击', skillKey)
    fetchNextTurn(skillKey, dmStory)
  }

  // 玩家自定义输入
  async function handleCustomActionSubmit(e) {
    e.preventDefault()
    if (!currentAction.trim()) return
    setGameLog(prev => ([...prev, { type: 'player', content: currentAction.trim() }]))
    // 写入 chat_history
    if (user) {
      await supabase.from('chat_history').insert({
        user_id: user.id,
        message: currentAction.trim(),
        role: 'user'
      });
    }
    fetchNextTurn(currentAction.trim(), dmStory)
    setCurrentAction('')
  }

  // 处理玩家行动
  const handlePlayerAction = async (action) => {
    if (isProcessing) return
    
    setIsProcessing(true)
    setCurrentAction(action)
    
    try {
      const response = await fetch('/api/game-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          playerStats,
          gameLog: gameLog.slice(-5),
          scenario
        }),
      })

      if (!response.ok) {
        throw new Error('网络请求失败')
      }

      const data = await response.json()
      
      setGameLog(prev => [
        ...prev,
        { type: 'player', content: action },
        { type: 'dm', content: data.response }
      ])

      if (data.attributeChanges) {
        // 使用与fetchNextTurn相同的属性映射逻辑
        const attrMap = {
          vocal: 'Vocal',
          dance: 'Dance',
          rap: 'Rap',
          resilience: 'Resilience',
          creativity: 'Creativity',
          visual: 'Visual',
          charisma: 'Charisma',
        }
        const newAttributes = { ...playerStats.attributes }
        Object.entries(data.attributeChanges).forEach(([k, v]) => {
          if (attrMap[k] && typeof v === 'number') {
            newAttributes[attrMap[k]] += v
          }
        })
        setPlayerStats(prev => ({
          ...prev,
          attributes: newAttributes
        }))
      }

    } catch (err) {
      console.error('行动处理失败:', err)
      setGameLog(prev => [
        ...prev,
        { type: 'error', content: '行动处理失败，请重试。' }
      ])
    } finally {
      setIsProcessing(false)
      setCurrentAction('')
    }
  }

  const handleTalentSelect = (talent) => {
    // 重置所有属性为0，然后加上天赋加成
    const base = { Vocal: 0, Dance: 0, Rap: 0, Visual: 0, Charisma: 0, Resilience: 0, Creativity: 0 }
    const bonus = scenario.playerCustomizations.primaryTalent.content[talent].attributeBonus
    Object.entries(bonus).forEach(([k, v]) => { 
      // 确保属性名匹配
      if (base.hasOwnProperty(k)) {
        base[k] += v 
      }
    })
    setPlayerStats(prev => ({
      ...prev,
      primaryTalent: talent,
      personalityTrait: null, // 重置性格特质选择
      attributes: base
    }))
    // 选择天赋后直接进入性格特质选择步骤
    setCreationStep('personality')
  }

  const handlePersonalitySelect = (trait) => {
    setPlayerStats(prev => {
      // 先重置属性为基础值（天赋加成）
      const base = { Vocal: 0, Dance: 0, Rap: 0, Visual: 0, Charisma: 0, Resilience: 0, Creativity: 0 }
      if (prev.primaryTalent) {
        const talentBonus = scenario.playerCustomizations.primaryTalent.content[prev.primaryTalent].attributeBonus
        Object.entries(talentBonus).forEach(([k, v]) => { 
          // 确保属性名匹配
          if (base.hasOwnProperty(k)) {
            base[k] += v 
          }
        })
      }
      
      // 再加上性格特质加成
      const personalityBonus = scenario.playerCustomizations.personalityTrait.content[trait].attributeBonus
      Object.entries(personalityBonus).forEach(([k, v]) => { 
        // 确保属性名匹配
        if (base.hasOwnProperty(k)) {
          base[k] += v 
        }
      })
      
      return {
        ...prev,
        personalityTrait: trait,
        attributes: base
      }
    })
    // 选择性格特质后不再自动开始游戏，等待用户确认
  }

  const startGame = async () => {
      if (user) {
        await supabase
          .from('users_profile')
          .upsert({
            id: user.id,
            ability: playerStats
          });
      }
      setGameState('playing');
  }

  // 重新生成回复
  function handleRegenerate() {
    if (lastAction !== null && !isProcessing) {
      fetchNextTurn(lastAction)
    }
  }

  // 修改handleRestart为只弹出模态框
  const handleRestart = () => {
    setShowRestartModal(true);
  }

  // 真正执行重置的逻辑
  const doRestart = async () => {
    setShowRestartModal(false);
    // ...原有重置逻辑...
    setGameState('character-creation')
    setCreationStep('talent')
    setPlayerStats({
      attributes: {
        Vocal: 0,
        Dance: 0,
        Rap: 0,
        Visual: 0,
        Charisma: 0,
        Resilience: 0,
        Creativity: 0
      },
      primaryTalent: null,
      personalityTrait: null
    })
    setGameLog([])
    setCurrentAction('')
    setIsProcessing(false)
    setDmStory('')
    setDmOptions([])
    setDmHistory([])
    setLastAction(null)
    setAttributeChanges({})
    setLastAttributes({
      Vocal: 0,
      Dance: 0,
      Rap: 0,
      Visual: 0,
      Charisma: 0,
      Resilience: 0,
      Creativity: 0
    })
    setAttrAnim({})
    if (user) {
      try {
        await supabase
          .from('users_profile')
          .delete()
          .eq('id', user.id);
        await supabase
          .from('chat_history')
          .delete()
          .eq('user_id', user.id);
      } catch (error) {
        console.error('清除数据失败:', error);
      }
    }
  }

  useEffect(() => {
    if (gameState === 'playing') {
      audioRef.current && audioRef.current.play();
    } else {
      audioRef.current && audioRef.current.pause();
    }
  }, [gameState]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
  }, [muted]);

  if (checkingAuth) {
    return <div style={{textAlign:'center',marginTop:'4em'}}>正在校验登录状态...</div>;
  }

  if (loading) return <div className="p-4 text-blue-500">加载中...</div>
  if (error) return (
    <div className="p-4 text-red-500">
      <p>错误: {error}</p>
      <p className="mt-2 text-sm">
        请检查: <br/>
        1. 文件是否在 <code>public/scenarios/</code> 目录下<br/>
        2. 文件内容是否为合法JSON<br/>
        3. 控制台日志(F12)是否有更多信息
      </p>
    </div>
  )

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
      <RestartModal open={showRestartModal} onCancel={() => setShowRestartModal(false)} onConfirm={doRestart} />
      {/* 重新开始按钮 - 只在游戏进行中显示 */}
      {gameState === 'playing' && (
        <>
          <LogoutButton />
          <audio ref={audioRef} src="/bgm.mp3" loop />
          <button
            onClick={handleRestart}
            style={{
              position: 'fixed',
              top: '24px',
              right: '148px', // 向右移动2px，避免重叠
              zIndex: 1000,
              background: 'linear-gradient(90deg, #f8d6e5 60%, #d6e8f8 100%)',
              color: '#b07aff',
              border: 'none',
              borderRadius: '50%',
              boxShadow: '0 2px 12px 0 rgba(160, 200, 255, 0.10)',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s, transform 0.15s',
            }}
            className="glossy hover:scale-105 active:scale-95"
            title="重新开始游戏"
          >
            <svg 
              width="22" 
              height="22" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
          </button>
          <div
            style={{
              position: 'fixed',
              right: 32,
              bottom: 32,
              zIndex: 1000,
              background: 'linear-gradient(90deg, #f8d6e5 60%, #d6e8f8 100%)',
              color: '#b07aff',
              border: 'none',
              borderRadius: '50%',
              boxShadow: '0 2px 12px 0 rgba(160, 200, 255, 0.10)',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s, transform 0.15s',
            }}
            className="glossy hover:scale-105 active:scale-95"
            title={muted ? '点击开启音乐' : '点击静音'}
            onClick={() => setMuted(m => !m)}
          >
            {muted ? (
              // 静音icon
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : (
              // 音量icon
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19 5a9 9 0 0 1 0 14" />
              </svg>
            )}
          </div>
        </>
      )}
      
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '1.2em 0.5em 0.5em 0.5em',
          background: 'rgba(255,255,255,0.75)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px 0 rgba(200,160,255,0.10)',
          backdropFilter: 'blur(2px)',
          position: 'relative',
          top: 16,
          minHeight: 'calc(100vh - 32px)', // 固定最小高度
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <AttributeAnimationStyle />
        <div className="p-2 max-w-3xl mx-auto w-full flex-1 flex flex-col">
          <h1 className="text-2xl font-bold mb-3 text-center">SM练习生：星光之路</h1>
          
          {gameState === 'character-creation' && scenario && (
            <div className="space-y-4 flex-1">
              {/* 当前属性显示 - 固定在顶部 */}
              <div className="bg-white p-3 rounded-lg shadow sticky top-2 z-10">
                <h2 className="text-lg font-semibold mb-2">当前属性</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(playerStats.attributes).map(([attr, value]) => {
                    const anim = attrAnim[attr];
                    return (
                      <div
                        key={attr}
                        className={`p-2 bg-gray-50 rounded ${anim === 'up' ? 'attr-flash-up' : ''} ${anim === 'down' ? 'attr-flash-down' : ''}`}
                      >
                        <div className="text-sm font-medium">{attr}</div>
                        <div className={`text-xl font-bold text-indigo-600 ${anim === 'up' ? 'attr-animate-up' : ''} ${anim === 'down' ? 'attr-animate-down' : ''}`}>{value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 步骤指示器 */}
              {/* ... 删除步骤指示器相关代码 ... */}

              {/* 第一步：选择核心天赋 */}
              {creationStep === 'talent' && (
              <div className="bg-white p-3 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-2">选择你的核心天赋</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(scenario.playerCustomizations.primaryTalent.content).map(([key, talent]) => (
                    <button
                      key={key}
                      onClick={() => handleTalentSelect(key)}
                      className={`p-3 rounded text-left shadow transition-all duration-150 outline-none focus:ring-2 focus:ring-indigo-200 ${
                        playerStats.primaryTalent === key
                          ? 'bg-indigo-50'
                          : 'hover:bg-indigo-50'
                      }`}
                    >
                      <h3 className="font-medium mb-1 text-base">{key}</h3>
                      <p className="text-sm text-gray-600">{talent.description}</p>
                      <div className="mt-1 text-sm text-indigo-600">
                        属性加成: {Object.entries(talent.attributeBonus).map(([attr, value]) => 
                          `${attr}+${value}`
                        ).join(', ')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              )}

              {/* 第二步：选择性格特质 */}
              {creationStep === 'personality' && (
              <div className="bg-white p-3 rounded-lg shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">选择你的性格特质</h2>
                    <button
                      onClick={() => setCreationStep('talent')}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      ← 返回选择天赋
                    </button>
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {Object.entries(scenario.playerCustomizations.personalityTrait.content).map(([key, trait]) => (
                    <button
                      key={key}
                      onClick={() => handlePersonalitySelect(key)}
                      className={`p-3 rounded text-left shadow transition-all duration-150 outline-none focus:ring-2 focus:ring-indigo-200 ${
                        playerStats.personalityTrait === key
                          ? 'bg-indigo-50'
                          : 'hover:bg-indigo-50'
                      }`}
                    >
                      <h3 className="font-medium mb-1 text-base">{key}</h3>
                      <p className="text-sm text-gray-600">{trait.description}</p>
                      <div className="mt-1 text-sm text-indigo-600">
                        属性加成: {Object.entries(trait.attributeBonus).map(([attr, value]) => 
                          `${attr}+${value}`
                        ).join(', ')}
                      </div>
                    </button>
                  ))}
              </div>

                  {/* 开启练习生生涯按钮 */}
                  {playerStats.personalityTrait && (
                    <div className="text-center mt-3">
                      <button
                        onClick={startGame}
                        className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors shadow"
                      >
                        开启练习生生涯
                      </button>
                      </div>
                  )}
                </div>
              )}
            </div>
          )}

          {gameState === 'playing' && (
            <div className="space-y-4">
              <div className="bg-white p-3 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-2">你的属性</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(playerStats.attributes).map(([attr, value]) => {
                    const anim = attrAnim[attr];
                    return (
                      <div
                        key={attr}
                        className={`p-2 bg-gray-50 rounded ${anim === 'up' ? 'attr-flash-up' : ''} ${anim === 'down' ? 'attr-flash-down' : ''}`}
                      >
                        <div className="text-sm font-medium">{attr}</div>
                        <div className={`text-xl font-bold text-indigo-600 ${anim === 'up' ? 'attr-animate-up' : ''} ${anim === 'down' ? 'attr-animate-down' : ''}`}>{value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* 剧情发展区域，合并为一个完整历史日志，最新内容在底部，可滚动 */}
              <div className="bg-white p-3 rounded-lg shadow flex-1 flex flex-col" style={{ minHeight: '500px' }}>
                <h2 className="text-lg font-semibold mb-2">剧情发展</h2>
                <div 
                  className="flex-1 overflow-y-auto whitespace-pre-line text-sm mb-4" 
                  ref={logRef}
                  style={{
                    height: '200px',
                    maxHeight: '200px',
                  }}
                >
                  {gameLog.map((item, idx) => (
                    <div key={idx} className={item.type === 'ai' ? 'text-gray-800' : 'text-indigo-600'}>
                      {item.type === 'player' ? '[你选择了]: ' : ''}{item.content}
                    </div>
                  ))}
                  {isProcessing && (
                    <span className="flex justify-center items-center h-12">
                      <span className="inline-block w-8 h-8 border-4 border-indigo-300 border-t-transparent rounded-full animate-spin"></span>
                    </span>
                  )}
                </div>
                {/* 选项按钮：AI处理时隐藏 */}
                {!isProcessing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                    {dmOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleOptionSelect(opt.id)}
                        className="p-3 rounded text-left shadow transition-all duration-150 outline-none focus:ring-2 focus:ring-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-sm font-medium"
                      >
                        <div className="font-medium mb-1">{opt.text.replace(/（.*?）|\(.*?\)/g, '').trim()}</div>
                      </button>
                    ))}
                  </div>
                )}
                <form className="flex gap-2 mt-auto" onSubmit={handleCustomActionSubmit}>
                  <input
                    type="text"
                    value={currentAction}
                    onChange={(e) => setCurrentAction(e.target.value)}
                    placeholder="输入你的自定义行动..."
                    className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 transition-colors text-sm"
                  >
                    {isProcessing ? (
                      <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : '自定义行动'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}