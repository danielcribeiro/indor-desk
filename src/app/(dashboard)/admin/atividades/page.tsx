'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  ListTodo,
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckSquare,
  Users,
} from 'lucide-react';

interface Stage {
  id: string;
  name: string;
  order_index: number;
}

interface Profile {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  is_required: boolean;
  allowed_profiles: string[] | null;
  stage: Stage;
}

export default function AtividadesPage() {
  const searchParams = useSearchParams();
  const stageIdParam = searchParams.get('stage');

  const { accessToken, user } = useAuthStore();
  const toast = useToastStore();

  const [stages, setStages] = useState<Stage[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>(stageIdParam || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [formData, setFormData] = useState({
    stage_id: '',
    name: '',
    description: '',
    order_index: 1,
    is_required: true,
    allowed_profiles: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStages = useCallback(async () => {
    try {
      const response = await fetch('/api/stages', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStages(data.stages);
        if (!selectedStage && data.stages.length > 0) {
          setSelectedStage(stageIdParam || data.stages[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
    }
  }, [accessToken, selectedStage, stageIdParam]);

  const fetchProfiles = useCallback(async () => {
    try {
      const response = await fetch('/api/profiles', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  }, [accessToken]);

  const fetchActivities = useCallback(async () => {
    if (!selectedStage) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/activities?stage_id=${selectedStage}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      } else {
        toast.error('Erro ao carregar atividades');
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      toast.error('Erro ao carregar atividades');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, selectedStage, toast]);

  useEffect(() => {
    fetchStages();
    fetchProfiles();
  }, [fetchStages, fetchProfiles]);

  useEffect(() => {
    if (selectedStage) {
      fetchActivities();
    }
  }, [selectedStage, fetchActivities]);

  const handleOpenModal = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity);
      setFormData({
        stage_id: activity.stage.id,
        name: activity.name,
        description: activity.description || '',
        order_index: activity.order_index,
        is_required: activity.is_required,
        allowed_profiles: activity.allowed_profiles || [],
      });
    } else {
      setEditingActivity(null);
      setFormData({
        stage_id: selectedStage,
        name: '',
        description: '',
        order_index: activities.length + 1,
        is_required: true,
        allowed_profiles: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleProfileToggle = (profileId: string) => {
    setFormData((prev) => {
      const isSelected = prev.allowed_profiles.includes(profileId);
      return {
        ...prev,
        allowed_profiles: isSelected
          ? prev.allowed_profiles.filter((id) => id !== profileId)
          : [...prev.allowed_profiles, profileId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingActivity
        ? `/api/activities/${editingActivity.id}`
        : '/api/activities';
      const method = editingActivity ? 'PUT' : 'POST';

      const bodyData = editingActivity
        ? {
            name: formData.name,
            description: formData.description || null,
            order_index: formData.order_index,
            is_required: formData.is_required,
            allowed_profiles: formData.allowed_profiles,
          }
        : formData;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        toast.success(
          editingActivity
            ? 'Atividade atualizada com sucesso!'
            : 'Atividade criada com sucesso!'
        );
        setIsModalOpen(false);
        fetchActivities();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar atividade');
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      toast.error('Erro ao salvar atividade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (activity: Activity) => {
    if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;

    try {
      const response = await fetch(`/api/activities/${activity.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success('Atividade excluída!');
        fetchActivities();
      } else {
        toast.error('Erro ao excluir atividade');
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast.error('Erro ao excluir atividade');
    }
  };

  const getProfileNames = (profileIds: string[] | null) => {
    if (!profileIds || profileIds.length === 0) return 'Apenas Admin';
    return profileIds
      .map((id) => profiles.find((p) => p.id === id)?.name)
      .filter(Boolean)
      .join(', ');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold text-secondary-700">
            Atividades
          </h1>
          <p className="text-secondary-500 mt-1">
            Gerencie as atividades de cada etapa
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} disabled={!selectedStage}>
          <Plus className="w-4 h-4" />
          Nova Atividade
        </Button>
      </div>

      {/* Filtro por etapa */}
      <div className="bg-white rounded-xl border border-surface-200 p-4">
        <Select
          label="Selecionar Etapa"
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          options={stages.map((s) => ({
            value: s.id,
            label: `${s.order_index}. ${s.name}`,
          }))}
          placeholder="Selecione uma etapa..."
        />
      </div>

      {/* Lista de atividades */}
      {selectedStage && (
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-surface-200">
              <ListTodo className="w-16 h-16 text-surface-400 mb-4" />
              <p className="text-secondary-500 text-lg">
                Nenhuma atividade cadastrada para esta etapa
              </p>
              <Button
                className="mt-4"
                onClick={() => handleOpenModal()}
              >
                <Plus className="w-4 h-4" />
                Adicionar Atividade
              </Button>
            </div>
          ) : (
            activities
              .sort((a, b) => a.order_index - b.order_index)
              .map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white rounded-xl border border-surface-200 p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50 text-primary-600 shrink-0">
                        <CheckSquare className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-secondary-700">
                            {activity.order_index}. {activity.name}
                          </h3>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-secondary-500 mt-1">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-secondary-400">
                          <Users className="w-3 h-3" />
                          <span>Perfis: {getProfileNames(activity.allowed_profiles)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenModal(activity)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(activity)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Modal de criação/edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingActivity ? 'Editar Atividade' : 'Nova Atividade'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome da Atividade *"
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ordem"
              type="number"
              min={1}
              value={formData.order_index}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  order_index: parseInt(e.target.value),
                })
              }
              required
            />
          </div>

          {/* Perfis permitidos */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Perfis que podem concluir esta atividade
            </label>
            <p className="text-xs text-secondary-500 mb-3">
              Se nenhum perfil for selecionado, apenas administradores poderão concluir.
            </p>
            {profiles.length === 0 ? (
              <p className="text-sm text-secondary-400 italic">
                Nenhum perfil cadastrado. Cadastre perfis em Administração → Perfis.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profiles.map((profile) => {
                  const isSelected = formData.allowed_profiles.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => handleProfileToggle(profile.id)}
                      className={`
                        px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                        ${
                          isSelected
                            ? 'bg-primary-500 text-white'
                            : 'bg-surface-100 text-secondary-600 hover:bg-surface-200'
                        }
                      `}
                    >
                      {profile.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingActivity ? 'Salvar' : 'Criar Atividade'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
