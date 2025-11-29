'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  GitBranch,
  Plus,
  Edit,
  Trash2,
  Loader2,
  GripVertical,
  ListTodo,
} from 'lucide-react';
import Link from 'next/link';

interface Stage {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  stage_activities: { id: string }[];
}

export default function EtapasPage() {
  const { accessToken, user } = useAuthStore();
  const toast = useToastStore();

  const [stages, setStages] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    order_index: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStages = useCallback(async () => {
    try {
      const response = await fetch('/api/stages?include_inactive=true', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStages(data.stages);
      } else {
        toast.error('Erro ao carregar etapas');
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
      toast.error('Erro ao carregar etapas');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, toast]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  const handleOpenModal = (stage?: Stage) => {
    if (stage) {
      setEditingStage(stage);
      setFormData({
        name: stage.name,
        description: stage.description || '',
        order_index: stage.order_index,
      });
    } else {
      setEditingStage(null);
      setFormData({
        name: '',
        description: '',
        order_index: stages.length + 1,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingStage ? `/api/stages/${editingStage.id}` : '/api/stages';
      const method = editingStage ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingStage ? 'Etapa atualizada com sucesso!' : 'Etapa criada com sucesso!'
        );
        setIsModalOpen(false);
        fetchStages();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar etapa');
      }
    } catch (error) {
      console.error('Error saving stage:', error);
      toast.error('Erro ao salvar etapa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (stage: Stage) => {
    try {
      const response = await fetch(`/api/stages/${stage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ is_active: !stage.is_active }),
      });

      if (response.ok) {
        toast.success(
          stage.is_active ? 'Etapa desativada!' : 'Etapa ativada!'
        );
        fetchStages();
      } else {
        toast.error('Erro ao alterar status da etapa');
      }
    } catch (error) {
      console.error('Error toggling stage:', error);
      toast.error('Erro ao alterar status da etapa');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-secondary-500">Acesso não autorizado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-700">
            Etapas do Processo
          </h1>
          <p className="text-secondary-500 mt-1">
            Configure as etapas da jornada do cliente
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4" />
          Nova Etapa
        </Button>
      </div>

      {/* Lista de etapas */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-surface-200">
            <GitBranch className="w-16 h-16 text-surface-400 mb-4" />
            <p className="text-secondary-500 text-lg">Nenhuma etapa encontrada</p>
          </div>
        ) : (
          stages
            .sort((a, b) => a.order_index - b.order_index)
            .map((stage) => (
              <div
                key={stage.id}
                className={`bg-white rounded-xl border p-4 transition-all ${
                  stage.is_active ? 'border-surface-200' : 'border-red-200 bg-red-50/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 text-primary-600 font-bold">
                      {stage.order_index}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-secondary-700">
                          {stage.name}
                        </h3>
                        {!stage.is_active && (
                          <Badge variant="danger">Inativa</Badge>
                        )}
                      </div>
                      {stage.description && (
                        <p className="text-sm text-secondary-500 mt-1">
                          {stage.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/atividades?stage=${stage.id}`}>
                      <Button size="sm" variant="outline">
                        <ListTodo className="w-4 h-4" />
                        {stage.stage_activities?.length || 0} atividades
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleOpenModal(stage)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(stage)}
                    >
                      {stage.is_active ? (
                        <Trash2 className="w-4 h-4 text-red-500" />
                      ) : (
                        <GitBranch className="w-4 h-4 text-green-500" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))
        )}
      </div>

      {/* Modal de criação/edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStage ? 'Editar Etapa' : 'Nova Etapa'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome da Etapa"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Textarea
            label="Descrição"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />
          <Input
            label="Ordem"
            type="number"
            min={1}
            value={formData.order_index}
            onChange={(e) =>
              setFormData({ ...formData, order_index: parseInt(e.target.value) })
            }
            required
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingStage ? 'Salvar' : 'Criar Etapa'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
