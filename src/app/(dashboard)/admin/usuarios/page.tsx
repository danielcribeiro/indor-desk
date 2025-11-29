'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import {
  Users,
  Plus,
  Edit,
  Loader2,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle,
  Info,
  Phone,
  Calendar,
  Shield,
  Eye,
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  description: string | null;
  is_system?: boolean;
}

interface User {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'operator';
  profile_id: string | null;
  profile?: Profile | null;
  is_active: boolean;
  created_at: string;
}

interface ValidationErrors {
  username?: string;
  password?: string;
  name?: string;
  phone?: string;
  profile_id?: string;
}

export default function UsuariosPage() {
  const { accessToken, user: currentUser } = useAuthStore();
  const toast = useToastStore();

  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    phone: '',
    profile_id: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        toast.error('Erro ao carregar usuários');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, toast]);

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

  useEffect(() => {
    fetchUsers();
    fetchProfiles();
  }, [fetchUsers, fetchProfiles]);

  const isAdmin = (user: User) => {
    return user.profile?.name === 'Administrador' || user.profile?.is_system;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome completo é obrigatório';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(formData.name.trim())) {
      newErrors.name = 'Nome deve conter apenas letras e espaços';
    }

    if (!editingUser) {
      if (!formData.username.trim()) {
        newErrors.username = 'Nome de usuário é obrigatório';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Nome de usuário deve ter pelo menos 3 caracteres';
      } else if (formData.username.length > 20) {
        newErrors.username = 'Nome de usuário deve ter no máximo 20 caracteres';
      } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
        newErrors.username = 'Nome de usuário deve conter apenas letras, números e underscore';
      }
    }

    if (!editingUser || formData.password) {
      if (!editingUser && !formData.password) {
        newErrors.password = 'Senha é obrigatória';
      } else if (formData.password && formData.password.length < 8) {
        newErrors.password = 'Senha deve ter pelo menos 8 caracteres';
      } else if (formData.password && !/(?=.*[a-z])/.test(formData.password)) {
        newErrors.password = 'Senha deve conter pelo menos uma letra minúscula';
      } else if (formData.password && !/(?=.*[A-Z])/.test(formData.password)) {
        newErrors.password = 'Senha deve conter pelo menos uma letra maiúscula';
      } else if (formData.password && !/(?=.*\d)/.test(formData.password)) {
        newErrors.password = 'Senha deve conter pelo menos um número';
      } else if (formData.password && !/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.password)) {
        newErrors.password = 'Senha deve conter pelo menos um caractere especial (!@#$%^&*...)';
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    } else {
      const phoneClean = formData.phone.replace(/\D/g, '');
      if (phoneClean.length < 10 || phoneClean.length > 11) {
        newErrors.phone = 'Telefone deve ter 10 ou 11 dígitos (com DDD)';
      }
    }

    if (!formData.profile_id) {
      newErrors.profile_id = 'Perfil de atuação é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleOpenEditModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: '',
        name: user.name,
        phone: user.phone || '',
        profile_id: user.profile_id || '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        name: '',
        phone: '',
        profile_id: '',
      });
    }
    setErrors({});
    setIsViewModalOpen(false);
    setIsModalOpen(true);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setFormData({ ...formData, phone: formatted });
    if (errors.phone) {
      setErrors({ ...errors, phone: undefined });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      // Determinar o role baseado no perfil selecionado
      const selectedProfile = profiles.find(p => p.id === formData.profile_id);
      const role = selectedProfile?.name === 'Administrador' ? 'admin' : 'operator';

      const bodyData = editingUser
        ? {
            name: formData.name,
            phone: formData.phone || null,
            role,
            profile_id: formData.profile_id || null,
            ...(formData.password && { password: formData.password }),
          }
        : {
            ...formData,
            role,
            profile_id: formData.profile_id || null,
          };

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
          editingUser ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!'
        );
        setIsModalOpen(false);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar usuário');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Erro ao salvar usuário');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });

      if (response.ok) {
        toast.success(
          user.is_active ? 'Usuário desativado!' : 'Usuário ativado!'
        );
        setIsViewModalOpen(false);
        fetchUsers();
      } else {
        toast.error('Erro ao alterar status do usuário');
      }
    } catch (error) {
      console.error('Error toggling user:', error);
      toast.error('Erro ao alterar status do usuário');
    }
  };

  // Verificar se o usuário atual é administrador
  const currentUserIsAdmin = currentUser?.role === 'admin' || 
    profiles.find(p => p.id === currentUser?.profile_id)?.name === 'Administrador';

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
            Usuários
          </h1>
          <p className="text-secondary-500 mt-1">
            Gerencie os usuários do sistema
          </p>
        </div>
        <Button onClick={() => handleOpenEditModal()}>
          <Plus className="w-4 h-4" />
          Novo Usuário
        </Button>
      </div>

      {/* Grid de usuários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <Users className="w-16 h-16 text-surface-400 mb-4" />
            <p className="text-secondary-500 text-lg">Nenhum usuário encontrado</p>
          </div>
        ) : (
          users.map((user) => (
            <Card 
              key={user.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewUser(user)}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  isAdmin(user) ? 'bg-amber-100' : 'bg-primary-100'
                }`}>
                  {isAdmin(user) ? (
                    <Shield className="w-6 h-6 text-amber-600" />
                  ) : (
                    <Users className="w-6 h-6 text-primary-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-secondary-700 truncate">{user.name}</h3>
                    {!user.is_active && (
                      <Badge variant="danger" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  <p className="text-sm text-secondary-500">@{user.username}</p>
                  {user.profile && (
                    <Badge 
                      variant={isAdmin(user) ? 'warning' : 'info'} 
                      className="mt-2 text-xs"
                    >
                      {user.profile.name}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-surface-200 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-secondary-400">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(user.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <Eye className="w-4 h-4 text-secondary-400" />
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de visualização */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Detalhes do Usuário"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Info do usuário */}
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                isAdmin(selectedUser) ? 'bg-amber-100' : 'bg-primary-100'
              }`}>
                {isAdmin(selectedUser) ? (
                  <Shield className="w-8 h-8 text-amber-600" />
                ) : (
                  <Users className="w-8 h-8 text-primary-600" />
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-secondary-700">{selectedUser.name}</h3>
                <p className="text-secondary-500">@{selectedUser.username}</p>
              </div>
            </div>

            {/* Detalhes */}
            <div className="space-y-3">
              {selectedUser.phone && (
                <div className="flex items-center gap-3 text-secondary-600">
                  <Phone className="w-5 h-5 text-secondary-400" />
                  <span>{selectedUser.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-secondary-600">
                <Shield className="w-5 h-5 text-secondary-400" />
                <span>Perfil: {selectedUser.profile?.name || 'Não definido'}</span>
              </div>
              <div className="flex items-center gap-3 text-secondary-600">
                <Calendar className="w-5 h-5 text-secondary-400" />
                <span>Criado em: {new Date(selectedUser.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={selectedUser.is_active ? 'success' : 'danger'}>
                  {selectedUser.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-4 border-t border-surface-200">
              <Button
                variant="ghost"
                onClick={() => setIsViewModalOpen(false)}
              >
                Fechar
              </Button>
              {selectedUser.id !== currentUser?.id && (
                <Button
                  variant="outline"
                  onClick={() => handleToggleActive(selectedUser)}
                >
                  {selectedUser.is_active ? (
                    <>
                      <UserX className="w-4 h-4" />
                      Desativar
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Ativar
                    </>
                  )}
                </Button>
              )}
              <Button onClick={() => handleOpenEditModal(selectedUser)}>
                <Edit className="w-4 h-4" />
                Editar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de criação/edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dicas de preenchimento */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm space-y-2">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <Info className="w-4 h-4" />
              Regras de Preenchimento
            </div>
            <ul className="text-blue-600 space-y-1 ml-6 list-disc">
              <li><strong>Nome:</strong> Mínimo 3 caracteres, apenas letras e espaços</li>
              {!editingUser && (
                <li><strong>Usuário:</strong> 3-20 caracteres (letras, números e _)</li>
              )}
              <li><strong>Senha:</strong> Mínimo 8 caracteres, incluindo maiúscula, minúscula, número e caractere especial</li>
              <li><strong>Telefone:</strong> DDD + número (10 ou 11 dígitos)</li>
            </ul>
          </div>

          <div>
            <Input
              label="Nome Completo *"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              error={errors.name}
              placeholder="Digite o nome completo"
            />
          </div>

          {!editingUser && (
            <div>
              <Input
                label="Nome de Usuário *"
                value={formData.username}
                onChange={(e) => {
                  setFormData({ ...formData, username: e.target.value.toLowerCase() });
                  if (errors.username) setErrors({ ...errors, username: undefined });
                }}
                error={errors.username}
                placeholder="usuario_exemplo"
              />
            </div>
          )}

          <div>
            <Input
              label={editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
              type="password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              error={errors.password}
              placeholder={editingUser ? '••••••••' : 'Mínimo 8 caracteres'}
            />
            {formData.password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  {formData.password.length >= 8 ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className={formData.password.length >= 8 ? 'text-green-600' : 'text-red-600'}>
                    Mínimo 8 caracteres
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {/(?=.*[a-z])/.test(formData.password) ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className={/(?=.*[a-z])/.test(formData.password) ? 'text-green-600' : 'text-red-600'}>
                    Letra minúscula
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {/(?=.*[A-Z])/.test(formData.password) ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className={/(?=.*[A-Z])/.test(formData.password) ? 'text-green-600' : 'text-red-600'}>
                    Letra maiúscula
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {/(?=.*\d)/.test(formData.password) ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className={/(?=.*\d)/.test(formData.password) ? 'text-green-600' : 'text-red-600'}>
                    Número
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.password) ? (
                    <CheckCircle className="w-3 h-3 text-green-500" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-red-500" />
                  )}
                  <span className={/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.password) ? 'text-green-600' : 'text-red-600'}>
                    Caractere especial (!@#$%...)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <Input
              label="Telefone *"
              value={formData.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              error={errors.phone}
              placeholder="(00) 00000-0000"
              maxLength={15}
            />
          </div>

          <Select
            label="Perfil de Atuação *"
            value={formData.profile_id}
            onChange={(e) => {
              setFormData({ ...formData, profile_id: e.target.value });
              if (errors.profile_id) setErrors({ ...errors, profile_id: undefined });
            }}
            options={profiles.map((p) => ({ value: p.id, label: p.name }))}
            placeholder="Selecione um perfil..."
            error={errors.profile_id}
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
              {editingUser ? 'Salvar' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
