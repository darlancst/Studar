import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Review, Topic, Subject } from '@/types';

export type PromptPeriod = 'this_week' | 'last_week' | 'this_month' | 'today';
export type QuestionStyle = 'multiple_choice' | 'cebraspe' | 'flashcards';

export interface ParsedTopicInfo {
  rawTitle: string;
  description?: string;
  pdfLabel?: string;
  pageRange?: string;
  topicTitle?: string;
  formattedLine: string;
}

export interface SubjectPromptData {
  subject: Subject;
  reviewsCount: number;
  parsedTopics: ParsedTopicInfo[];
  generatedPrompt: string;
}

/**
 * Analisa e extrai informações de PDF, intervalo de páginas e título de forma tolerante a variações.
 */
export function parsePdfTopic(title: string, description?: string): ParsedTopicInfo {
  const fullText = `${title} ${description || ''}`.trim();
  
  let pdfLabel: string | undefined;
  let pageRange: string | undefined;
  let topicTitle: string | undefined;

  // 1. Extração de PDF / Aula / Módulo
  const pdfMatch = fullText.match(/(?:pdf|aula|m[oó]dulo|caderno)\s*0?(\d+)/i);
  if (pdfMatch) {
    const isAula = /aula/i.test(pdfMatch[0]);
    const num = pdfMatch[1].padStart(2, '0');
    pdfLabel = isAula ? `Aula ${num}` : `PDF ${num}`;
  }

  // 2. Extração de Intervalo de Páginas (ex: 87-120, 87 a 120, págs 87..120, etc.)
  const pageRangeMatch = fullText.match(/(?:p[aá]gs?\.?|p\.?|p[aá]ginas?)?\s*(\d{1,4})\s*(?:-|–|—|a|à|ao|at[eé]|\.\.)\s*(\d{1,4})/i);
  if (pageRangeMatch) {
    const start = parseInt(pageRangeMatch[1], 10);
    const end = parseInt(pageRangeMatch[2], 10);
    if (!isNaN(start) && !isNaN(end) && start <= end) {
      pageRange = `${start} a ${end}`;
    }
  } else {
    // Página única (ex: pág 87, p. 87)
    const singlePageMatch = fullText.match(/(?:p[aá]gs?\.?|p\.?|p[aá]ginas?)\s*(\d{1,4})/i);
    if (singlePageMatch) {
      pageRange = `Página ${singlePageMatch[1]}`;
    }
  }

  // 3. Extrair resíduo de título para assunto
  let cleanedTitle = title;
  if (pdfMatch) {
    cleanedTitle = cleanedTitle.replace(pdfMatch[0], '');
  }
  if (pageRangeMatch) {
    cleanedTitle = cleanedTitle.replace(pageRangeMatch[0], '');
  }
  // Limpar pontuações soltas resultantes
  cleanedTitle = cleanedTitle.replace(/^[\s\.\:\-\–\—\(\)]+|[\s\.\:\-\–\—\(\)]+$/g, '').trim();

  if (cleanedTitle.length > 2) {
    topicTitle = cleanedTitle;
  }

  // 4. Montar a linha formatada para o prompt
  let formattedLine = '';
  if (pdfLabel && pageRange) {
    formattedLine = `• ${pdfLabel} (Páginas ${pageRange})${topicTitle ? ` - ${topicTitle}` : ''}`;
  } else if (pdfLabel) {
    formattedLine = `• ${pdfLabel}${topicTitle ? `: ${topicTitle}` : ' (Material / PDF Completo)'}`;
  } else {
    formattedLine = `• ${title}${description ? ` - ${description}` : ''}`;
  }

  return {
    rawTitle: title,
    description,
    pdfLabel,
    pageRange,
    topicTitle,
    formattedLine
  };
}

/**
 * Gera o texto do prompt estruturado para o Gemini Notebook / NotebookLM.
 */
