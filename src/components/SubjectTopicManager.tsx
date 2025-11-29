'use client';

import { useState } from 'react';
import { XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { Subject, Topic } from '@/types';
import TopicReviews from './TopicReviews';

interface SubjectTopicManagerProps {
  onClose: () => void;
}

// Constantes para paginação de tópicos
const INITIAL_TOPIC_LIMIT = 10;
const TOPIC_INCREMENT = 10;

export default function SubjectTopicManager({ onClose }: SubjectTopicManagerProps) {
  const [activeTab, setActiveTab] = useState<'subjects' | 'topics' | 'reviews'>('subjects');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);

  // States for Reviews Tab
  const [reviewSubjectId, setReviewSubjectId] = useState<string>('');
  const [reviewTopicId, setReviewTopicId] = useState<string>('');

  // Estado para controlar quantos tópicos são visíveis
  const [visibleTopicCount, setVisibleTopicCount] = useState(INITIAL_TOPIC_LIMIT);

  // Busca a lista de matérias antes de definir a cor inicial
  const { subjects, addSubject, updateSubject, deleteSubject } = useSubjectStore();

  // Colors para matérias (paleta completa)
  const allColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#84CC16',
    '#9333EA', '#2563EB', '#059669', '#B91C1C', '#FB7185'
  ];

  // Obtém as cores já utilizadas por OUTRAS matérias
  const usedColorsByOthers = subjects
    .filter(subject => !editingSubject || subject.id !== editingSubject.id)
    .map(subject => subject.color);

  // Encontra a primeira cor disponível - reutilizável
  const getFirstAvailableColor = () => {
    return allColors.find(color => !usedColorsByOthers.includes(color)) || allColors[0];
  };

  // Agora inicializamos com a primeira cor disponível, não uma cor fixa
  // Usando uma função no useState para garantir que é calculado apenas uma vez na montagem
  const [subjectName, setSubjectName] = useState('');
  const [subjectColor, setSubjectColor] = useState(() => getFirstAvailableColor());
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDescription, setTopicDescription] = useState('');
  const [topicSubjectId, setTopicSubjectId] = useState('');

  const { topics, addTopic, updateTopic, deleteTopic } = useTopicStore();

  // Ordena as cores para colocar as indisponíveis no final
  const sortedColors = [...allColors].sort((a, b) => {
    const isAUsedByOther = usedColorsByOthers.includes(a);
    const isBUsedByOther = usedColorsByOthers.includes(b);
    // Se 'a' está usada e 'b' não, 'a' vem depois (retorna positivo)
    if (isAUsedByOther && !isBUsedByOther) return 1;
    // Se 'b' está usada e 'a' não, 'b' vem depois (retorna negativo)
    if (!isAUsedByOther && isBUsedByOther) return -1;
    // Caso contrário, mantém a ordem original
    return 0;
  });

  // Manipuladores de formulário
  const handleSubjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSubject) {
      updateSubject(editingSubject.id, { name: subjectName, color: subjectColor });
      setEditingSubject(null);
    } else {
      addSubject(subjectName, subjectColor);
    }
    setSubjectName('');

    // Após adicionar a matéria, encontra a primeira cor disponível
    // Primeiro obtém as cores usadas por todas as matérias (incluindo a que acabou de ser adicionada)
    const updatedUsedColors = [...subjects, ...(editingSubject ? [] : [{ color: subjectColor }])]
      .map(subject => subject.color);

    // Encontra a primeira cor disponível na lista ordenada
    const firstAvailableColor = allColors.find(color => !updatedUsedColors.includes(color)) || allColors[0];

    // Define o campo de cor para a primeira cor disponível
    setSubjectColor(firstAvailableColor);
  };

  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTopic) {
      updateTopic(editingTopic.id, {
        title: topicTitle,
        description: topicDescription,
        subjectId: topicSubjectId
      });
      setEditingTopic(null);
    } else {
      addTopic(topicTitle, topicSubjectId, topicDescription);
    }
    setTopicTitle('');
    setTopicDescription('');
    setTopicSubjectId(subjects[0]?.id || '');
  };

  // Filter topics for the reviews tab based on selected subject
  const filteredTopicsForReview = topics.filter(topic => topic.subjectId === reviewSubjectId);

  return (
    <div className="fixed inset-0 z-50 bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 overflow-y-auto flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl m-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold dark:text-white">Gerenciar Matérias e Tópicos</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex border-b dark:border-gray-700">
          <button
            className={`px-6 py-3 font-medium text-sm ${activeTab === 'subjects'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            onClick={() => setActiveTab('subjects')}
          >
            Matérias
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm ${activeTab === 'topics'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            onClick={() => setActiveTab('topics')}
          >
            Tópicos
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm ${activeTab === 'reviews'
              ? 'border-b-2 border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            onClick={() => setActiveTab('reviews')}
          >
            Revisões
          </button>
        </div>

        <div className="p-6 min-h-[60vh]">
          {activeTab === 'subjects' && (
            <>
              <form onSubmit={handleSubjectSubmit} className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nome da Matéria
                    </label>
                    <input
                      type="text"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Ex: Matemática"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Cor
                    </label>
                    <div className="subject-colors">
                      {/* Mapeia sobre as cores ORDENADAS */}
                      {sortedColors.map((color) => {
                        // Verifica se a cor está usada por OUTRA matéria
                        const isUsedByOther = usedColorsByOthers.includes(color);
                        // A cor está disponível para seleção se NÃO estiver usada por outra
                        // OU se for a cor original da matéria que estamos editando
                        const isAvailableForSelection = !isUsedByOther || (editingSubject && color === editingSubject.color);
                        const isSelectedInForm = subjectColor === color;

                        return (
                          <div
                            key={color}
                            className={`
                              color-option 
                              ${isSelectedInForm ? 'selected' : ''}
                              ${!isAvailableForSelection ? 'disabled-color' : ''} 
                            `}
                            style={{
                              backgroundColor: isAvailableForSelection ? color : '#E5E7EB', // Cinza claro para indisponível
                              cursor: isAvailableForSelection ? 'pointer' : 'not-allowed',
                              opacity: isAvailableForSelection ? 1 : 0.6, // Reduz opacidade da indisponível
                            }}
                            // Só adiciona onClick se a cor estiver disponível
                            onClick={isAvailableForSelection ? () => setSubjectColor(color) : undefined}
                            title={!isAvailableForSelection ? 'Cor já em uso por outra matéria' : ''}
                            aria-disabled={!isAvailableForSelection}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium"
                  >
                    {editingSubject ? 'Atualizar Matéria' : 'Adicionar Matéria'}
                  </button>
                </div>
              </form>

              <h3 className="font-medium mb-2 dark:text-white">Matérias</h3>
              <div className="space-y-2">
                {subjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: subject.color }}
                      />
                      <span className="dark:text-white">{subject.name}</span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingSubject(subject);
                          setSubjectName(subject.name);
                          setSubjectColor(subject.color);
                        }}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteSubject(subject.id)}
                        className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'topics' && (
            <>
              <form onSubmit={handleTopicSubmit} className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Título do Tópico
                    </label>
                    <input
                      type="text"
                      value={topicTitle}
                      onChange={(e) => setTopicTitle(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Ex: Equações de 2º Grau"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Matéria
                    </label>
                    <select
                      value={topicSubjectId}
                      onChange={(e) => setTopicSubjectId(e.target.value)}
                      className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      required
                    >
                      <option value="">Selecione uma matéria</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={topicDescription}
                    onChange={(e) => setTopicDescription(e.target.value)}
                    rows={3}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Descreva o conteúdo deste tópico..."
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={subjects.length === 0}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${subjects.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                  >
                    {editingTopic ? 'Atualizar Tópico' : 'Adicionar Tópico'}
                  </button>
                </div>
              </form>

              <h3 className="font-medium mb-2 dark:text-white">Tópicos</h3>

              {/* Ordena os tópicos por data de criação (mais recentes primeiro) */}
              {(() => {
                const sortedTopics = [...topics].sort((a, b) =>
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                // Pega apenas a quantidade visível de tópicos
                const visibleTopics = sortedTopics.slice(0, visibleTopicCount);

                return (
                  <>
                    <div className="space-y-2">
                      {visibleTopics.map((topic) => {
                        const subject = subjects.find((s) => s.id === topic.subjectId);
                        return (
                          <div
                            key={topic.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div>
                              <div className="flex items-center">
                                {subject && (
                                  <div
                                    className="w-3 h-3 rounded-full mr-2"
                                    style={{ backgroundColor: subject.color }}
                                  />
                                )}
                                <span className="font-medium dark:text-white">{topic.title}</span>
                              </div>
                              {topic.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                                  {topic.description}
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setEditingTopic(topic);
                                  setTopicTitle(topic.title);
                                  setTopicDescription(topic.description || '');
                                  setTopicSubjectId(topic.subjectId);
                                }}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => deleteTopic(topic.id)}
                                className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Botão Carregar Mais (se houver mais tópicos) */}
                    {sortedTopics.length > visibleTopicCount && (
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setVisibleTopicCount(prevCount =>
                            Math.min(prevCount + TOPIC_INCREMENT, sortedTopics.length)
                          )}
                          className="px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          Carregar Mais ({visibleTopicCount}/{sortedTopics.length})
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selecione a Matéria
                  </label>
                  <select
                    value={reviewSubjectId}
                    onChange={(e) => {
                      setReviewSubjectId(e.target.value);
                      setReviewTopicId(''); // Reset topic when subject changes
                    }}
                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selecione o Tópico
                  </label>
                  <select
                    value={reviewTopicId}
                    onChange={(e) => setReviewTopicId(e.target.value)}
                    disabled={!reviewSubjectId}
                    className={`w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white ${!reviewSubjectId ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    <option value="">
                      {!reviewSubjectId ? 'Selecione uma matéria primeiro' : 'Selecione...'}
                    </option>
                    {filteredTopicsForReview.map((topic) => (
                      <option key={topic.id} value={topic.id}>
                        {topic.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-6">
                {reviewTopicId ? (
                  <TopicReviews topicId={reviewTopicId} />
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    Selecione uma matéria e um tópico para gerenciar as revisões.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}