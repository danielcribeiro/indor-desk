'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/stores/authStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import {
  LayoutDashboard,
  Users,
  GitBranch,
  UserCog,
  ListTodo,
  FormInput,
  Shield,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const mainMenuItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Clientes',
    href: '/clientes',
    icon: Users,
  },
];

const adminMenuItems = [
  {
    label: 'Etapas',
    href: '/admin/etapas',
    icon: GitBranch,
  },
  {
    label: 'Atividades',
    href: '/admin/atividades',
    icon: ListTodo,
  },
  {
    label: 'Campos',
    href: '/admin/campos',
    icon: FormInput,
  },
  {
    label: 'Perfis',
    href: '/admin/perfis',
    icon: Shield,
  },
  {
    label: 'Usuários',
    href: '/admin/usuarios',
    icon: UserCog,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { isOpen, isMobileOpen, closeMobile } = useSidebarStore();
  const isAdmin = user?.role === 'admin';

  return (
    <>
      {/* Overlay para mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-20 left-0 h-[calc(100vh-5rem)] bg-white border-r border-surface-200 flex flex-col z-40 transition-all duration-300',
          // Desktop
          isOpen ? 'md:w-64' : 'md:w-20',
          // Mobile
          isMobileOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0'
        )}
      >
        {/* Menu principal */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            {mainMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                    isActive 
                      ? 'bg-primary-50 text-primary-600 font-medium' 
                      : 'text-secondary-600 hover:bg-surface-100',
                    !isOpen && 'md:justify-center md:px-3'
                  )}
                  title={!isOpen ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  <span className={cn(
                    'transition-opacity duration-200',
                    !isOpen && 'md:hidden'
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Menu Admin */}
          {isAdmin && (
            <div className="mt-8">
              <h3 className={cn(
                'px-4 text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-3 transition-opacity duration-200',
                !isOpen && 'md:hidden'
              )}>
                Administração
              </h3>
              {!isOpen && (
                <div className="hidden md:block w-full h-px bg-surface-200 my-3" />
              )}
              <div className="space-y-1">
                {adminMenuItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobile}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                        isActive 
                          ? 'bg-primary-50 text-primary-600 font-medium' 
                          : 'text-secondary-600 hover:bg-surface-100',
                        !isOpen && 'md:justify-center md:px-3'
                      )}
                      title={!isOpen ? item.label : undefined}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      <span className={cn(
                        'transition-opacity duration-200',
                        !isOpen && 'md:hidden'
                      )}>
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className={cn(
          'p-4 border-t border-surface-200 transition-opacity duration-200',
          !isOpen && 'md:hidden'
        )}>
          <p className="text-xs text-center text-secondary-400">
            v1.0.0 • INDOR
          </p>
        </div>
      </aside>
    </>
  );
}
