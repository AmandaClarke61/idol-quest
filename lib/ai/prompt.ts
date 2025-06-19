// DND 风格剧情 prompt 组装与 AI 响应解析
import { GoogleGenAI } from "@google/genai";

console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY);

// 你需要在 .env.local 配置 GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 玩家与场景类型定义
export interface Player {
  name: string;
  level: number;
  vocal: number;
  dance: number;
  rap: number;
  resilience: number;
  creativity: number;
  visual: number;
  charisma: number;
}

export interface Scenario {
  title: string;
  detail: string;
}

// AI 返回的结构
export interface DMOption {
  id: string;
  text: string;
}
export interface DMResponse {
  story: string;
  options: DMOption[];
  appliedEffects?: Record<string, number>;
}

const ATTR_MAP = {
  '声乐': 'vocal',
  '舞蹈': 'dance',
  '说唱': 'rap',
  '韧性': 'resilience',
  '创造力': 'creativity',
  '视觉': 'visual',
  '魅力': 'charisma',
  'vocal': 'vocal',
  'dance': 'dance',
  'rap': 'rap',
  'resilience': 'resilience',
  'creativity': 'creativity',
  'visual': 'visual',
  'charisma': 'charisma'
};
function mapEffects(effects: Record<string, any>) {
  const mapped: Record<string, number> = {};
  for (const [k, v] of Object.entries(effects || {})) {
    const key = ATTR_MAP[k];
    if (key) mapped[key] = typeof v === 'string' ? parseInt(v, 10) : v;
  }
  return mapped;
}

// 组装 prompt
export function buildPrompt(player: Player, scenario: Scenario, action?: string) {
  return `
- 场景：${scenario.title}
- 情景：${scenario.detail}
- 玩家选择：${action || '无'}
- 玩家属性：声乐${player.vocal} 舞蹈${player.dance} 说唱${player.rap} 韧性${player.resilience} 创造力${player.creativity} 视觉${player.visual} 魅力${player.charisma}

请严格用如下JSON格式输出：
（注意：
1. appliedEffects 字段必须存在，且只允许出现 vocal、dance、rap、resilience、creativity、visual、charisma 这7个英文属性名，禁止出现中文或其他属性名
2. 属性变化规则：
   - 根据玩家选择的合理性和结果来判定属性变化
   - 成功且合理的选择：+1到+2
   - 有挑战但成功的选择：+1
   - 失败或不当的选择：-1
   - 中性或普通的选择：0（不变化）
   - 如果玩家还没有做出任何选择（即 action 为空或未传），appliedEffects 字段必须为空对象 {}，不能有任何属性变化
3. 每次行动通常会影响1-2个相关属性
4. options 字段必须是2-4个不同的选项，且内容不能重复，且与当前剧情紧密相关）

\`\`\`json
{
  "story": "...",
  "options": [
    { "id": "A", "text": "..." },
    { "id": "B", "text": "..." }
  ],
  "appliedEffects": {
    "vocal": 1
  }
}
\`\`\`

示例说明：上面的示例展示了一个成功的行动，玩家在声乐方面有所提升。请根据实际情况判断：成功的选择给予正面奖励，失败的选择给予负面惩罚，普通的选择可能没有变化。
`;
}

// nextTurn 现在支持 systemInstruction 参数
export async function nextTurn(
  player: Player,
  scenario: Scenario,
  action?: string,
  systemInstruction?: string
): Promise<DMResponse> {
  const prompt = buildPrompt(player, scenario, action);
  console.log('----- 传给 Gemini 的 Prompt 内容 -----');
  console.log(prompt);
  console.log('------------------------------------');
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      ...(systemInstruction ? { system_instruction: systemInstruction } : {}),
      generationConfig: { maxOutputTokens: 512 }
    } as any);

    // 兼容不同返回结构
    let content = '';
    if (response.text) {
      content = response.text;
    } else if (response.candidates?.[0]?.content?.parts?.[0]?.text) {
      content = String(response.candidates[0].content.parts[0].text);
    } else if (response.candidates?.[0]?.content?.parts?.[0]) {
      content = String(response.candidates[0].content.parts[0]);
    } else {
      console.error('无法解析的 Gemini 响应:', response);
      throw new Error('AI 返回格式异常: ' + JSON.stringify(response));
    }
    console.log('Gemini原始返回内容:', content);

    // 提取 JSON
    let jsonStr = '';
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      jsonStr = content.slice(start, end + 1);
    } else {
      console.error('无法找到JSON内容，原始返回:', content);
      throw new Error('AI返回内容格式错误，无法解析JSON。原始内容：' + content);
    }
    
    console.log('准备解析的jsonStr:', jsonStr);
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error('JSON.parse 失败:', e);
      console.error('尝试解析的JSON字符串:', jsonStr);
      throw new Error('JSON解析失败: ' + e.message);
    }

    // 验证必要字段
    if (!parsed.story || !Array.isArray(parsed.options) || !parsed.appliedEffects) {
      console.error('缺少必要字段，已解析的数据:', parsed);
      throw new Error('AI返回数据缺少必要字段');
    }

    // 验证 appliedEffects 字段
    const validAttributes = ['vocal', 'dance', 'rap', 'resilience', 'creativity', 'visual', 'charisma'];
    const invalidAttributes = Object.keys(parsed.appliedEffects).filter(key => !validAttributes.includes(key));
    if (invalidAttributes.length > 0) {
      console.error('发现无效的属性名:', invalidAttributes);
      throw new Error('AI返回了无效的属性名: ' + invalidAttributes.join(', '));
    }

    // 处理appliedEffects
    parsed.appliedEffects = mapEffects(parsed.appliedEffects) || {};
    console.log('最终parsed:', parsed);
    
    const cleanStoryText = cleanStory(parsed.story, parsed.options);
    return {
      story: cleanStoryText,
      options: parsed.options || [],
      appliedEffects: parsed.appliedEffects || {}
    };
  } catch (e) {
    console.error('nextTurn 执行错误:', e);
    throw e;
  }
}

function cleanStory(story: string, options: DMOption[]): string {
  if (!story) return '';
  // 构造所有选项文本的正则
  const optionTexts = options.map(opt => opt.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  // 匹配以A. xxx、B. xxx等开头的段落
  const optionBlockReg = new RegExp(
    '(\n?([A-D]\\.\\s*(' + optionTexts.join('|') + '))\\s*)+$'
  );
  return story.replace(optionBlockReg, '').trim();
} 