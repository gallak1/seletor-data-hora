import {
  ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter,
  HostListener, Input, Output, forwardRef,
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  PartesData, dataDoFuso, formatar, fusoDoNavegador, interpretar, partesNoFuso,
} from './utilitarios-data';

/** Cores aceitas pelo componente. Todas são opcionais; o padrão é um tema claro. */
export interface CoresSeletor {
  fundo?: string;         // fundo do campo e do calendário
  fonte?: string;         // cor do texto
  fonteSecundaria?: string; // texto de apoio (dias de outro mês, rótulos)
  borda?: string;         // bordas e divisórias
  destaque?: string;      // fundo do dia selecionado
  fonteDestaque?: string; // texto sobre o destaque
  hover?: string;         // fundo dos dias e ao passar o mouse
}

/** Valor devolvido ao componente pai sempre que o usuário altera a seleção. */
export interface ValorSelecionado {
  texto: string; // valor já formatado (ex.: "2026-10-14 10:30")
  data: Date;    // instante real, considerando o fuso horário configurado
}

/** Uma célula da grade do calendário. */
interface CelulaDia {
  ano: number;
  mes: number;
  dia: number;
  foraDoMes: boolean;
}

const NOMES_MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

@Component({
  selector: 'seletor-data-hora',
  standalone: true,
  imports: [NgFor, NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SeletorDataHoraComponent), multi: true }],
  host: {
    '[style.--sdh-fundo]': 'cores?.fundo',
    '[style.--sdh-fonte]': 'cores?.fonte',
    '[style.--sdh-fonte-secundaria]': 'cores?.fonteSecundaria',
    '[style.--sdh-borda]': 'cores?.borda',
    '[style.--sdh-destaque]': 'cores?.destaque',
    '[style.--sdh-fonte-destaque]': 'cores?.fonteDestaque',
    '[style.--sdh-hover]': 'cores?.hover',
  },
  template: `
    <div class="sdh-campo" *ngIf="exibicao === 'dropdown'">
      <input class="sdh-input" [value]="texto" [placeholder]="placeholder || formatoEfetivo"
        [disabled]="desabilitado" (click)="abrir()" (keydown.escape)="fechar()"
        (change)="aoDigitar($any($event.target).value)" />
      <span class="sdh-icone" aria-hidden="true">▾</span>
    </div>

    <div class="sdh-painel" *ngIf="exibicao === 'inline' || aberto"
      [class.sdh-flutuante]="exibicao === 'dropdown'">
      <div class="sdh-cabecalho">
        <button type="button" class="sdh-seta" (click)="mudarMes(-1)" aria-label="Mês anterior">‹</button>
        <span>{{ nomeMes }} {{ anoVisivel }}</span>
        <button type="button" class="sdh-seta" (click)="mudarMes(1)" aria-label="Próximo mês">›</button>
      </div>

      <div class="sdh-grade">
        <span class="sdh-semana" *ngFor="let d of diasSemana">{{ d }}</span>
        <button type="button" class="sdh-dia" *ngFor="let c of celulas"
          [class.sdh-fora]="c.foraDoMes" [class.sdh-hoje]="ehHoje(c)"
          [class.sdh-selecionado]="ehSelecionado(c)" (click)="selecionarDia(c)">{{ c.dia }}</button>
      </div>

      <div class="sdh-horas" *ngIf="modo === 'dataHora'">
        <label>Hora
          <input type="number" min="0" max="23" [value]="selecionado?.hora ?? 0"
            (change)="mudarHorario('hora', $any($event.target).value)" />
        </label>
        <label>Minuto
          <input type="number" min="0" max="59" [value]="selecionado?.minuto ?? 0"
            (change)="mudarHorario('minuto', $any($event.target).value)" />
        </label>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --_fundo: var(--sdh-fundo, #ffffff);
      --_fonte: var(--sdh-fonte, #1e293b);
      --_fonte2: var(--sdh-fonte-secundaria, #94a3b8);
      --_borda: var(--sdh-borda, #e2e8f0);
      --_destaque: var(--sdh-destaque, #334155);
      --_fonte-destaque: var(--sdh-fonte-destaque, #ffffff);
      --_hover: var(--sdh-hover, #f1f5f9);
      position: relative; display: inline-block; font: inherit; color: var(--_fonte);
    }
    .sdh-campo { position: relative; }
    .sdh-input, .sdh-horas input {
      box-sizing: border-box; width: 100%; padding: 8px 12px; font: inherit; color: var(--_fonte);
      background: var(--_fundo); border: 1px solid var(--_borda); border-radius: 8px; outline: none;
    }
    .sdh-input { padding-right: 32px; min-width: 200px; }
    .sdh-input:focus, .sdh-horas input:focus { border-color: var(--_destaque); }
    .sdh-icone { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--_fonte2); pointer-events: none; }
    .sdh-painel {
      box-sizing: border-box; width: 296px; padding: 16px; background: var(--_fundo);
      border: 1px solid var(--_borda); border-radius: 12px;
    }
    .sdh-flutuante { position: absolute; z-index: 1000; top: calc(100% + 6px); left: 0; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
    .sdh-cabecalho { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-weight: 500; }
    .sdh-seta, .sdh-dia { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; border-radius: 6px; }
    .sdh-seta { width: 28px; height: 28px; font-size: 18px; color: var(--_fonte2); }
    .sdh-seta:hover { background: var(--_hover); }
    .sdh-grade { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .sdh-semana { text-align: center; font-size: 11px; text-transform: uppercase; color: var(--_fonte2); padding-bottom: 4px; }
    .sdh-dia { height: 34px; font-size: 13px; background: var(--_hover); }
    .sdh-dia:hover { outline: 1px solid var(--_borda); }
    .sdh-fora { color: var(--_fonte2); background: none; }
    .sdh-hoje { font-weight: 700; }
    .sdh-selecionado, .sdh-selecionado:hover { background: var(--_destaque); color: var(--_fonte-destaque); outline: none; }
    .sdh-horas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--_borda); }
    .sdh-horas label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--_fonte2); }
  `],
})
export class SeletorDataHoraComponent implements ControlValueAccessor {
  /** 'dataHora' (padrão) exibe calendário e horário; 'data' exibe só o calendário. */
  @Input() modo: 'data' | 'dataHora' = 'dataHora';

