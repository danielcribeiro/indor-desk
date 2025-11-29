'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ArrowLeft, Save, User, Users, Loader2, FolderOpen } from 'lucide-react';

interface CustomField {
  id: string;
  name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options: string[] | null;
  is_required: boolean;
}

interface Client {
  id: string;
  name: string;
  birth_date: string | null;
  gender: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  address: string | null;
  notes: string | null;
  custom_fields: Record<string, unknown> | null;
}

export default function EditarClientePage() {
  const params = useParams();
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const toast = useToastStore();

  const clientId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    gender: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    address: '',
    google_drive_link: '',
    notes: '',
    custom_fields: {} as Record<string, unknown>,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchClient = useCallback(async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const client = data.client;
        setFormData({
          name: client.name || '',
          birth_date: client.birth_date || '',
          gender: client.gender || '',
          guardian_name: client.guardian_name || '',
          guardian_phone: client.guardian_phone || '',
          guardian_email: client.guardian_email || '',
          address: client.address || '',
          google_drive_link: client.google_drive_link || '',
          notes: client.observations || '',
          custom_fields: client.custom_fields || {},
        });
      } else {
        toast.error('Erro ao carregar cliente');
        router.push('/clientes');
      }
    } catch (error) {
      console.error('Error fetching client:', error);
      toast.error('Erro ao carregar cliente');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, accessToken, toast, router]);

  const fetchCustomFields = useCallback(async () => {
    try {
      const response = await fetch('/api/custom-fields', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCustomFields(data.fields || []);
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchClient();
    fetchCustomFields();
  }, [fetchClient, fetchCustomFields]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      custom_fields: { ...prev.custom_fields, [fieldId]: value },
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Dados da criança
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.birth_date) {
      newErrors.birth_date = 'Data de nascimento é obrigatória';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gênero é obrigatório';
    }

    // Dados do responsável
    if (!formData.guardian_name.trim()) {
      newErrors.guardian_name = 'Nome do responsável é obrigatório';
    }

    if (!formData.guardian_phone.trim()) {
      newErrors.guardian_phone = 'Telefone é obrigatório';
    }

    if (!formData.guardian_email.trim()) {
      newErrors.guardian_email = 'E-mail é obrigatório';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guardian_email)) {
      newErrors.guardian_email = 'E-mail inválido';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Endereço é obrigatório';
    }

    // Validar campos personalizados obrigatórios
    customFields
      .filter((f) => f.is_required)
      .forEach((field) => {
        if (!formData.custom_fields[field.id]) {
          newErrors[`custom_${field.id}`] = `${field.name} é obrigatório`;
        }
      });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSaving(true);

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success('Cliente atualizado com sucesso!');
        router.push(`/clientes/${clientId}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar cliente');
      }
    } catch (error) {
      console.error('Error updating client:', error);
      toast.error('Erro ao atualizar cliente');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-4">
        <Link href={`/clientes/${clientId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold text-secondary-700">
            Editar Cliente
          </h1>
          <p className="text-secondary-500 mt-1">
            Atualize os dados do cliente
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da Criança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              Dados da Criança
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome Completo *"
                placeholder="Digite o nome completo"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={errors.name}
              />
            </div>
            <Input
              label="Data de Nascimento *"
              type="date"
              value={formData.birth_date}
              onChange={(e) => handleChange('birth_date', e.target.value)}
              error={errors.birth_date}
            />
            <Select
              label="Gênero *"
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              options={[
                { value: 'masculino', label: 'Masculino' },
                { value: 'feminino', label: 'Feminino' },
              ]}
              placeholder="Selecione..."
              error={errors.gender}
            />
          </CardContent>
        </Card>

        {/* Dados do Responsável */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-500" />
              Dados do Responsável
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do Responsável *"
              placeholder="Digite o nome do responsável"
              value={formData.guardian_name}
              onChange={(e) => handleChange('guardian_name', e.target.value)}
              error={errors.guardian_name}
            />
            <Input
              label="Telefone *"
              placeholder="(00) 00000-0000"
              value={formData.guardian_phone}
              onChange={(e) => handleChange('guardian_phone', e.target.value)}
              error={errors.guardian_phone}
            />
            <Input
              label="E-mail *"
              type="email"
              placeholder="email@exemplo.com"
              value={formData.guardian_email}
              onChange={(e) => handleChange('guardian_email', e.target.value)}
              error={errors.guardian_email}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Endereço *"
                placeholder="Digite o endereço completo"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                error={errors.address}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Google Drive */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary-500" />
              Google Drive
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Input
                label="Link da Pasta do Google Drive"
                placeholder="https://drive.google.com/drive/folders/..."
                value={formData.google_drive_link}
                onChange={(e) => handleChange('google_drive_link', e.target.value)}
              />
              <p className="text-xs text-secondary-500">
                Cole o link da pasta raiz do cliente no Google Drive
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Campos Personalizados */}
        {customFields.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Informações Adicionais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFields.map((field) => {
                switch (field.field_type) {
                  case 'select':
                    return (
                      <Select
                        key={field.id}
                        label={`${field.name}${field.is_required ? ' *' : ''}`}
                        value={String(formData.custom_fields[field.id] || '')}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        options={
                          field.options?.map((opt) => ({ value: opt, label: opt })) || []
                        }
                        placeholder="Selecione..."
                        error={errors[`custom_${field.id}`]}
                      />
                    );
                  case 'date':
                    return (
                      <Input
                        key={field.id}
                        label={`${field.name}${field.is_required ? ' *' : ''}`}
                        type="date"
                        value={String(formData.custom_fields[field.id] || '')}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        error={errors[`custom_${field.id}`]}
                      />
                    );
                  case 'number':
                    return (
                      <Input
                        key={field.id}
                        label={`${field.name}${field.is_required ? ' *' : ''}`}
                        type="number"
                        value={String(formData.custom_fields[field.id] || '')}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        error={errors[`custom_${field.id}`]}
                      />
                    );
                  default:
                    return (
                      <Input
                        key={field.id}
                        label={`${field.name}${field.is_required ? ' *' : ''}`}
                        value={String(formData.custom_fields[field.id] || '')}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        error={errors[`custom_${field.id}`]}
                      />
                    );
                }
              })}
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Adicione observações gerais sobre o cliente..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex items-center justify-end gap-3">
          <Link href={`/clientes/${clientId}`}>
            <Button variant="ghost" type="button">
              Cancelar
            </Button>
          </Link>
          <Button type="submit" isLoading={isSaving}>
            <Save className="w-4 h-4" />
            Salvar Alterações
          </Button>
        </div>
      </form>
    </div>
  );
}