export function buildSubjectPrompt({
  subjectName,
  parsedTopics,
  periodLabel,
  questionCount = 10,
  questionStyle = 'multiple_choice'
}: {
  subjectName: string;
  parsedTopics: ParsedTopicInfo[];
  periodLabel: string;
  questionCount?: number;
  questionStyle?: QuestionStyle;
}): string {
  // Remover duplicatas de linhas formatadas
  const uniqueLines = Array.from(new Set(parsedTopics.map(t => t.formattedLine)));

  let styleInstructions = '';
  switch (questionStyle) {
    case 'cebraspe':
      styleInstructions = `Elabore ${questionCount} questões inéditas no estilo CERTO ou ERRADO (estilo Cebraspe), com pegadinhas clássicas de prova e gabarito fundamentado.`;
      break;
    case 'flashcards':
      styleInstructions = `Elabore ${questionCount} perguntas diretas / flashcards de alta retenção (Pergunta e Resposta detalhada com fundamentação).`;
      break;
    case 'multiple_choice':
    default:
      styleInstructions = `Elabore ${questionCount} questões inéditas de múltipla escolha com 5 alternativas (A, B, C, D, E), trazendo situações hipotéticas contextualizadas e gabarito comentado alternativa por alternativa.`;
      break;
  }

  return `Você é um tutor acadêmico de alto nível e elaborador experiente de questões para concursos públicos.

Com base nas fontes carregadas neste caderno de **${subjectName}**, analise com máxima fidelidade exclusivamente as páginas e trechos que revisei (${periodLabel}):

---
📌 PÁGINAS E MATERIAIS REVISADOS:
${uniqueLines.join('\n')}
---

🎯 ETAPA 1: MAPEAMENTO COMPACTO DOS TÓPICOS
1. Analise os PDFs e trechos acima nas fontes deste caderno e liste de forma DIRETA e COMPACTA (em tópicos concisos / bullet points objetivos, sem textos longos) os principais temas, regras e conceitos abordados exatamente nessas páginas.

🎯 ETAPA 2: ELABORAÇÃO DO BANCO DE QUESTÕES
2. ${styleInstructions}
3. Foco estrito: Utilize APENAS os conceitos e detalhes contidos nas páginas indicadas acima.
4. Para cada questão, indique a justificativa completa e cite a página exata da fonte/PDF de onde a resposta foi extraída.`;
}

/**
 * Obtém o intervalo de datas baseado na opção de período selecionada.
 */
export function getDateRangeForPeriod(period: PromptPeriod): { start: Date; end: Date; label: string } {
  const now = new Date();

  switch (period) {
    case 'today':
      return {
        start: now,
        end: now,
        label: `Hoje (${format(now, 'dd/MM')})`
      };
    case 'last_week': {
      const prevWeekDate = subWeeks(now, 1);
      const start = startOfWeek(prevWeekDate, { weekStartsOn: 1 });
      const end = endOfWeek(prevWeekDate, { weekStartsOn: 1 });
      return {
        start,
        end,
        label: `Semana Passada (${format(start, 'dd/MM')} a ${format(end, 'dd/MM')})`
      };
    }
    case 'this_month': {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return {
        start,
        end,
        label: `Mês de ${format(now, 'MMMM', { locale: ptBR })}`
      };
    }
    case 'this_week':
    default: {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      return {
        start,
        end,
        label: `Esta Semana (${format(start, 'dd/MM')} a ${format(end, 'dd/MM')})`
      };
    }
  }
}

/**
 * Agrupa todas as revisões do período por matéria e gera os dados de prompt.
 */
export function getPromptDataForPeriod({
  period,
  reviews,
  topics,
  subjects,
  questionCount = 10,
  questionStyle = 'multiple_choice',
  onlyCompleted = false
}: {
  period: PromptPeriod;
  reviews: Review[];
  topics: Topic[];
  subjects: Subject[];
  questionCount?: number;
  questionStyle?: QuestionStyle;
  onlyCompleted?: boolean;
}): {
  subjectPrompts: SubjectPromptData[];
  periodLabel: string;
  totalReviewsInPeriod: number;
} {
  const { start, end, label } = getDateRangeForPeriod(period);

  // Filtrar revisões dentro do período
  const filteredReviews = reviews.filter(r => {
    if (onlyCompleted && !r.completed) return false;

    // Se estiver concluída, usa a data de conclusão; senão, a data agendada
    const checkDate = r.completed && r.date
      ? (typeof r.date === 'string' ? parseISO(r.date) : new Date(r.date))
      : (typeof r.scheduledDate === 'string' ? parseISO(r.scheduledDate) : new Date(r.scheduledDate));

    if (period === 'today') {
      return isSameDay(checkDate, start);
    }

    return isWithinInterval(checkDate, { start, end });
  });

  // Agrupar por Matéria
  const subjectMap = new Map<string, { subject: Subject; parsedTopics: ParsedTopicInfo[]; reviewsCount: number }>();

  filteredReviews.forEach(review => {
    const topic = topics.find(t => t.id === review.topicId);
    if (!topic) return;

    const subject = subjects.find(s => s.id === topic.subjectId);
    if (!subject) return;

    const parsed = parsePdfTopic(topic.title, topic.description);

    if (!subjectMap.has(subject.id)) {
      subjectMap.set(subject.id, {
        subject,
        parsedTopics: [parsed],
        reviewsCount: 1
      });
    } else {
      const entry = subjectMap.get(subject.id)!;
      entry.parsedTopics.push(parsed);
      entry.reviewsCount += 1;
    }
  });

  const subjectPrompts: SubjectPromptData[] = Array.from(subjectMap.values()).map(entry => {
    return {
      subject: entry.subject,
      reviewsCount: entry.reviewsCount,
      parsedTopics: entry.parsedTopics,
      generatedPrompt: buildSubjectPrompt({
        subjectName: entry.subject.name,
        parsedTopics: entry.parsedTopics,
        periodLabel: label,
        questionCount,
        questionStyle
      })
    };
  });

  return {
    subjectPrompts,
    periodLabel: label,
    totalReviewsInPeriod: filteredReviews.length
  };
}
