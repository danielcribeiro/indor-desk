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
  FormInput,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Calendar,
  Eye,
  Type,
  Hash,
  CalendarDays,
  List,
  ToggleLeft,
  AlertTriangle,
} from 'lucide-react';

interface CustomField {
  id: string;
  name: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options: string[] | null;
  is_required: boolean;
  order_index: number;
  is_active: boolean;
  created_at?: string;
}

const fieldTypeLabels: Record<string, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  select: 'Seleção',
  boolean: 'Sim/Não',
};

const fieldTypeIcons: Record<string, React.ReactNode> = {
  text: <Type className="w-5 h-5" />,
  number: <Hash className="w-5 h-5" />,
  date: <CalendarDays className="w-5 h-5" />,
  select: <List className="w-5 h-5" />,
  boolean: <ToggleLeft className="w-5 h-5" />,
};

export default function CamposPage() {
  const { accessToken, user } = useAuthStore();
  const toast = useToastStore();

  const [fields, setFields] = useState<CustomField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    field_type: 'text' as CustomField['field_type'],
    options: '',
    is_required: false,
    order_index: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomField | null>(null);

  const fetchFields = useCallback(async () => {
    try {
      const response = await fetch('/api/custom-fields', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFields(data.fields);
      } else {
        toast.error('Erro ao carregar campos');
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
      toast.error('Erro ao carregar campos');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, toast]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const handleViewField = (field: CustomField) => {
    setSelectedField(field);
    setIsViewModalOpen(true);
  };

  const handleOpenEditModal = (field?: CustomField) => {
    if (field) {
      setEditingField(field);
      setFormData({
        name: field.name,
        field_type: field.field_type,
        options: field.options?.join(', ') || '',
        is_required: field.is_required,
        order_index: field.order_index,
      });
    } else {
      setEditingField(null);
      setFormData({
        name: '',
        field_type: 'text',
        options: '',
        is_required: false,
        order_index: fields.length + 1,
      });
    }
    setIsViewModalOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = editingField
        ? `/api/custom-fields/${editingField.id}`
        : '/api/custom-fields';
      const method = editingField ? 'PUT' : 'POST';

      const options =
        formData.field_type === 'select' && formData.options
          ? formData.options.split(',').map((o) => o.trim()).filter(Boolean)
          : null;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: formData.name,
          field_type: formData.field_type,
          options,
          is_required: formData.is_required,
          order_index: formData.order_index,
        }),
      });

      if (response.ok) {
        toast.success(
          editingField
            ? 'Campo atualizado com sucesso!'
            : 'Campo criado com sucesso!'
        );
        setIsModalOpen(false);
        fetchFields();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar campo');
      }
    } catch (error) {
      console.error('Error saving field:', error);
      toast.error('Erro ao salvar campo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (field: CustomField) => {
    try {
      const response = await fetch(`/api/custom-fields/${field.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success('Campo excluído com sucesso!');
        setDeleteConfirm(null);
        setIsViewModalOpen(false);
        fetchFields();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao excluir campo');
      }
    } catch (error) {
      console.error('Error deleting field:', error);
      toast.error('Erro ao excluir campo');
    }
  };

  // Verificar se o usuário atual é administrador
  const currentUserIsAdmin = user?.role === 'admin';

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
            Campos Personalizados
          </h1>
          <p className="text-secondary-500 mt-1">
            Configure campos adicionais para o cadastro de clientes
          </p>
        </div>
        <Button onClick={() => handleOpenEditModal()}>
          <Plus className="w-4 h-4" />
          Novo Campo
        </Button>
      </div>

      {/* Informações */}
      <Card>
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl">
          <FormInput className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Sobre os Campos Personalizados</p>
            <p>
              Os campos personalizados aparecem no formulário de cadastro de clientes.
              Use-os para coletar informações específicas para sua clínica.
            </p>
          </div>
        </div>
      </Card>

      {/* Grid de campos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : fields.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <FormInput className="w-16 h-16 text-surface-400 mb-4" />
            <p className="text-secondary-500 text-lg">
              Nenhum campo personalizado cadastrado
            </p>
            <p className="text-secondary-400 text-sm mt-1">
              Campos personalizados aparecem no cadastro de clientes
            </p>
          </div>
        ) : (
          fields
            .sort((a, b) => a.order_index - b.order_index)
            .map((field) => (
              <Card 
                key={field.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewField(field)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary-100 text-primary-600">
                    {fieldTypeIcons[field.field_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-secondary-700 truncate">{field.name}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="info" className="text-xs">
                        {fieldTypeLabels[field.field_type]}
                      </Badge>
                      {field.is_required && (
                        <Badge variant="warning" className="text-xs">Obrigatório</Badge>
                      )}
                    </div>
                    {field.options && field.options.length > 0 && (
                      <p className="text-xs text-secondary-400 mt-2 truncate">
                        {field.options.length} opções
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-surface-200 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-secondary-400">
                    <span>Ordem: {field.order_index}</span>
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
        title="Detalhes do Campo"
      >
        {selectedField && (
          <div className="space-y-6">
            {/* Info do campo */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center bg-primary-100 text-primary-600">
                {fieldTypeIcons[selectedField.field_type]}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-secondary-700">{selectedField.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="info">{fieldTypeLabels[selectedField.field_type]}</Badge>
                  {selectedField.is_required && (
                    <Badge variant="warning">Obrigatório</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Detalhes */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-secondary-600">
                <Hash className="w-5 h-5 text-secondary-400" />
                <span>Ordem de exibição: {selectedField.order_index}</span>
              </div>
              {selectedField.options && selectedField.options.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-secondary-700 mb-2">Opções disponíveis:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedField.options.map((opt, idx) => (
                      <Badge key={idx} variant="neutral">{opt}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-4 border-t border-surface-200">
              <Button
                variant="ghost"
                onClick={() => setIsViewModalOpen(false)}
              >
                Fechar
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(selectedField)}
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
              <Button onClick={() => handleOpenEditModal(selectedField)}>
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
        title={editingField ? 'Editar Campo' : 'Novo Campo'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome do Campo *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Escola, Convênio..."
            required
          />
          <Select
            label="Tipo de Campo *"
            value={formData.field_type}
            onChange={(e) =>
              setFormData({
                ...formData,
                field_type: e.target.value as CustomField['field_type'],
              })
            }
            options={[
              { value: 'text', label: 'Texto' },
              { value: 'number', label: 'Número' },
              { value: 'date', label: 'Data' },
              { value: 'select', label: 'Seleção' },
              { value: 'boolean', label: 'Sim/Não' },
            ]}
          />
          {formData.field_type === 'select' && (
            <Input
              label="Opções (separadas por vírgula) *"
              value={formData.options}
              onChange={(e) =>
                setFormData({ ...formData, options: e.target.value })
              }
              placeholder="Opção 1, Opção 2, Opção 3"
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Ordem de Exibição"
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
            <Select
              label="Obrigatório?"
              value={formData.is_required ? 'true' : 'false'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_required: e.target.value === 'true',
                })
              }
              options={[
                { value: 'false', label: 'Não' },
                { value: 'true', label: 'Sim' },
              ]}
            />
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
              {editingField ? 'Salvar' : 'Criar Campo'}
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
            Tem certeza que deseja excluir o campo <strong>{deleteConfirm?.name}</strong>?
          </p>
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-700">
              <p className="font-medium">Atenção</p>
              <p>Os dados deste campo nos clientes já cadastrados serão perdidos.</p>
            </div>
          </div>
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
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
