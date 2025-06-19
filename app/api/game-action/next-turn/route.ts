import { NextRequest, NextResponse } from 'next/server';
import { nextTurn } from '../../../../lib/ai/prompt';
import { promises as fs } from "fs";

export async function POST(req: NextRequest) {
  try {
    const { player, scenario, action } = await req.json();
    console.log('收到请求数据:', { player, scenario, action });
    
    const systemPromptContent = await fs.readFile("lib/aiSystemPrompt.txt", "utf-8");
    console.log('系统提示内容:', systemPromptContent);
    
    const result = await nextTurn(player, scenario, action, systemPromptContent);
    console.log('AI返回结果:', result);
    
    return NextResponse.json(result);
  } catch (e: any) {
    console.error('API错误详情:', {
      message: e.message,
      stack: e.stack,
      cause: e.cause,
      response: e.response?.data || e.response,
    });
    
    return NextResponse.json(
      { 
        error: e.message || 'AI 生成失败',
        details: process.env.NODE_ENV === 'development' ? {
          stack: e.stack,
          cause: e.cause
        } : undefined
      }, 
      { status: 500 }
    );
  }
} 