  /** 'dropdown' (padrão) abre ao clicar no campo; 'inline' mostra o calendário sempre aberto. */
  @Input() exibicao: 'dropdown' | 'inline' = 'dropdown';

  /** Formato do texto. Se não informado: "YYYY-MM-DD HH:mm" (ou "YYYY-MM-DD" no modo 'data'). */
  @Input() formato?: string;

  /** Fuso horário IANA (ex.: "America/Sao_Paulo"). Padrão: fuso do navegador. */
  @Input() fusoHorario: string = fusoDoNavegador();

  /** Cores do tema. Qualquer cor omitida usa o padrão claro. */
  @Input() cores?: CoresSeletor;

  /** Texto de exemplo exibido no campo vazio. Padrão: o próprio formato. */
  @Input() placeholder?: string;

  /** Desabilita o campo. */
  @Input() desabilitado = false;

  /** Valor inicial (texto no formato configurado ou Date). Alternativa ao ngModel/formControl. */
  @Input() set valor(v: string | Date | null | undefined) { this.writeValue(v); }

  /** Disparado a cada alteração feita pelo usuário, com o texto formatado e o Date real. */
  @Output() valorAlterado = new EventEmitter<ValorSelecionado>();

  readonly diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  selecionado: PartesData | null = null;
  texto = '';
  aberto = false;
  anoVisivel: number;
  mesVisivel: number;
  celulas: CelulaDia[] = [];
  private hoje: PartesData;

  // Funções registradas pelo Angular Forms (ngModel / formControl).
  private aoAlterar: (v: string | null) => void = () => {};
  private aoTocar: () => void = () => {};

  /** Inicializa o calendário no mês atual, de acordo com o fuso configurado. */
  constructor(private elemento: ElementRef<HTMLElement>, private cdr: ChangeDetectorRef) {
    this.hoje = partesNoFuso(new Date(), this.fusoHorario);
    this.anoVisivel = this.hoje.ano;
    this.mesVisivel = this.hoje.mes;
    this.montarCelulas();
  }

