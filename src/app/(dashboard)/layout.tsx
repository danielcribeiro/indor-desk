'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ToastContainer } from '@/components/ui/Toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, accessToken, setAuth, logout } = useAuthStore();
  const { toasts, removeToast } = useToastStore();
  const { isOpen } = useSidebarStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated || !accessToken) {
        router.replace('/login');
        return;
      }

      try {
        // Verificar se o token ainda é válido
        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          // Tentar refresh
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
          });

          if (refreshResponse.ok) {
            const data = await refreshResponse.json();
            setAuth(data.user, data.accessToken);
          } else {
            logout();
            router.replace('/login');
            return;
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        logout();
        router.replace('/login');
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [isAuthenticated, accessToken, router, setAuth, logout]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mesh-pattern">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
          <p className="text-secondary-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-100">
      {/* Header fixo no topo */}
      <Header />
      
      {/* Sidebar - abaixo do header */}
      <Sidebar />
      
      {/* Conteúdo principal */}
      <main 
        className={cn(
          'pt-20 min-h-screen transition-all duration-300',
          // Desktop
          isOpen ? 'md:ml-64' : 'md:ml-20',
          // Mobile - sem margin
          'ml-0'
        )}
      >
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
