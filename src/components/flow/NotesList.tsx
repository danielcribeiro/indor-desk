'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { 
  Search, 
  X, 
  Paperclip,
  Filter,
  ChevronDown,
  ChevronUp,
  ListTodo
} from 'lucide-react';

interface Note {
  id: string;
  content: string;
  is_auto_generated: boolean;
  created_at: string;
  activity_id?: string | null;
  activity_name?: string | null;
  stage: { id: string; name: string } | null;
  created_by_user: { id: string; name: string } | null;
  attachments: { id: string; file_name: string; file_path: string; file_type: string }[];
}

interface Activity {
  id: string;
  name: string;
  stage_id?: string;
}

interface Stage {
  id: string;
  name: string;
  activities?: Activity[];
}

interface NotesListProps {
  notes: Note[];
  stages?: Stage[];
}

export function NotesList({ notes, stages = [] }: NotesListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Extrair lista única de usuários das notas
  const users = useMemo(() => {
    const userMap = new Map<string, string>();
    notes.forEach((note) => {
      if (note.created_by_user) {
        userMap.set(note.created_by_user.id, note.created_by_user.name);
      }
    });
    return Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));
  }, [notes]);

  // Extrair lista única de etapas das notas
  const noteStages = useMemo(() => {
    const stageMap = new Map<string, string>();
    notes.forEach((note) => {
      if (note.stage) {
        stageMap.set(note.stage.id, note.stage.name);
      }
    });
    return Array.from(stageMap.entries()).map(([id, name]) => ({ id, name }));
  }, [notes]);

  // Atividades da etapa selecionada
  const stageActivities = useMemo(() => {
    if (!selectedStage) return [];
    const stage = stages.find(s => s.id === selectedStage);
    return stage?.activities || [];
  }, [selectedStage, stages]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // Filtro por texto
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesContent = note.content.toLowerCase().includes(searchLower);
        const matchesStage = note.stage?.name.toLowerCase().includes(searchLower);
        const matchesUser = note.created_by_user?.name.toLowerCase().includes(searchLower);
        const matchesActivity = note.activity_name?.toLowerCase().includes(searchLower);
        
        if (!matchesContent && !matchesStage && !matchesUser && !matchesActivity) {
          return false;
        }
      }

      // Filtro por data início
      if (startDate) {
        const noteDate = new Date(note.created_at).setHours(0, 0, 0, 0);
        const filterDate = new Date(startDate).setHours(0, 0, 0, 0);
        if (noteDate < filterDate) {
          return false;
        }
      }

      // Filtro por data fim
      if (endDate) {
        const noteDate = new Date(note.created_at).setHours(23, 59, 59, 999);
        const filterDate = new Date(endDate).setHours(23, 59, 59, 999);
        if (noteDate > filterDate) {
          return false;
        }
      }

      // Filtro por responsável
      if (selectedUser && note.created_by_user?.id !== selectedUser) {
        return false;
      }

      // Filtro por etapa
      if (selectedStage && note.stage?.id !== selectedStage) {
        return false;
      }

      // Filtro por atividade
      if (selectedActivity) {
        if (selectedActivity === 'has_activity') {
          if (!note.activity_id) return false;
        } else if (selectedActivity === 'no_activity') {
          if (note.activity_id) return false;
        } else {
          // Filtro por atividade específica
          if (note.activity_id !== selectedActivity) return false;
        }
      }

      return true;
    });
  }, [notes, searchTerm, startDate, endDate, selectedUser, selectedStage, selectedActivity]);

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setSelectedUser('');
    setSelectedStage('');
    setSelectedActivity('');
  };

  const hasActiveFilters = searchTerm || startDate || endDate || selectedUser || selectedStage || selectedActivity;

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <div className="space-y-3">
        {/* Busca global */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Buscar nas notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
          />
        </div>

        {/* Botão de filtros avançados */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-secondary-600 hover:text-primary-600 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filtros avançados
            {showFilters ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-secondary-500 hover:text-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Filtros avançados */}
        {showFilters && (
          <div className="p-4 bg-surface-50 rounded-xl border border-surface-200 animate-slide-up space-y-4">
            {/* Filtros de data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">
                  Data Início
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
                />
              </div>
            </div>

            {/* Filtros por responsável, etapa e atividade */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">
                  Responsável
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
                >
                  <option value="">Todos</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">
                  Etapa
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => {
                    setSelectedStage(e.target.value);
                    setSelectedActivity(''); // Limpar atividade ao mudar etapa
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
                >
                  <option value="">Todas</option>
                  {noteStages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-600 mb-1">
                  Atividade
                </label>
                <select
                  value={selectedActivity}
                  onChange={(e) => setSelectedActivity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all text-sm"
                  disabled={!selectedStage}
                >
                  <option value="">Todas</option>
                  <option value="has_activity">Com vínculo de atividade</option>
                  <option value="no_activity">Sem vínculo de atividade</option>
                  {stageActivities.length > 0 && (
                    <>
                      <option disabled>──────────</option>
                      {stageActivities.map((activity) => (
                        <option key={activity.id} value={activity.id}>
                          {activity.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>
            
            {!selectedStage && (
              <p className="text-xs text-secondary-400 italic">
                Selecione uma etapa para ver as atividades disponíveis.
              </p>
            )}
          </div>
        )}

        {/* Contador de resultados */}
        {hasActiveFilters && (
          <p className="text-xs text-secondary-500">
            Mostrando {filteredNotes.length} de {notes.length} nota(s)
          </p>
        )}
      </div>

      {/* Lista de notas */}
      {filteredNotes.length > 0 ? (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`p-4 rounded-xl border ${
                note.is_auto_generated
                  ? 'bg-surface-50 border-surface-200'
                  : 'bg-white border-surface-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {note.is_auto_generated && (
                    <Badge variant="neutral" className="text-xs">
                      Automática
                    </Badge>
                  )}
                  {note.stage && (
                    <Badge variant="info" className="text-xs">
                      {note.stage.name}
                    </Badge>
                  )}
                  {note.activity_id && (
                    <Badge variant="warning" className="text-xs flex items-center gap-1">
                      <ListTodo className="w-3 h-3" />
                      {note.activity_name || 'Atividade'}
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-secondary-500 shrink-0">
                  {new Date(note.created_at).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="text-secondary-700 whitespace-pre-wrap">
                {note.content}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-secondary-500">
                  Por: {note.created_by_user?.name || 'Sistema'}
                </span>
                {note.attachments && note.attachments.length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-primary-600">
                    <Paperclip className="w-3 h-3" />
                    {note.attachments.length} anexo(s)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-secondary-500 text-center py-4">
          {hasActiveFilters
            ? 'Nenhuma nota encontrada com os filtros aplicados.'
            : 'Nenhuma nota registrada ainda.'}
        </p>
      )}
    </div>
  );
}
