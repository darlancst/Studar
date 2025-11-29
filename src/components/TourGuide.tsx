import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export default function TourGuide() {
    useEffect(() => {
        const hasSeenTour = localStorage.getItem('studar_has_seen_tour');

        if (!hasSeenTour) {
            const driverObj = driver({
                showProgress: true,
                animate: true,
                allowClose: true,
                doneBtnText: 'Concluir',
                nextBtnText: 'Próximo',
                prevBtnText: 'Anterior',
                progressText: 'Passo {{current}} de {{total}}',
                steps: [
                    {
                        element: '#tour-welcome',
                        popover: {
                            title: 'Bem-vindo ao Studar! 🚀',
                            description: 'Seu companheiro definitivo de estudos. Vamos fazer um tour rápido?',
                            side: 'bottom',
                            align: 'center'
                        }
                    },
                    {
                        element: '#tour-subjects-btn',
                        popover: {
                            title: '1. Matérias e Tópicos',
                            description: 'Primeiro passo: Cadastre as matérias e tópicos que você precisa estudar.',
                            side: 'bottom'
                        },
                        onHighlightStarted: () => {
                            window.dispatchEvent(new CustomEvent('navigate-to-calendar'));
                        }
                    },
                    {
                        element: '#tour-calendar-planned',
                        popover: {
                            title: '2. Agenda do Dia',
                            description: 'Aqui você vê o que planejou para hoje e pode adicionar estudos avulsos.',
                            side: 'bottom'
                        }
                    },
                    {
                        element: '#tour-schedule-btn',
                        popover: {
                            title: '3. Cronograma Automático',
                            description: 'Crie cronogramas semanais ou por blocos (ex: reta final) e deixe o app organizar sua rotina.',
                            side: 'bottom'
                        },
                        onHighlightStarted: () => {
                            window.dispatchEvent(new CustomEvent('navigate-to-schedule'));
                        }
                    },
                    {
                        element: '#tour-pomodoro-widget',
                        popover: {
                            title: '4. Foco Total',
                            description: 'No Dashboard, veja sua próxima tarefa e inicie o timer Pomodoro com um clique.',
                            side: 'left'
                        },
                        onHighlightStarted: () => {
                            window.dispatchEvent(new CustomEvent('navigate-to-dashboard'));
                        }
                    },
                    {
                        element: '#tour-stats-kpi',
                        popover: {
                            title: '5. Métricas',
                            description: 'Acompanhe horas líquidas, sessões, revisões e sua meta semanal.',
                            side: 'top'
                        }
                    },
                    {
                        element: '#tour-heatmap',
                        popover: {
                            title: '6. Constância',
                            description: 'O mapa de calor mostra seu ritmo. Tente pintar todos os quadradinhos! 🔥',
                            side: 'top'
                        }
                    },
                    {
                        element: '#tour-settings-btn',
                        popover: {
                            title: '7. Ajustes',
                            description: 'Configure o modo escuro, tempos do Pomodoro e suas metas aqui.',
                            side: 'left'
                        }
                    }
                ],
                onDestroyStarted: () => {
                    localStorage.setItem('studar_has_seen_tour', 'true');
                    driverObj.destroy();
                },
                onNextClick: (element, step, { config, state }) => {
                    const nextStepIndex = (state?.activeIndex ?? 0) + 1;
                    const nextStep = config.steps?.[nextStepIndex];

                    if (nextStep) {
                        // Lógica de navegação baseada no próximo passo
                        if (nextStep.element === '#tour-subjects-btn') {
                            window.dispatchEvent(new CustomEvent('navigate-to-calendar'));
                        } else if (nextStep.element === '#tour-schedule-btn') {
                            window.dispatchEvent(new CustomEvent('navigate-to-schedule'));
                        } else if (nextStep.element === '#tour-pomodoro-widget') {
                            window.dispatchEvent(new CustomEvent('navigate-to-dashboard'));
                        }

                        // Pequeno delay para a UI renderizar antes de mover o driver
                        setTimeout(() => {
                            driverObj.moveNext();
                        }, 300);
                    }
                },
                onPrevClick: (element, step, { config, state }) => {
                    const prevStepIndex = (state?.activeIndex ?? 0) - 1;
                    const prevStep = config.steps?.[prevStepIndex];

                    if (prevStep) {
                        if (prevStep.element === '#tour-subjects-btn' || prevStep.element === '#tour-calendar-planned') {
                            window.dispatchEvent(new CustomEvent('navigate-to-calendar'));
                        } else if (prevStep.element === '#tour-schedule-btn') {
                            window.dispatchEvent(new CustomEvent('navigate-to-schedule'));
                        } else if (prevStep.element === '#tour-pomodoro-widget' || prevStep.element === '#tour-stats-kpi' || prevStep.element === '#tour-heatmap') {
                            window.dispatchEvent(new CustomEvent('navigate-to-dashboard'));
                        }

                        setTimeout(() => {
                            driverObj.movePrevious();
                        }, 300);
                    }
                }
            });

            setTimeout(() => {
                driverObj.drive();
            }, 1000);
        }
    }, []);

    return null;
}
