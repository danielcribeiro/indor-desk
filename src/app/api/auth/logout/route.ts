import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (token) {
      const payload = await verifyToken(token);
      
      if (payload) {
        // Registrar log de logout
        const ip = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
        
        await supabase.from('access_logs').insert({
          user_id: payload.userId,
          action: 'logout',
          ip_address: ip,
          user_agent: request.headers.get('user-agent'),
        });
      }
    }

    const response = NextResponse.json({ success: true });

    // Limpar refresh token
    response.cookies.delete('refreshToken');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
