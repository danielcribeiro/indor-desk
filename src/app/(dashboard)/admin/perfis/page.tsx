'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Calendar,
  Eye,
  Lock,
  Users,
  AlertTriangle,
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  user_count?: number;
}

export default function PerfisPage() {
  const { accessToken, user: currentUser } = useAuthStore();
  const toast = useToastStore();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null);

  const fetchProfiles = useCallback(async () => {
    try {
      const response = await fetch('/api/profiles?include_count=true', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfiles(data.profiles || []);
      } else {
        toast.error('Erro ao carregar perfis');
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Erro ao carregar perfis');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, toast]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleViewProfile = (profile: Profile) => {
    setSelectedProfile(profile);
    setIsViewModalOpen(true);
  };

  const handleOpenEditModal = (profile?: Profile) => {
    if (profile) {
      setEditingProfile(profile);
      setFormData({
        name: profile.name,
        description: profile.description || '',
      });
    } else {
      setEditingProfile(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setIsViewModalOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingProfile ? `/api/profiles/${editingProfile.id}` : '/api/profiles';
      const method = editingProfile ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
        }),
      });

      if (response.ok) {
        toast.success(
          editingProfile ? 'Perfil atualizado com sucesso!' : 'Perfil criado com sucesso!'
        );
        setIsModalOpen(false);
        fetchProfiles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar perfil');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Erro ao salvar perfil');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (profile: Profile) => {
    // Verificar se é perfil do sistema
    if (profile.is_system) {
      toast.error('Este perfil do sistema não pode ser excluído');
      return;
    }

    // Verificar se tem usuários vinculados
    if (profile.user_count && profile.user_count > 0) {
      toast.error(`Não é possível excluir. Existem ${profile.user_count} usuário(s) vinculado(s) a este perfil.`);
      return;
    }

    try {
      const response = await fetch(`/api/profiles/${profile.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success('Perfil excluído com sucesso!');
        setDeleteConfirm(null);
        setIsViewModalOpen(false);
        fetchProfiles();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao excluir perfil');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Erro ao excluir perfil');
    }
  };

  // Verificar se o usuário atual é administrador
  const currentUserIsAdmin = currentUser?.role === 'admin';

  if (!currentUserIsAdmin) {
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
            Perfis de Usuário
          </h1>
          <p className="text-secondary-500 mt-1">
            Gerencie os perfis de acesso dos usuários
          </p>
        </div>
        <Button onClick={() => handleOpenEditModal()}>
          <Plus className="w-4 h-4" />
          Novo Perfil
        </Button>
      </div>

      {/* Informações */}
      <Card>
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Sobre os Perfis</p>
            <p>
              Os perfis determinam quais atividades um usuário pode marcar como concluída. 
              O perfil <strong>Administrador</strong> tem acesso total ao sistema e não pode ser excluído.
            </p>
          </div>
        </div>
      </Card>

      {/* Grid de perfis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <Shield className="w-16 h-16 text-surface-400 mb-4" />
            <p className="text-secondary-500 text-lg">Nenhum perfil encontrado</p>
            <p className="text-secondary-400 text-sm mb-4">
              Crie perfis para controlar as permissões dos usuários
            </p>
          </div>
        ) : (
          profiles.map((profile) => (
            <Card 
              key={profile.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewProfile(profile)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  profile.is_system ? 'bg-amber-100' : 'bg-primary-100'
                }`}>
                  {profile.is_system ? (
                    <Lock className="w-6 h-6 text-amber-600" />
                  ) : (
                    <Shield className="w-6 h-6 text-primary-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-secondary-700">{profile.name}</h3>
                    {profile.is_system && (
                      <Badge variant="warning" className="text-xs">Sistema</Badge>
                    )}
                  </div>
                  {profile.description && (
                    <p className="text-sm text-secondary-500 mt-1 line-clamp-2">{profile.description}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-surface-200 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-secondary-400">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(profile.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-3">
                  {profile.user_count !== undefined && (
                    <div className="flex items-center gap-1 text-xs text-secondary-500">
                      <Users className="w-3 h-3" />
                      <span>{profile.user_count}</span>
                    </div>
                  )}
                  <Eye className="w-4 h-4 text-secondary-400" />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de visualização */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Detalhes do Perfil"
      >
        {selectedProfile && (
          <div className="space-y-6">
            {/* Info do perfil */}
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                selectedProfile.is_system ? 'bg-amber-100' : 'bg-primary-100'
              }`}>
                {selectedProfile.is_system ? (
                  <Lock className="w-8 h-8 text-amber-600" />
                ) : (
                  <Shield className="w-8 h-8 text-primary-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-secondary-700">{selectedProfile.name}</h3>
                  {selectedProfile.is_system && (
                    <Badge variant="warning">Sistema</Badge>
                  )}
                </div>
                {selectedProfile.description && (
                  <p className="text-secondary-500 mt-1">{selectedProfile.description}</p>
                )}
              </div>
            </div>

            {/* Detalhes */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-secondary-600">
                <Calendar className="w-5 h-5 text-secondary-400" />
                <span>Criado em: {new Date(selectedProfile.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              {selectedProfile.user_count !== undefined && (
                <div className="flex items-center gap-3 text-secondary-600">
                  <Users className="w-5 h-5 text-secondary-400" />
                  <span>{selectedProfile.user_count} usuário(s) vinculado(s)</span>
                </div>
              )}
            </div>

            {/* Aviso para perfil do sistema */}
            {selectedProfile.is_system && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-medium">Perfil do Sistema</p>
                  <p>Este perfil não pode ser alterado ou excluído pois é essencial para o funcionamento do sistema.</p>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-4 border-t border-surface-200">
              <Button
                variant="ghost"
                onClick={() => setIsViewModalOpen(false)}
              >
                Fechar
              </Button>
              {!selectedProfile.is_system && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteConfirm(selectedProfile)}
                    disabled={selectedProfile.user_count !== undefined && selectedProfile.user_count > 0}
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </Button>
                  <Button onClick={() => handleOpenEditModal(selectedProfile)}>
                    <Edit className="w-4 h-4" />
                    Editar
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de criação/edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProfile ? 'Editar Perfil' : 'Novo Perfil'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do Perfil *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Avaliador, Atendente..."
          />
          <Textarea
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descreva as responsabilidades deste perfil..."
            rows={3}
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
              {editingProfile ? 'Salvar' : 'Criar Perfil'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar Exclusão"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Tem certeza que deseja excluir o perfil <strong>{deleteConfirm?.name}</strong>?
          </p>
          {deleteConfirm?.user_count !== undefined && deleteConfirm.user_count > 0 ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Não é possível excluir</p>
                <p>Existem {deleteConfirm.user_count} usuário(s) vinculado(s) a este perfil. 
                Altere o perfil desses usuários antes de excluir.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-secondary-500">
              Esta ação não pode ser desfeita.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirm(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleteConfirm?.user_count !== undefined && deleteConfirm.user_count > 0}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
