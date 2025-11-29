'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { RoadmapView } from '@/components/flow/RoadmapView';
import { NotesList } from '@/components/flow/NotesList';
import {
  ArrowLeft,
  Edit,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Loader2,
  MessageSquare,
  Check,
  ExternalLink,
  FolderOpen,
  ChevronDown,
  ChevronUp,
  Send,
  AlertTriangle,
  RotateCcw,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
}

interface Note {
  id: string;
  content: string;
  is_auto_generated: boolean;
  created_at: string;
  stage: { id: string; name: string } | null;
  activity_id?: string | null;
  activity_name?: string | null;
  created_by_user: { id: string; name: string } | null;
  attachments: { id: string; file_name: string; file_path: string; file_type: string }[];
}

interface Activity {
  id: string;
  name: string;
  description?: string | null;
  order_index: number;
  is_required: boolean;
  allowed_profiles?: string[] | null;
  isCompleted: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
}

interface PendingTask {
  id: string;
  title: string;
  status: 'pending' | 'resolved';
  stage_id: string;
  created_at: string;
  resolved_at?: string | null;
  assigned_profile?: { id: string; name: string } | null;
  created_by_user?: { id: string; name: string } | null;
  resolved_by_user?: { id: string; name: string } | null;
  resolution_note?: { content: string } | null;
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
  observations: string | null;
  google_drive_link: string | null;
  custom_fields: Record<string, unknown> | null;
  created_at: string;
  roadmap: {
    id: string;
    name: string;
    description: string | null;
    order_index: number;
    status: 'not_started' | 'in_progress' | 'completed';
    startedAt: string | null;
    completedAt: string | null;
    activities: Activity[];
    pendingTasks?: PendingTask[];
  }[];
  notes: Note[];
}

interface ActivityDetailModal {
  isOpen: boolean;
  activity: Activity | null;
  stageId: string | null;
  stageName: string | null;
}

interface PendingTaskModal {
  isOpen: boolean;
  task: PendingTask | null;
  stageId: string | null;
  stageName: string | null;
}

