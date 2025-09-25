export interface Subject {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  topics: Topic[]; // Referência aos tópicos desta matéria
}

export interface Topic {
  id: string;
  title: string;
  description?: string;
  subjectId: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  topicId: string;
  scheduledDate: Date;
  completed: boolean;
  date: Date; // Data de conclusão
}

export interface PomodoroSession {
  id: string;
  topicId: string;
  duration: number; // em minutos
  date: string; // Padronizado para ISO string
}

export interface PomodoroSettings {
  focusDuration: number; // em minutos
  shortBreakDuration: number; // em minutos
  longBreakDuration: number; // em minutos
  longBreakInterval: number; // número de ciclos de foco antes de uma pausa longa
}

export type PomodoroState = 'focus' | 'shortBreak' | 'longBreak' | 'idle';

export interface StudyStats {
  totalTopics: number;
  totalStudyTime: number; // em minutos
  completedReviews: number;
  studyTimeBySubject: Record<string, number>; // subjectId -> tempo em minutos
}

export type TabName = 'calendar' | 'pomodoro' | 'stats' | 'simulados';

export interface Simulado {
  id: string;
  name?: string; // Nome passa a ser opcional
  date: string;
  subjectId: string;
  topicId?: string; // Tópico é opcional
  timeSpent?: number; // Tempo gasto em minutos (opcional)
  questions: number;
  hits: number;
} 