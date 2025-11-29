'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import {
  Check,
  Circle,
  Lock,
  Clock,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  PlayCircle,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

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
}

interface Stage {
  id: string;
  name: string;
  description?: string | null;
  order_index: number;
  status: 'not_started' | 'in_progress' | 'completed';
  startedAt?: string | null;
  completedAt?: string | null;
  activities: Activity[];
  pendingTasks?: PendingTask[];
}

interface RoadmapViewProps {
  stages: Stage[];
  clientId: string;
  onActivityToggle: (activityId: string, stageId: string, noteContent?: string) => Promise<void>;
  onStageStart: (stageId: string) => Promise<void>;
  onStageComplete: (stageId: string) => Promise<void>;
  onStageRevert: (stageId: string) => Promise<void>;
  onOpenActivityDetails: (activity: Activity, stageId: string, stageName: string) => void;
  onOpenPendingTask?: (task: PendingTask, stageId: string, stageName: string) => void;
}

export function RoadmapView({
  stages,
  clientId,
  onActivityToggle,
  onStageStart,
  onStageComplete,
  onStageRevert,
  onOpenActivityDetails,
  onOpenPendingTask,
}: RoadmapViewProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(
    stages.find((s) => s.status === 'in_progress')?.id || null
  );
  const [loadingActivity, setLoadingActivity] = useState<string | null>(null);

  const getStageIcon = (stage: Stage, index: number) => {
    switch (stage.status) {
      case 'completed':
        return <Check className="w-5 h-5" />;
      case 'in_progress':
        return <span className="text-sm font-bold">{index + 1}</span>;
      case 'not_started':
        const prevStage = stages[index - 1];
        if (index > 0 && prevStage?.status === 'not_started') {
          return <Lock className="w-4 h-4" />;
        }
        return <Circle className="w-5 h-5" />;
      default:
        return <span className="text-sm font-bold">{index + 1}</span>;
    }
  };

  const getStageStyles = (stage: Stage, index: number) => {
    const prevStage = stages[index - 1];
    const isBlocked = index > 0 && prevStage?.status === 'not_started';

    switch (stage.status) {
      case 'completed':
        return 'stage-dot-completed';
      case 'in_progress':
        return 'stage-dot-active';
      case 'not_started':
        return isBlocked ? 'stage-dot-blocked' : 'stage-dot-pending';
      default:
        return 'stage-dot-pending';
    }
  };

  const getLineStyles = (stage: Stage, index: number) => {
    const nextStage = stages[index + 1];

    if (stage.status === 'completed') {
      if (nextStage?.status === 'in_progress') {
        return 'stage-line-active';
      }
      return 'stage-line-completed';
    }
    return 'stage-line-pending';
  };

  const isStageBlocked = (index: number) => {
    if (index === 0) return false;
    const prevStage = stages[index - 1];
    return prevStage?.status === 'not_started';
  };

  const canStartStage = (index: number) => {
    if (index === 0) return true;
    const prevStage = stages[index - 1];
    return prevStage?.status !== 'not_started';
  };

  const canCompleteStage = (stage: Stage) => {
    const completedActivities = stage.activities.filter((a) => a.isCompleted);
    const hasUnresolvedTasks = (stage.pendingTasks || []).some(t => t.status === 'pending');
    return completedActivities.length === stage.activities.length && !hasUnresolvedTasks;
  };

  const getUnresolvedTasksCount = (stage: Stage) => {
    return (stage.pendingTasks || []).filter(t => t.status === 'pending').length;
  };

  // Etapa concluída pode ser revertida para "em andamento"
  const canRevertCompletedStage = (stage: Stage) => {
    return stage.status === 'completed';
  };

  // Etapa em andamento pode ser revertida para "pendente" se não tiver atividades concluídas
  const canRevertToNotStarted = (stage: Stage) => {
    if (stage.status !== 'in_progress') return false;
    const completedActivities = stage.activities.filter((a) => a.isCompleted);
    return completedActivities.length === 0;
  };

  // Se não há etapas, mostrar mensagem
  if (!stages || stages.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-surface-200">
        <h3 className="text-lg font-semibold text-secondary-700 mb-6">Jornada do Cliente</h3>
        <div className="text-center py-8 text-secondary-500">
          <Circle className="w-12 h-12 mx-auto mb-3 text-surface-400" />
          <p>Nenhuma etapa cadastrada no sistema.</p>
          <p className="text-sm mt-1">Configure as etapas em Administração → Etapas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline visual - mostra todas as etapas */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border border-surface-200">
        <h3 className="text-base md:text-lg font-semibold text-secondary-700 mb-4 md:mb-6">Jornada do Cliente</h3>

        {/* Roadmap horizontal */}
        <div className="flex items-start justify-between overflow-x-auto pb-4 gap-1 md:gap-2">
          {stages.map((stage, index) => (
            <div key={stage.id} className="flex items-center flex-1 min-w-0">
              {/* Stage dot */}
              <div className="flex flex-col items-center" style={{ minWidth: '60px', maxWidth: '100px' }}>
                <button
                  onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                  className={cn(
                    getStageStyles(stage, index),
                    'relative z-10 cursor-pointer'
                  )}
                  title={stage.name}
                >
                  {getStageIcon(stage, index)}
                </button>
                <div className="mt-2 text-center w-full px-1">
                  <p
                    className={cn(
                      'text-xs font-medium leading-tight',
                      stage.status === 'in_progress' ? 'text-primary-600' : 'text-secondary-600'
                    )}
                    title={stage.name}
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      wordBreak: 'break-word',
                      hyphens: 'auto'
                    }}
                  >
                    {stage.name}
                  </p>
                  <Badge
                    variant={
                      stage.status === 'completed'
                        ? 'success'
                        : stage.status === 'in_progress'
                          ? 'info'
                          : isStageBlocked(index)
                            ? 'neutral'
                            : 'neutral'
                    }
                    className="mt-1 text-[10px]"
                  >
                    {stage.status === 'completed'
                      ? 'Concluída'
                      : stage.status === 'in_progress'
                        ? 'Em andamento'
                        : isStageBlocked(index)
                          ? 'Bloqueada'
                          : 'Pendente'}
                  </Badge>
                </div>
              </div>

              {/* Connecting line */}
              {index < stages.length - 1 && (
                <div className={cn('mx-1 flex-1', getLineStyles(stage, index))} style={{ minWidth: '20px' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Detalhes das etapas (todas) */}
      {stages.map((stage, stageIndex) => {
        const blocked = isStageBlocked(stageIndex);
        const isPending = stage.status === 'not_started';
        const isInProgress = stage.status === 'in_progress';
        const isCompleted = stage.status === 'completed';

        return (
          <div
            key={stage.id}
            className={cn(
              'bg-white rounded-2xl border border-surface-200 overflow-hidden transition-all duration-300',
              expandedStage === stage.id ? 'ring-2 ring-primary-200' : ''
            )}
          >
            {/* Header da etapa */}
            <button
              onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
              className="w-full flex items-center justify-between p-3 md:p-4 hover:bg-surface-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(getStageStyles(stage, stageIndex), 'w-8 h-8 text-xs')}>
                  {getStageIcon(stage, stageIndex)}
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-secondary-700">{stage.name}</h4>
                  {stage.description && (
                    <p className="text-sm text-secondary-500">{stage.description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    stage.status === 'completed'
                      ? 'success'
                      : stage.status === 'in_progress'
                        ? 'info'
                        : 'neutral'
                  }
                >
                  {stage.activities.filter((a) => a.isCompleted).length}/{stage.activities.length} atividades
                </Badge>
                {expandedStage === stage.id ? (
                  <ChevronDown className="w-5 h-5 text-secondary-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-secondary-400" />
                )}
              </div>
            </button>

            {/* Conteúdo expandido */}
            {expandedStage === stage.id && (
              <div className="border-t border-surface-200 p-3 md:p-4 animate-slide-up">
                {/* Aviso de etapa bloqueada */}
                {blocked && (
                  <div className="flex items-center gap-2 text-sm text-secondary-600 bg-surface-100 px-3 py-2 rounded-lg mb-4">
                    <Lock className="w-4 h-4" />
                    Esta etapa está bloqueada. Conclua a etapa anterior para desbloqueá-la.
                  </div>
                )}

                {/* Ações da etapa */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {/* Iniciar Etapa */}
                  {isPending && canStartStage(stageIndex) && !blocked && (
                    <Button
                      size="sm"
                      onClick={() => onStageStart(stage.id)}
                    >
                      <Clock className="w-4 h-4" />
                      Iniciar Etapa
                    </Button>
                  )}

                  {/* Concluir Etapa */}
                  {isInProgress && canCompleteStage(stage) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onStageComplete(stage.id)}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Concluir Etapa
                    </Button>
                  )}

                  {/* Reverter etapa concluída para em andamento */}
                  {canRevertCompletedStage(stage) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStageRevert(stage.id)}
                    >
                      <PlayCircle className="w-4 h-4" />
                      Reabrir Etapa
                    </Button>
                  )}

                  {/* Reverter etapa em andamento para pendente */}
                  {canRevertToNotStarted(stage) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onStageRevert(stage.id)}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reverter para Pendente
                    </Button>
                  )}
                </div>

                {/* Lista de atividades */}
                <div className="space-y-2">
                  <h5 className="text-sm font-semibold text-secondary-600 mb-2">
                    Atividades desta etapa:
                  </h5>
                  {stage.activities.length === 0 ? (
                    <p className="text-sm text-secondary-500 italic">
                      Nenhuma atividade cadastrada para esta etapa.
                    </p>
                  ) : (
                    stage.activities.map((activity) => {
                      const canInteract = isInProgress;
                      const isDisabled = isPending || blocked;
                      const canOpen = canInteract || isCompleted;

                      return (
                        <div
                          key={activity.id}
                          onClick={() => {
                            if (canOpen && !isDisabled) {
                              onOpenActivityDetails(activity, stage.id, stage.name);
                            }
                          }}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border transition-all',
                            activity.isCompleted
                              ? 'bg-green-50 border-green-200'
                              : isDisabled
                                ? 'bg-surface-100 border-surface-200 opacity-60'
                                : 'bg-surface-50 border-surface-200',
                            canOpen && !isDisabled && 'cursor-pointer hover:shadow-md hover:border-primary-300'
                          )}
                        >
                          {/* Informações da atividade */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                'font-medium',
                                activity.isCompleted
                                  ? 'text-green-700'
                                  : isDisabled
                                    ? 'text-secondary-400'
                                    : 'text-secondary-700'
                              )}>
                                {activity.name}
                              </p>
                              {activity.isCompleted && (
                                <Badge variant="success" className="text-xs">
                                  <Check className="w-3 h-3 mr-1" />
                                  Concluída
                                </Badge>
                              )}
                            </div>
                            {activity.description && (
                              <p className={cn(
                                'text-sm mt-1',
                                isDisabled ? 'text-secondary-400' : 'text-secondary-500'
                              )}>
                                {activity.description}
                              </p>
                            )}
                            {activity.isCompleted && activity.completedAt && (
                              <p className="text-xs text-green-600 mt-1">
                                Concluída em {new Date(activity.completedAt).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>

                          {/* Ícone indicando que pode abrir */}
                          <div
                            className={cn(
                              'shrink-0 p-2 rounded-lg transition-all',
                              activity.isCompleted
                                ? 'text-green-600'
                                : canInteract
                                  ? 'text-primary-600'
                                  : 'text-secondary-400',
                              isDisabled && 'opacity-50'
                            )}
                          >
                            {loadingActivity === activity.id ? (
                              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ExternalLink className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Lista de pendências */}
                {stage.pendingTasks && stage.pendingTasks.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <h5 className="text-sm font-semibold text-secondary-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Pendências
                      {getUnresolvedTasksCount(stage) > 0 && (
                        <Badge variant="warning" className="text-xs">
                          {getUnresolvedTasksCount(stage)} pendente(s)
                        </Badge>
                      )}
                    </h5>
                    {stage.pendingTasks.map((task) => {
                      const isResolved = task.status === 'resolved';

                      return (
                        <div
                          key={task.id}
                          onClick={() => {
                            if (onOpenPendingTask && (isInProgress || isCompleted)) {
                              onOpenPendingTask(task, stage.id, stage.name);
                            }
                          }}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border transition-all',
                            isResolved
                              ? 'bg-green-50 border-green-200'
                              : 'bg-amber-50 border-amber-200',
                            (isInProgress || isCompleted) && onOpenPendingTask && 'cursor-pointer hover:shadow-md',
                            isResolved ? 'hover:border-green-400' : 'hover:border-amber-400'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                            isResolved ? 'bg-green-100' : 'bg-amber-100'
                          )}>
                            {isResolved ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={cn(
                                'font-medium',
                                isResolved ? 'text-green-800' : 'text-amber-800'
                              )}>
                                {task.title}
                              </p>
                              {isResolved && (
                                <Badge variant="success" className="text-xs">
                                  Resolvida
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {task.assigned_profile && (
                                <Badge variant={isResolved ? 'neutral' : 'warning'} className="text-xs">
                                  Para: {task.assigned_profile.name}
                                </Badge>
                              )}
                              <span className={cn(
                                'text-xs',
                                isResolved ? 'text-green-600' : 'text-amber-600'
                              )}>
                                {isResolved && task.resolved_at
                                  ? `Resolvida em ${new Date(task.resolved_at).toLocaleDateString('pt-BR')}`
                                  : `Criada em ${new Date(task.created_at).toLocaleDateString('pt-BR')}`
                                }
                              </span>
                            </div>
                          </div>
                          <ExternalLink className={cn(
                            'w-5 h-5 shrink-0',
                            isResolved ? 'text-green-600' : 'text-amber-600'
                          )} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Legenda para etapa pendente */}
                {isPending && !blocked && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">
                      <AlertCircle className="w-4 h-4 inline mr-2" />
                      Clique em "Iniciar Etapa" para habilitar a conclusão das atividades.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
