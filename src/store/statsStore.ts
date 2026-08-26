import { create } from 'zustand';
import { useTopicStore } from './topicStore';
import { usePomodoroStore } from './pomodoroStore';
import { useReviewStore } from './reviewStore';
import { useSubjectStore } from './subjectStore';
import { useVacationStore } from './vacationStore';
import { StudyStats } from '@/types';

interface StatsState {
  getStats: (startDate?: Date, endDate?: Date) => StudyStats;
  getStudyTimeBySubject: (startDate?: Date, endDate?: Date) => Record<string, number>;
  getStreak: () => number;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  getStats: (startDate, endDate) => {
    const topicStore = useTopicStore.getState();
    const pomodoroStore = usePomodoroStore.getState();
    const reviewStore = useReviewStore.getState();

    // Filtra tópicos por data de criação, se especificado
    const topics = topicStore.topics.filter(topic => {
      if (!startDate && !endDate) return true;

      const createdAt = new Date(topic.createdAt);
      return (!startDate || createdAt >= startDate) &&
        (!endDate || createdAt <= endDate);
    });

    // Filtra sessões por data, se especificado
    const sessions = pomodoroStore.sessions.filter(session => {
      if (!startDate && !endDate) return true;

      const sessionDate = new Date(session.date);
      return (!startDate || sessionDate >= startDate) &&
        (!endDate || sessionDate <= endDate);
    });

    // Filtra revisões concluídas por data, se especificado
    const reviews = reviewStore.reviews.filter(review => {
      if (!review.completed) return false;
      if (!startDate && !endDate) return true;

      const reviewDate = new Date(review.scheduledDate);
      return (!startDate || reviewDate >= startDate) &&
        (!endDate || reviewDate <= endDate);
    });

    // Calcula o tempo total de estudo
    const totalStudyTime = sessions.reduce((total, session) => total + session.duration, 0);

    // Agrupa o tempo de estudo por matéria
    const studyTimeBySubject = get().getStudyTimeBySubject(startDate, endDate);

    return {
      totalTopics: topics.length,
      totalStudyTime,
      completedReviews: reviews.length,
      studyTimeBySubject,
    };
  },

  getStudyTimeBySubject: (startDate, endDate) => {
    const topicStore = useTopicStore.getState();
    const pomodoroStore = usePomodoroStore.getState();
    const subjectStore = useSubjectStore.getState();

    // Inicializa o objeto com todas as matérias
    const studyTimeBySubject: Record<string, number> = {};
    subjectStore.subjects.forEach(subject => {
      studyTimeBySubject[subject.id] = 0;
    });

    // Filtra sessões por data, se especificado
    const sessions = pomodoroStore.sessions.filter(session => {
      if (!startDate && !endDate) return true;

      const sessionDate = new Date(session.date);
      return (!startDate || sessionDate >= startDate) &&
        (!endDate || sessionDate <= endDate);
    });

    // Para cada sessão, incrementa o tempo da matéria correspondente
    sessions.forEach(session => {
      // 1. Tenta achar como tópico primeiro
      const topic = topicStore.getTopicById(session.topicId);
      if (topic) {
        const subjectId = topic.subjectId;
        if (studyTimeBySubject[subjectId] !== undefined) {
          studyTimeBySubject[subjectId] += session.duration;
        }
      } else {
        // 2. Se não achar o tópico, o session.topicId pode ser diretamente o ID da matéria (ex: sessões em tempo real acumulando)
        const subject = subjectStore.subjects.find(s => s.id === session.topicId);
        if (subject) {
          if (studyTimeBySubject[subject.id] !== undefined) {
            studyTimeBySubject[subject.id] += session.duration;
          }
        }
      }
    });

    return studyTimeBySubject;
  },

  getStreak: () => {
    const pomodoroStore = usePomodoroStore.getState();
    const sessions = pomodoroStore.sessions;
    const vacationStore = useVacationStore.getState();

    if (sessions.length === 0) return 0;

    // Extrair datas únicas (YYYY-MM-DD)
    const uniqueDates = new Set(
      sessions.map(s => s.date.split('T')[0])
    );

    // Encontrar a data inicial de verificação (pode recuar se os dias recentes forem férias)
    let checkDate = new Date();
    let safetyLimit = 0;

    // Se hoje ou dias recentes forem de férias e não tiverem estudo, recua até o dia ativo antes das férias
    while (safetyLimit < 60) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (uniqueDates.has(dateStr)) {
        break;
      }
      if (vacationStore.isVacationDate(checkDate)) {
        checkDate.setDate(checkDate.getDate() - 1);
        safetyLimit++;
      } else {
        // Não é férias nem estudou hoje: verifica se ontem estudou
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (!uniqueDates.has(dateStr) && !uniqueDates.has(yesterday)) {
          // Se ontem foi férias, continua recuando
          const yesterdayDate = new Date(Date.now() - 86400000);
          if (vacationStore.isVacationDate(yesterdayDate)) {
            checkDate = yesterdayDate;
            safetyLimit++;
            continue;
          }
          return 0;
        }
        break;
      }
    }

    let streak = 0;
    let currentDate = new Date(checkDate);
    let loopCount = 0;

    while (loopCount < 365) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (uniqueDates.has(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (vacationStore.isVacationDate(currentDate)) {
        // Dia de férias mantém o streak sem quebrar
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
      loopCount++;
    }

    return streak;
  }
}));