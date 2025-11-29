'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  GitBranch,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalClients: number;
  clientsByStage: { stage: string; count: number; stageId: string }[];
  completedThisMonth: number;
  inProgress: number;
  recentClients: {
    id: string;
    name: string;
    currentStage: string;
    status: string;
    updatedAt: string;
  }[];
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-surface-100 animate-pulse">
          <div className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <div className="h-6 w-16 bg-surface-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-surface-100 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonFunnel() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-6 h-6 rounded-full bg-surface-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-surface-200 rounded mb-2 animate-pulse" />
            <div className="h-2 bg-surface-200 rounded-full animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonClient() {
  return (
    <div className="p-3 rounded-xl border border-surface-100">
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 w-24 bg-surface-200 rounded animate-pulse" />
        <div className="h-5 w-16 bg-surface-200 rounded animate-pulse" />
      </div>
      <div className="h-3 w-32 bg-surface-100 rounded animate-pulse" />
    </div>
  );
}

export default function DashboardPage() {
  const { user, accessToken } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [accessToken]);

  const statCards = stats ? [
    {
      title: 'Total de Clientes',
      value: stats.totalClients,
      icon: Users,
      color: 'text-primary-500',
      bgColor: 'bg-primary-50',
      href: '/clientes',
    },
    {
      title: 'Em Andamento',
      value: stats.inProgress,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      href: '/clientes?status=in_progress',
    },
    {
      title: 'Concluídos (Mês)',
      value: stats.completedThisMonth,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      href: '/clientes?status=completed',
    },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-700">
            Dashboard
          </h1>
          <p className="text-secondary-500 mt-1">
            Bem-vindo, {user?.name}! Aqui está o resumo do sistema.
          </p>
        </div>
        <Link href="/clientes/novo" className="btn-primary">
          <Users className="w-4 h-4" />
          Novo Cliente
        </Link>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          statCards.map((stat, index) => (
            <Link
              key={stat.title}
              href={stat.href}
              className="block"
            >
              <Card className="animate-slide-up hover:shadow-lg transition-all cursor-pointer" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-secondary-700">{stat.value}</p>
                    <p className="text-sm text-secondary-500">{stat.title}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      {/* Grid de conteúdo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clientes Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-500" />
                Clientes Recentes
              </span>
              <Link
                href="/clientes"
                className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1"
              >
                Ver todos
                <ArrowRight className="w-4 h-4" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <SkeletonClient />
                <SkeletonClient />
                <SkeletonClient />
                <SkeletonClient />
              </div>
            ) : stats && stats.recentClients.length > 0 ? (
              <div className="space-y-3">
                {stats.recentClients.map((client) => (
                  <Link
                    key={client.id}
                    href={`/clientes/${client.id}`}
                    className="block p-3 rounded-xl hover:bg-surface-50 transition-colors border border-surface-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-secondary-700">
                        {client.name}
                      </span>
                      <Badge
                        variant={client.status === 'completed' ? 'success' : 'warning'}
                      >
                        {client.status === 'completed' ? 'Concluído' : 'Em andamento'}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-500">
                      {client.currentStage}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-secondary-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-surface-400" />
                <p>Nenhum cliente cadastrado ainda</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Funil de Etapas */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              Funil de Etapas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <SkeletonFunnel />
            ) : stats && stats.clientsByStage.length > 0 ? (
              <div className="space-y-3">
                {stats.clientsByStage.map((item, index) => {
                  const maxCount = Math.max(...stats.clientsByStage.map(s => s.count), 1);
                  const percentage = (item.count / maxCount) * 100;

                  return (
                    <div key={item.stageId} className="flex items-center gap-4">
                      <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-600">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-secondary-700">
                            {item.stage}
                          </span>
                          <span className="text-sm font-bold text-secondary-600">
                            {item.count}
                          </span>
                        </div>
                        <div className="h-2 bg-surface-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-400 to-primary-500 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-secondary-500">
                <GitBranch className="w-12 h-12 mx-auto mb-3 text-surface-400" />
                <p>Nenhuma etapa com clientes ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
