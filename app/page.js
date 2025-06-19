import Image from "next/image";
import Link from "next/link";

export default function Home() {
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
          maxWidth: 800,
          margin: '0 auto',
          padding: '4em 2em',
          background: 'rgba(255,255,255,0.85)',
          borderRadius: '24px',
          boxShadow: '0 8px 32px 0 rgba(200,160,255,0.15)',
          backdropFilter: 'blur(8px)',
          position: 'relative',
          top: 40,
        }}
      >
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">SM练习生</h1>
          <h2 className="text-3xl font-semibold text-indigo-600 mb-6">星光之路</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            欢迎来到SM娱乐公司！在这里，你将开启一段充满挑战与机遇的练习生生涯。
            通过AI驱动的剧情体验，培养你的各项技能，成为真正的明星。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">🎵 核心技能</h3>
            <p className="text-gray-600 mb-4">
              培养声乐、舞蹈、说唱、视觉表现等核心技能，每个选择都会影响你的成长轨迹。
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-indigo-50 p-2 rounded">声乐 Vocal</div>
              <div className="bg-indigo-50 p-2 rounded">舞蹈 Dance</div>
              <div className="bg-indigo-50 p-2 rounded">说唱 Rap</div>
              <div className="bg-indigo-50 p-2 rounded">视觉 Visual</div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-6 rounded-lg border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-3">🌟 个性特质</h3>
            <p className="text-gray-600 mb-4">
              发展魅力、韧性、创造力等个人特质，这些将决定你在娱乐圈的独特定位。
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-purple-50 p-2 rounded">魅力 Charisma</div>
              <div className="bg-purple-50 p-2 rounded">韧性 Resilience</div>
              <div className="bg-purple-50 p-2 rounded">创造力 Creativity</div>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              登录账号
            </Link>
            <Link
              href="/signup"
              className="px-8 py-4 bg-white text-indigo-600 font-medium rounded-lg border-2 border-indigo-600 hover:bg-indigo-50 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              注册新账号
            </Link>
          </div>
          
          <p className="text-sm text-gray-500">
            开始你的练习生生涯，成为下一个超级巨星！
          </p>
        </div>
      </div>
    </div>
  );
}