export default function ClienteDetalhePage() {
  const params = useParams();
  const { accessToken } = useAuthStore();
  const toast = useToastStore();

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activityModal, setActivityModal] = useState<ActivityDetailModal>({
    isOpen: false,
    activity: null,
    stageId: null,
    stageName: null,
  });
  const [pendingTaskModal, setPendingTaskModal] = useState<PendingTaskModal>({
    isOpen: false,
    task: null,
    stageId: null,
    stageName: null,
  });
  const [noteContent, setNoteContent] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChildData, setShowChildData] = useState(true);
  const [showGuardianData, setShowGuardianData] = useState(true);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [createsPendingTask, setCreatesPendingTask] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const clientId = params.id as string;

  const fetchClient = useCallback(async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Processar notas para incluir nome da atividade
        const processedNotes = (data.client.notes || []).map((note: Note) => {
          if (note.activity_id) {
            // Procurar nome da atividade no roadmap
            for (const stage of data.client.roadmap || []) {
              const activity = stage.activities?.find((a: Activity) => a.id === note.activity_id);
              if (activity) {
                return { ...note, activity_name: activity.name };
              }
            }
          }
          return note;
        });
        setClient({ ...data.client, notes: processedNotes });
      } else {
        toast.error('Erro ao carregar cliente');
      }
    } catch (error) {
      console.error('Error fetching client:', error);
      toast.error('Erro ao carregar cliente');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, accessToken, toast]);

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
    fetchClient();
    fetchProfiles();
  }, [fetchClient, fetchProfiles]);

  const handleActivityToggle = async (activityId: string, stageId: string, noteContent?: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/activities/${activityId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ note_content: noteContent }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.is_completed ? 'Atividade concluída!' : 'Atividade desmarcada!');
        fetchClient();
      } else {
        toast.error(data.error || 'Erro ao alterar atividade');
      }
    } catch (error) {
      console.error('Error toggling activity:', error);
      toast.error('Erro ao alterar atividade');
    }
  };

  const handleStageStart = async (stageId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/stages/${stageId}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success('Etapa iniciada!');
        fetchClient();
      } else {
        toast.error('Erro ao iniciar etapa');
      }
    } catch (error) {
      console.error('Error starting stage:', error);
      toast.error('Erro ao iniciar etapa');
    }
  };

  const handleStageComplete = async (stageId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/stages/${stageId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success('Etapa concluída!');
        fetchClient();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao concluir etapa');
      }
    } catch (error) {
      console.error('Error completing stage:', error);
      toast.error('Erro ao concluir etapa');
    }
  };

  const handleStageRevert = async (stageId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/stages/${stageId}/revert`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success('Etapa revertida!');
        fetchClient();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao reverter etapa');
      }
    } catch (error) {
      console.error('Error reverting stage:', error);
      toast.error('Erro ao reverter etapa');
    }
  };

  const handleOpenActivityDetails = (activity: Activity, stageId: string, stageName: string) => {
    setActivityModal({
      isOpen: true,
      activity,
      stageId,
      stageName,
    });
    setNoteContent('');
    setCreatesPendingTask(false);
    setSelectedProfileId('');
  };

  const handleCloseActivityModal = () => {
    setActivityModal({
      isOpen: false,
      activity: null,
      stageId: null,
      stageName: null,
    });
    setNoteContent('');
    setCreatesPendingTask(false);
    setSelectedProfileId('');
  };

  const handleOpenPendingTask = (task: PendingTask, stageId: string, stageName: string) => {
    setPendingTaskModal({
      isOpen: true,
      task,
      stageId,
      stageName,
    });
    setResolutionNote('');
  };

  const handleClosePendingTaskModal = () => {
    setPendingTaskModal({
      isOpen: false,
      task: null,
      stageId: null,
      stageName: null,
    });
    setResolutionNote('');
  };

  const handleResolvePendingTask = async () => {
    if (!pendingTaskModal.task || !resolutionNote.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/pending-tasks/${pendingTaskModal.task.id}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ resolution_note: resolutionNote }),
      });

      if (response.ok) {
        toast.success('Pendência resolvida com sucesso!');
        handleClosePendingTaskModal();
        fetchClient();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao resolver pendência');
      }
    } catch (error) {
      console.error('Error resolving pending task:', error);
      toast.error('Erro ao resolver pendência');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenPendingTask = async () => {
    if (!pendingTaskModal.task) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/pending-tasks/${pendingTaskModal.task.id}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success('Pendência reaberta com sucesso!');
        handleClosePendingTaskModal();
        fetchClient();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erro ao reabrir pendência');
      }
    } catch (error) {
      console.error('Error reopening pending task:', error);
      toast.error('Erro ao reabrir pendência');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteActivity = async () => {
    if (!activityModal.activity || !activityModal.stageId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/clients/${clientId}/activities/${activityModal.activity.id}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ note_content: noteContent || undefined }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.is_completed ? 'Atividade concluída!' : 'Atividade desmarcada!');
        fetchClient();
        handleCloseActivityModal();
      } else {
        // Mantém o modal aberto e mostra o erro
        toast.error(data.error || 'Erro ao alterar atividade');
      }
    } catch (error) {
      console.error('Error toggling activity:', error);
      toast.error('Erro ao alterar atividade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNoteToActivity = async () => {
    if (!activityModal.activity || !activityModal.stageId || !noteContent.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          client_id: clientId,
          stage_id: activityModal.stageId,
          activity_id: activityModal.activity.id,
          content: noteContent,
          creates_pending_task: createsPendingTask,
          pending_task_profile_id: createsPendingTask ? selectedProfileId || null : null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.pendingTask) {
          toast.success('Nota registrada e pendência criada!');
        } else {
          toast.success('Nota registrada!');
        }
        setNoteContent('');
        setCreatesPendingTask(false);
        setSelectedProfileId('');
        fetchClient();
      } else {
        toast.error('Erro ao adicionar nota');
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Erro ao adicionar nota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Filtrar notas da atividade atual
  const activityNotes = activityModal.activity
    ? (client?.notes || []).filter(
      (note) => note.activity_id === activityModal.activity?.id
    )
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-secondary-500 text-lg mb-4">Cliente não encontrado</p>
        <Link href="/clientes">
          <Button variant="outline">Voltar para Clientes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/clientes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-secondary-700">
              {client.name}
            </h1>
            <p className="text-sm md:text-base text-secondary-500">
              {client.birth_date && `${calculateAge(client.birth_date)} anos • `}
              Cadastrado em {new Date(client.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {client.google_drive_link && (
            <a
              href={client.google_drive_link}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Google Drive</span>
              </Button>
            </a>
          )}
          <Link href={`/clientes/${client.id}/editar`}>
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setShowSidePanel(!showSidePanel)}
            title={showSidePanel ? 'Ocultar dados do cliente' : 'Mostrar dados do cliente'}
            className="px-3 py-2"
          >
            {showSidePanel ? (
              <PanelRightClose className="w-5 h-5" />
            ) : (
              <PanelRightOpen className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Grid principal */}
      <div className={`grid grid-cols-1 gap-6 ${showSidePanel ? 'lg:grid-cols-3' : ''}`}>
        {/* Roadmap - 2/3 ou full */}
        <div className={`space-y-6 ${showSidePanel ? 'lg:col-span-2' : ''}`}>
          <RoadmapView
            stages={client.roadmap}
            clientId={client.id}
            onActivityToggle={handleActivityToggle}
            onStageRevert={handleStageRevert}
            onStageStart={handleStageStart}
            onStageComplete={handleStageComplete}
            onOpenActivityDetails={handleOpenActivityDetails}
            onOpenPendingTask={handleOpenPendingTask}
          />

          {/* Notas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-500" />
                Histórico de Notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NotesList notes={client.notes || []} stages={client.roadmap || []} />
            </CardContent>
          </Card>
        </div>

        {/* Dados do cliente - 1/3 */}
        {showSidePanel && (
          <div className="space-y-4 animate-fade-in">
            <Card>
              <button
                onClick={() => setShowChildData(!showChildData)}
                className="w-full"
              >
                <CardHeader className="cursor-pointer hover:bg-surface-50 transition-colors rounded-t-xl">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary-500" />
                      Dados da Criança
                    </div>
                    {showChildData ? (
                      <ChevronUp className="w-5 h-5 text-secondary-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-secondary-400" />
                    )}
                  </CardTitle>
                </CardHeader>
              </button>
              {showChildData && (
                <CardContent className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-secondary-700">{client.name}</p>
                      {client.gender && (
                        <p className="text-sm text-secondary-500 capitalize">{client.gender}</p>
                      )}
                    </div>
                  </div>
                  {client.birth_date && (
                    <div className="flex items-center gap-3 text-secondary-600">
                      <Calendar className="w-5 h-5 text-secondary-400" />
                      <div>
                        <p className="text-sm">
                          {new Date(client.birth_date).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-secondary-400">
                          {calculateAge(client.birth_date)} anos
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <Card>
              <button
                onClick={() => setShowGuardianData(!showGuardianData)}
                className="w-full"
              >
                <CardHeader className="cursor-pointer hover:bg-surface-50 transition-colors rounded-t-xl">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary-500" />
                      Responsável
                    </div>
                    {showGuardianData ? (
                      <ChevronUp className="w-5 h-5 text-secondary-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-secondary-400" />
                    )}
                  </CardTitle>
                </CardHeader>
              </button>
              {showGuardianData && (
                <CardContent className="space-y-3 animate-fade-in">
                  {client.guardian_name && (
                    <div className="flex items-center gap-3 text-secondary-600">
                      <User className="w-5 h-5 text-secondary-400" />
                      <span>{client.guardian_name}</span>
                    </div>
                  )}
                  {client.guardian_phone && (
                    <div className="flex items-center gap-3 text-secondary-600">
                      <Phone className="w-5 h-5 text-secondary-400" />
                      <span>{client.guardian_phone}</span>
                    </div>
                  )}
                  {client.guardian_email && (
                    <div className="flex items-center gap-3 text-secondary-600">
                      <Mail className="w-5 h-5 text-secondary-400" />
                      <span>{client.guardian_email}</span>
                    </div>
                  )}
                  {client.address && (
                    <div className="flex items-start gap-3 text-secondary-600">
                      <MapPin className="w-5 h-5 text-secondary-400 mt-0.5" />
                      <span>{client.address}</span>
                    </div>
                  )}
                  {!client.guardian_name &&
                    !client.guardian_phone &&
                    !client.guardian_email &&
                    !client.address && (
                      <p className="text-secondary-400 text-sm italic">
                        Nenhuma informação do responsável cadastrada.
                      </p>
                    )}
                </CardContent>
              )}
            </Card>

            {client.google_drive_link && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-primary-500" />
                    Google Drive
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-secondary-600">
                    Acesse a pasta do Google Drive deste cliente
                  </p>
                  <a
                    href={client.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full" variant="primary">
                      <FolderOpen className="w-4 h-4" />
                      Abrir Google Drive
                      <ExternalLink className="w-4 h-4 ml-auto" />
                    </Button>
                  </a>
                  <a
                    href={client.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-700 transition-colors text-xs"
                  >
                    <span className="truncate">{client.google_drive_link}</span>
                  </a>
                </CardContent>
              </Card>
            )}

            {client.observations && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" />
                    Observações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-secondary-600 whitespace-pre-wrap">
                    {client.observations}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modal de Detalhes da Atividade - Fullscreen */}
      <Modal
        isOpen={activityModal.isOpen}
        onClose={handleCloseActivityModal}
        title={activityModal.activity?.name || 'Detalhes da Atividade'}
        size="fullscreen"
      >
        {activityModal.activity && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Coluna esquerda - Informações da atividade e formulário de nota */}
            <div className="flex flex-col space-y-4">
              {/* Status e informações */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant={activityModal.activity.isCompleted ? 'success' : 'warning'}>
                    {activityModal.activity.isCompleted ? 'Concluída' : 'Pendente'}
                  </Badge>
                  {/* Badge de perfis permitidos */}
                  {activityModal.activity.allowed_profiles && activityModal.activity.allowed_profiles.length > 0 && (
                    <Badge variant="info">
                      Responsável: {activityModal.activity.allowed_profiles
                        .map(profileId => profiles.find(p => p.id === profileId)?.name)
                        .filter(name => name && name !== 'Administrador')
                        .join(', ') || 'Qualquer perfil'}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-secondary-500">
                  Etapa: <span className="font-medium">{activityModal.stageName}</span>
                </span>
              </div>

              {/* Descrição */}
              {activityModal.activity.description && (
                <div className="p-4 bg-surface-50 rounded-xl">
                  <h4 className="text-sm font-semibold text-secondary-700 mb-2">Descrição</h4>
                  <p className="text-secondary-600">{activityModal.activity.description}</p>
                </div>
              )}

              {/* Data de conclusão */}
              {activityModal.activity.isCompleted && activityModal.activity.completedAt && (
                <div className="flex items-center gap-2 text-green-600 p-3 bg-green-50 rounded-xl">
                  <Check className="w-5 h-5" />
                  <span>
                    Concluída em{' '}
                    {new Date(activityModal.activity.completedAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {/* Formulário para adicionar nota */}
              <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
                <h4 className="text-sm font-semibold text-secondary-700 mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Registrar Nota
                </h4>
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Digite uma observação sobre esta atividade..."
                  rows={3}
                  className="mb-3"
                />

                {/* Opção de criar pendência */}
                <div className="mb-3 p-3 bg-white rounded-lg border border-surface-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createsPendingTask}
                      onChange={(e) => setCreatesPendingTask(e.target.checked)}
                      className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-secondary-700">Esta nota gera uma pendência</span>
                  </label>

                  {createsPendingTask && (
                    <div className="mt-3 pl-6">
                      <label className="block text-xs font-medium text-secondary-600 mb-1">
                        Perfil responsável por resolver
                      </label>
                      <select
                        value={selectedProfileId}
                        onChange={(e) => setSelectedProfileId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
                      >
                        <option value="">Qualquer perfil</option>
                        {profiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Botão de registrar nota */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleAddNoteToActivity}
                    disabled={!noteContent.trim()}
                    isLoading={isSubmitting}
                    size="sm"
                  >
                    <Send className="w-4 h-4" />
                    {createsPendingTask ? 'Registrar Nota e Pendência' : 'Registrar Nota'}
                  </Button>
                </div>
              </div>

              {/* Ações principais */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-surface-200 mt-auto">
                {!activityModal.activity.isCompleted ? (
                  <Button
                    onClick={handleCompleteActivity}
                    isLoading={isSubmitting}
                    className="flex-1 sm:flex-none"
                  >
                    <Check className="w-4 h-4" />
                    Concluir Atividade
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleCompleteActivity}
                    isLoading={isSubmitting}
                    className="flex-1 sm:flex-none text-amber-600 border-amber-300 hover:bg-amber-50"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Voltar para Pendente
                  </Button>
                )}

                {client.google_drive_link && (
                  <a
                    href={client.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline">
                      <FolderOpen className="w-4 h-4" />
                      Abrir Google Drive
                    </Button>
                  </a>
                )}
              </div>
            </div>

            {/* Coluna direita - Histórico de notas (com scroll) */}
            <div className="flex flex-col h-full min-h-0">
              <h4 className="text-sm font-semibold text-secondary-700 mb-3 flex items-center justify-between shrink-0">
                <span>Histórico de Notas</span>
                <Badge variant="neutral">{activityNotes.length}</Badge>
              </h4>

              <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                {activityNotes.length > 0 ? (
                  <div className="space-y-3">
                    {activityNotes.map((note) => (
                      <div
                        key={note.id}
                        className="p-4 bg-white rounded-xl border border-surface-200"
                      >
                        <p className="text-secondary-700 whitespace-pre-wrap">
                          {note.content}
                        </p>
                        <div className="mt-3 pt-3 border-t border-surface-100 flex items-center justify-between">
                          <span className="text-xs text-secondary-500">
                            {note.created_by_user?.name || 'Sistema'}
                          </span>
                          <span className="text-xs text-secondary-400">
                            {new Date(note.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-secondary-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma nota registrada para esta atividade.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Resolver Pendência */}
      <Modal
        isOpen={pendingTaskModal.isOpen}
        onClose={handleClosePendingTaskModal}
        title={pendingTaskModal.task?.status === 'resolved' ? 'Pendência Resolvida' : 'Resolver Pendência'}
        size="lg"
      >
        {pendingTaskModal.task && (
          <div className="space-y-6">
            {/* Informações da pendência */}
            <div className={`p-4 rounded-xl border ${pendingTaskModal.task.status === 'resolved'
              ? 'bg-green-50 border-green-200'
              : 'bg-amber-50 border-amber-200'
              }`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${pendingTaskModal.task.status === 'resolved'
                  ? 'bg-green-100'
                  : 'bg-amber-100'
                  }`}>
                  {pendingTaskModal.task.status === 'resolved' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-semibold ${pendingTaskModal.task.status === 'resolved'
                      ? 'text-green-800'
                      : 'text-amber-800'
                      }`}>
                      {pendingTaskModal.task.title}
                    </h4>
                    {pendingTaskModal.task.status === 'resolved' && (
                      <Badge variant="success" className="text-xs">Resolvida</Badge>
                    )}
                  </div>
                  <div className={`mt-2 text-sm space-y-1 ${pendingTaskModal.task.status === 'resolved'
                    ? 'text-green-700'
                    : 'text-amber-700'
                    }`}>
                    <p>Etapa: <span className="font-medium">{pendingTaskModal.stageName}</span></p>
                    {pendingTaskModal.task.assigned_profile && (
                      <p>Atribuída a: <span className="font-medium">{pendingTaskModal.task.assigned_profile.name}</span></p>
                    )}
                    <p>
                      Criada em: {new Date(pendingTaskModal.task.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {pendingTaskModal.task.status === 'resolved' && pendingTaskModal.task.resolved_at && (
                      <p>
                        Resolvida em: {new Date(pendingTaskModal.task.resolved_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {pendingTaskModal.task.resolved_by_user && (
                          <span> por <span className="font-medium">{pendingTaskModal.task.resolved_by_user.name}</span></span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mostrar nota de resolução se já foi resolvida */}
            {pendingTaskModal.task.status === 'resolved' && pendingTaskModal.task.resolution_note && (
              <div className="p-4 bg-surface-50 rounded-xl border border-surface-200">
                <h4 className="text-sm font-semibold text-secondary-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Nota de Resolução
                </h4>
                <p className="text-secondary-600 whitespace-pre-wrap">
                  {pendingTaskModal.task.resolution_note.content}
                </p>
              </div>
            )}

            {/* Formulário de resolução - apenas para pendências não resolvidas */}
            {pendingTaskModal.task.status !== 'resolved' && (
              <div>
                <h4 className="text-sm font-semibold text-secondary-700 mb-2">
                  Nota de Resolução *
                </h4>
                <Textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Descreva como a pendência foi resolvida..."
                  rows={4}
                />
                <p className="text-xs text-secondary-500 mt-1">
                  É obrigatório registrar uma nota para resolver a pendência.
                </p>
              </div>
            )}

            {/* Ações */}
            <div className="flex justify-end gap-3 pt-4 border-t border-surface-200">
              <Button variant="ghost" onClick={handleClosePendingTaskModal}>
                {pendingTaskModal.task.status === 'resolved' ? 'Fechar' : 'Cancelar'}
              </Button>
              {pendingTaskModal.task.status === 'resolved' ? (
                <Button
                  variant="outline"
                  onClick={handleReopenPendingTask}
                  isLoading={isSubmitting}
                >
                  <RotateCcw className="w-4 h-4" />
                  Reabrir Pendência
                </Button>
              ) : (
                <Button
                  onClick={handleResolvePendingTask}
                  disabled={!resolutionNote.trim()}
                  isLoading={isSubmitting}
                >
                  <Check className="w-4 h-4" />
                  Resolver Pendência
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