  /** Formato realmente usado, considerando o padrão de cada modo. */
  get formatoEfetivo(): string {
    return this.formato ?? (this.modo === 'data' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:mm');
  }

  /** Nome do mês exibido no cabeçalho. */
  get nomeMes(): string {
    return NOMES_MESES[this.mesVisivel - 1];
  }

  /** Abre o calendário (somente no modo dropdown). */
  abrir(): void {
    if (this.desabilitado || this.aberto) return;
    this.hoje = partesNoFuso(new Date(), this.fusoHorario);
    this.aberto = true;
  }

  /** Fecha o calendário e avisa o formulário que o campo foi "tocado". */
  fechar(): void {
    if (!this.aberto) return;
    this.aberto = false;
    this.aoTocar();
    this.cdr.markForCheck();
  }

  /** Fecha o dropdown quando o usuário clica fora do componente. */
  @HostListener('document:mousedown', ['$event'])
  aoClicarFora(evento: MouseEvent): void {
    if (this.aberto && !this.elemento.nativeElement.contains(evento.target as Node)) this.fechar();
  }

  /** Avança (+1) ou volta (-1) um mês no calendário. */
  mudarMes(passo: number): void {
    const total = this.anoVisivel * 12 + (this.mesVisivel - 1) + passo;
    this.anoVisivel = Math.floor(total / 12);
    this.mesVisivel = (total % 12) + 1;
    this.montarCelulas();
  }

  /**
   * Monta as 42 células (6 semanas) do mês visível, começando no domingo
   * e completando com os dias do mês anterior e do próximo.
   */
  private montarCelulas(): void {
    const inicioSemana = new Date(Date.UTC(this.anoVisivel, this.mesVisivel - 1, 1)).getUTCDay();
    this.celulas = Array.from({ length: 42 }, (_, i) => {
      const d = new Date(Date.UTC(this.anoVisivel, this.mesVisivel - 1, 1 + i - inicioSemana));
      const mes = d.getUTCMonth() + 1;
      return { ano: d.getUTCFullYear(), mes, dia: d.getUTCDate(), foraDoMes: mes !== this.mesVisivel };
    });
  }

  /** Indica se a célula é o dia de hoje (no fuso configurado). */
  ehHoje(c: CelulaDia): boolean {
    return c.ano === this.hoje.ano && c.mes === this.hoje.mes && c.dia === this.hoje.dia;
  }

  /** Indica se a célula é o dia atualmente selecionado. */
  ehSelecionado(c: CelulaDia): boolean {
    const s = this.selecionado;
    return !!s && c.ano === s.ano && c.mes === s.mes && c.dia === s.dia;
  }

  /**
   * Seleciona um dia. Mantém o horário já escolhido (ou usa a hora atual na primeira seleção).
   * No modo 'data' + dropdown, fecha o calendário logo após a escolha.
   */
  selecionarDia(c: CelulaDia): void {
    const base = this.selecionado ?? this.hoje;
    const comHora = this.modo === 'dataHora';
    this.selecionado = { ano: c.ano, mes: c.mes, dia: c.dia, hora: comHora ? base.hora : 0, minuto: comHora ? base.minuto : 0 };
    if (c.foraDoMes) { this.anoVisivel = c.ano; this.mesVisivel = c.mes; this.montarCelulas(); }
    this.emitir();
    if (!comHora && this.exibicao === 'dropdown') this.fechar();
  }

  /** Altera hora ou minuto, limitando o valor ao intervalo permitido. */
  mudarHorario(campo: 'hora' | 'minuto', valor: string): void {
    const limite = campo === 'hora' ? 23 : 59;
    const numero = Math.min(limite, Math.max(0, Math.floor(Number(valor) || 0)));
    this.selecionado = { ...(this.selecionado ?? { ...this.hoje, hora: 0, minuto: 0 }), [campo]: numero };
    this.emitir();
  }

  /** Trata o texto digitado manualmente no campo; texto inválido restaura o valor anterior. */
  aoDigitar(valor: string): void {
    if (!valor.trim()) { this.selecionado = null; this.texto = ''; this.aoAlterar(null); return; }
    const partes = interpretar(valor, this.formatoEfetivo);
    if (partes) { this.definirSelecionado(partes); this.emitir(); }
    else { this.texto = valor; this.cdr.detectChanges(); this.definirSelecionado(this.selecionado); }
  }

  /** Atualiza o texto do campo e devolve o valor ao componente pai (evento e formulário). */
  private emitir(): void {
    if (!this.selecionado) return;
    this.texto = formatar(this.selecionado, this.formatoEfetivo);
    this.aoAlterar(this.texto);
    this.valorAlterado.emit({ texto: this.texto, data: dataDoFuso(this.selecionado, this.fusoHorario) });
    this.cdr.markForCheck();
  }

  /** Guarda a seleção e posiciona o calendário no mês dela. */
  private definirSelecionado(partes: PartesData | null): void {
    this.selecionado = partes;
    this.texto = partes ? formatar(partes, this.formatoEfetivo) : '';
    if (partes) { this.anoVisivel = partes.ano; this.mesVisivel = partes.mes; this.montarCelulas(); }
    this.cdr.markForCheck();
  }

  // ---- Integração com Angular Forms (ngModel, formControl, formControlName) ----

  /** Recebe um valor vindo do formulário (texto no formato configurado ou Date). */
  writeValue(v: string | Date | null | undefined): void {
    if (v instanceof Date) this.definirSelecionado(partesNoFuso(v, this.fusoHorario));
    else this.definirSelecionado(v ? interpretar(v, this.formatoEfetivo) : null);
  }

  /** Registra a função que o Angular chama para receber o novo valor. */
  registerOnChange(fn: (v: string | null) => void): void { this.aoAlterar = fn; }

  /** Registra a função que marca o campo como "tocado". */
  registerOnTouched(fn: () => void): void { this.aoTocar = fn; }

  /** Habilita/desabilita o campo quando o formulário pede. */
  setDisabledState(desabilitado: boolean): void { this.desabilitado = desabilitado; this.cdr.markForCheck(); }
}
