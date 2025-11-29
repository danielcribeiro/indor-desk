'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  Users,
  Search,
  Plus,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  X,
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  birth_date: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  created_at: string;
  currentStage: { id: string; name: string } | null;
  currentStageStatus: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Stage {
  id: string;
  name: string;
  order_index: number;
}

export default function ClientesPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const toast = useToastStore();

  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClients = useCallback(async (page = 1, searchTerm = '', stageFilter = '') => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(stageFilter && { stage_id: stageFilter }),
      });

      const response = await fetch(`/api/clients?${params}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setClients(data.clients);
        setPagination(data.pagination);
      } else {
        toast.error('Erro ao carregar clientes');
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, toast]);

  const fetchStages = useCallback(async () => {
    try {
      const response = await fetch('/api/stages', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStages(data.stages || []);
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchClients();
    fetchStages();
  }, [fetchClients, fetchStages]);

  const handleSearch = () => {
    fetchClients(1, search, selectedStage);
  };

  const handleStageChange = (stageId: string) => {
    setSelectedStage(stageId);
    fetchClients(1, search, stageId);
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedStage('');
    fetchClients(1, '', '');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-700">
            Clientes
          </h1>
          <p className="text-secondary-500 mt-1">
            Gerencie todos os clientes e acompanhe suas jornadas
          </p>
        </div>
        <Link href="/clientes/novo">
          <Button>
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        </Link>
      </div>

      {/* Filtros */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex-1 w-full">
              <Input
                placeholder="Buscar por nome, responsável ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                leftIcon={<Search className="w-5 h-5" />}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none sm:w-64">
                <select
                  value={selectedStage}
                  onChange={(e) => handleStageChange(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 bg-white text-secondary-700 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                >
                  <option value="">Todas as etapas</option>
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              <Button onClick={handleSearch} className="shrink-0">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
            </div>
          </div>

          {/* Filtros ativos */}
          {(search || selectedStage) && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-sm text-secondary-600">
                <Filter className="w-4 h-4" />
                <span>Filtros ativos:</span>
              </div>
              {search && (
                <Badge variant="neutral" className="flex items-center gap-1">
                  Busca: {search}
                  <button
                    onClick={() => {
                      setSearch('');
                      fetchClients(1, '', selectedStage);
                    }}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {selectedStage && (
                <Badge variant="info" className="flex items-center gap-1">
                  Etapa: {stages.find((s) => s.id === selectedStage)?.name}
                  <button
                    onClick={() => handleStageChange('')}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs"
              >
                Limpar todos
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Lista de clientes */}
      <div className="table-container bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="w-16 h-16 text-surface-400 mb-4" />
            <p className="text-secondary-500 text-lg mb-2">Nenhum cliente encontrado</p>
            <p className="text-secondary-400 text-sm mb-4">
              {search ? 'Tente ajustar os termos de busca' : 'Cadastre o primeiro cliente para começar'}
            </p>
            {!search && (
              <Link href="/clientes/novo">
                <Button>
                  <Plus className="w-4 h-4" />
                  Cadastrar Cliente
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Responsável</th>
                <th>Etapa Atual</th>
                <th>Status</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => router.push(`/clientes/${client.id}`)}
                  className="cursor-pointer hover:bg-primary-50 transition-colors"
                >
                  <td className="font-medium text-secondary-700">{client.name}</td>
                  <td>{client.guardian_name || '-'}</td>
                  <td>
                    {client.currentStage ? (
                      <span className="text-sm">{client.currentStage.name}</span>
                    ) : (
                      <span className="text-secondary-400">-</span>
                    )}
                  </td>
                  <td>
                    <Badge
                      variant={
                        client.currentStageStatus === 'completed'
                          ? 'success'
                          : client.currentStageStatus === 'in_progress'
                          ? 'info'
                          : 'neutral'
                      }
                    >
                      {client.currentStageStatus === 'completed'
                        ? 'Concluído'
                        : client.currentStageStatus === 'in_progress'
                        ? 'Em andamento'
                        : 'Não iniciado'}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/clientes/${client.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                        Ver
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-secondary-500">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} clientes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchClients(pagination.page - 1, search, selectedStage)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <span className="px-3 py-1 text-sm text-secondary-600">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchClients(pagination.page + 1, search, selectedStage)}
              disabled={pagination.page === pagination.totalPages}
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
