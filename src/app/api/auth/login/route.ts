export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { verifyPassword } from '@/lib/auth/password';
import { generateTokenPair } from '@/lib/auth/jwt';
import { loginSchema } from '@/lib/validators/auth';
import { checkLoginRateLimit, resetLoginRateLimit } from '@/lib/utils/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    // Obter IP do cliente
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    // Verificar rate limit
    const rateLimit = checkLoginRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Muitas tentativas de login. Tente novamente mais tarde.',
          resetIn: Math.ceil(rateLimit.resetIn / 1000 / 60)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetIn / 1000)),
          }
        }
      );
    }

    const body = await request.json();
    
    // Validar entrada
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { username, password } = validation.data;

    // Buscar usuário
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Usuário ou senha incorretos' },
        { status: 401 }
      );
    }

    // Verificar se usuário está bloqueado
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const lockTimeRemaining = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 1000 / 60
      );
      return NextResponse.json(
        { 
          error: `Conta bloqueada. Tente novamente em ${lockTimeRemaining} minutos.` 
        },
        { status: 403 }
      );
    }

    // Verificar se usuário está ativo
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Usuário desativado. Entre em contato com o administrador.' },
        { status: 403 }
      );
    }

    // Verificar senha
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      // Incrementar tentativas de login falhas
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const updates: Record<string, unknown> = { 
        failed_login_attempts: newAttempts 
      };

      // Bloquear após 5 tentativas
      if (newAttempts >= 5) {
        updates.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      // Registrar log
      await supabase.from('access_logs').insert({
        user_id: user.id,
        action: 'login_failed',
        ip_address: ip,
        user_agent: request.headers.get('user-agent'),
        details: { attempts: newAttempts },
      });

      return NextResponse.json(
        { error: 'Usuário ou senha incorretos' },
        { status: 401 }
      );
    }

    // Login bem sucedido - resetar contador
    await supabase
      .from('users')
      .update({ 
        failed_login_attempts: 0, 
        locked_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    // Gerar tokens
    const { accessToken, refreshToken } = await generateTokenPair(user);

    // Resetar rate limit de login
    resetLoginRateLimit(ip);

    // Registrar log de acesso
    await supabase.from('access_logs').insert({
      user_id: user.id,
      action: 'login_success',
      ip_address: ip,
      user_agent: request.headers.get('user-agent'),
    });

    // Retornar usuário (sem a senha)
    const { password_hash: _, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      user: userWithoutPassword,
      accessToken,
    });

    // Definir refresh token como cookie httpOnly
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
