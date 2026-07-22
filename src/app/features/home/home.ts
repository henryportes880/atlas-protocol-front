import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AtlasBrand } from '../../shared/ui/atlas-brand/atlas-brand';
import { AtlasIcon, AtlasIconName } from '../../shared/ui/atlas-icon/atlas-icon';

interface FeatureCard {
  title: string;
  description: string;
  icon: AtlasIconName;
  note?: string;
}

interface JourneyStep {
  number: string;
  title: string;
  description: string;
}

interface AudienceCard {
  id: string;
  label: string;
  title: string;
  titleContinuation: string;
  description: string;
  icon: AtlasIconName;
  items: string[];
  closing: string;
  featured?: boolean;
}

interface TimelinePoint {
  marker: string;
  label: string;
  meta?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, AtlasBrand, AtlasIcon],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly auth = inject(AuthService);

  readonly menuOpen = signal(false);
  readonly isAuthenticated = this.auth.isAuthenticated();

  readonly features: FeatureCard[] = [
    {
      title: 'Protocolos com histórico',
      description: 'Crie protocolos estruturados e mantenha versões anteriores preservadas quando houver alterações.',
      note: 'O presente muda. O histórico não desaparece.',
      icon: 'flask',
    },
    {
      title: 'Acompanhamentos registrados',
      description: 'Organize eventos e registros de acompanhamento com status, datas e contexto vinculados ao atleta.',
      icon: 'activity',
    },
    {
      title: 'Check-ins estruturados',
      description: 'Transforme atualizações periódicas em registros organizados, com fluxo entre envio e revisão.',
      icon: 'clipboard',
    },
    {
      title: 'Uma linha do tempo consistente',
      description:
        'Protocolos, check-ins e acompanhamentos deixam de existir como informações isoladas e passam a formar um histórico consultável.',
      icon: 'chart',
    },
  ];

  readonly journeySteps: JourneyStep[] = [
    {
      number: '01',
      title: 'O vínculo começa',
      description: 'Atleta e profissional passam a compartilhar um espaço de acompanhamento dentro da plataforma.',
    },
    {
      number: '02',
      title: 'O protocolo ganha estrutura',
      description: 'O profissional registra o protocolo e suas alterações passam a preservar versões anteriores.',
    },
    {
      number: '03',
      title: 'A rotina gera registros',
      description: 'Acompanhamentos e check-ins adicionam novos pontos à linha do tempo.',
    },
    {
      number: '04',
      title: 'O histórico ganha contexto',
      description:
        'Em vez de consultar informações isoladas, é possível acompanhar a sequência de acontecimentos ao longo do tempo.',
    },
  ];

  readonly historyTimeline: TimelinePoint[] = [
    { marker: 'V1', label: 'Protocolo v1' },
    { marker: '01', label: 'Alteração' },
    { marker: 'V2', label: 'Protocolo v2' },
    { marker: '02', label: 'Check-in' },
    { marker: '03', label: 'Acompanhamento' },
    { marker: 'V3', label: 'Protocolo v3' },
  ];

  readonly audiences: AudienceCard[] = [
    {
      id: 'para-atletas',
      label: 'Para quem vive o processo',
      title: 'Menos informação espalhada.',
      titleContinuation: 'Mais contexto sobre a própria trajetória.',
      description:
        'Dentro do Atlas, o atleta encontra em um único ambiente aquilo que faz parte do seu acompanhamento.',
      icon: 'activity',
      items: [
        'Consulte seu protocolo atual',
        'Acesse seu histórico',
        'Realize check-ins',
        'Visualize acompanhamentos registrados',
        'Mantenha sua trajetória organizada ao longo do tempo',
      ],
      closing: 'Seu histórico não deveria depender da memória ou de mensagens antigas.',
    },
    {
      id: 'para-profissionais',
      label: 'Para quem acompanha o processo',
      title: 'Cada atleta tem uma história.',
      titleContinuation: 'O Atlas ajuda a não perder o contexto dela.',
      description:
        'Organize vínculos, protocolos e registros sem transformar o acompanhamento em uma coleção de informações desconectadas.',
      icon: 'shield',
      items: [
        'Gerencie atletas vinculados',
        'Estruture protocolos',
        'Preserve versões anteriores',
        'Registre acompanhamentos',
        'Revise check-ins',
        'Consulte o histórico de cada atleta',
      ],
      closing: 'Menos tempo procurando informações.\nMais contexto para acompanhar cada trajetória.',
      featured: true,
    },
  ];

  readonly differentiators: FeatureCard[] = [
    {
      title: 'Histórico que não é sobrescrito',
      description:
        'Alterações importantes não precisam apagar aquilo que existia antes. O Atlas preserva versões para manter a trajetória compreensível.',
      icon: 'clock',
    },
    {
      title: 'Relações claramente definidas',
      description:
        'Atletas e profissionais possuem papéis e permissões diferentes dentro da plataforma, respeitando quem pode visualizar ou alterar cada informação.',
      icon: 'user',
    },
    {
      title: 'Registros conectados',
      description:
        'Protocolos, check-ins e acompanhamentos fazem parte do mesmo contexto, em vez de existirem como dados isolados.',
      icon: 'chart',
    },
    {
      title: 'Acompanhamento sem prescrição automática',
      description:
        'O Atlas organiza e apresenta informações. Ele não diagnostica, não prescreve e não substitui a avaliação profissional.',
      icon: 'shield',
    },
  ];

  readonly timeTimeline: TimelinePoint[] = [
    { marker: 'V1', label: 'Marco inicial', meta: 'Protocolo registrado' },
    { marker: 'V2', label: 'Primeira mudança', meta: 'Check-in entre versões' },
    { marker: 'V2', label: 'Continuidade', meta: 'Acompanhamento registrado' },
    { marker: 'V3', label: 'Novo ciclo', meta: 'Novo check-in' },
  ];

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }
}
