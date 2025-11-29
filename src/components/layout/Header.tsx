'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import { cn } from '@/lib/utils/cn';
import {
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Menu,
  X,
} from 'lucide-react';

export function Header() {
  const router = useRouter();
  const { user, accessToken, logout } = useAuthStore();
  const toast = useToastStore();
  const { isOpen, toggle, toggleMobile, isMobileOpen } = useSidebarStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      toast.info('Você saiu do sistema');
      router.push('/login');
    }
  };

  return (
    <header className="h-20 bg-white border-b border-surface-200 flex items-center justify-between px-4 md:px-6 fixed top-0 left-0 right-0 z-50">
      {/* Lado esquerdo - Logo e toggle */}
      <div className="flex items-center gap-3">
        {/* Botão de toggle do sidebar - Desktop */}
        <button
          onClick={toggle}
          className="hidden md:flex p-2 rounded-xl text-secondary-500 hover:bg-surface-100 transition-colors"
          title={isOpen ? 'Recolher menu' : 'Expandir menu'}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Botão de toggle do sidebar - Mobile */}
        <button
          onClick={toggleMobile}
          className="md:hidden p-2 rounded-xl text-secondary-500 hover:bg-surface-100 transition-colors"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="https://sprmtggtqctxusgsamxp.supabase.co/storage/v1/object/public/publico/INDOR_Desk_logo2-removebg-preview.png"
            alt="INDOR Desk"
            width={220}
            height={80}
            className="h-12 md:h-14 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Lado direito - Ações */}
      <div className="flex items-center gap-2 md:gap-4">
        {/* Notificações */}
        <button className="relative p-2 rounded-xl text-secondary-500 hover:bg-surface-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Menu do usuário */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 md:gap-3 p-2 rounded-xl hover:bg-surface-100 transition-colors"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-secondary-700">
                {user?.name}
              </p>
              <p className="text-xs text-secondary-500 capitalize">
                {user?.role === 'admin' ? 'Administrador' : 'Operador'}
              </p>
            </div>
            <ChevronDown className={cn(
              'w-4 h-4 text-secondary-500 transition-transform hidden md:block',
              isUserMenuOpen && 'rotate-180'
            )} />
          </button>

          {/* Dropdown */}
          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-soft-lg border border-surface-200 overflow-hidden z-20 animate-slide-up">
                <div className="p-3 border-b border-surface-100">
                  <p className="text-sm font-medium text-secondary-700">
                    {user?.name}
                  </p>
                  <p className="text-xs text-secondary-500">
                    @{user?.username}
                  </p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-secondary-600 rounded-lg hover:bg-surface-100 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Meu Perfil
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-secondary-600 rounded-lg hover:bg-surface-100 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    Configurações
                  </button>
                </div>
                <div className="p-1 border-t border-surface-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair do Sistema
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
