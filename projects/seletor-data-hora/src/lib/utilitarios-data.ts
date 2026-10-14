/**
 * Funções puras de data usadas pelo componente.
 * Sem dependências externas: tudo é feito com a API nativa Intl do navegador.
 */

/** Partes de uma data "de relógio" (como o usuário a vê em um fuso horário). */
export interface PartesData {
  ano: number;
  mes: number; // 1 a 12
  dia: number;
  hora: number;
  minuto: number;
}

/** Cache de formatadores por fuso, pois criar um Intl.DateTimeFormat é custoso. */
const cacheFormatadores = new Map<string, Intl.DateTimeFormat>();

/**
 * Retorna o fuso horário configurado no navegador do usuário (ex.: "America/Sao_Paulo").
 */
export function fusoDoNavegador(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Converte um instante (Date) nas partes de data/hora vistas no fuso informado.
 * Ex.: 14/10/2026 13:30 UTC no fuso "America/Sao_Paulo" retorna hora 10, minuto 30.
 */
export function partesNoFuso(data: Date, fuso: string): PartesData {
  let formatador = cacheFormatadores.get(fuso);
  if (!formatador) {
    formatador = new Intl.DateTimeFormat('en-US', {
      timeZone: fuso,
      hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric',
    });
    cacheFormatadores.set(fuso, formatador);
  }
  const p: Record<string, number> = {};
  for (const parte of formatador.formatToParts(data)) {
    if (parte.type !== 'literal') p[parte.type] = Number(parte.value);
  }
  return { ano: p['year'], mes: p['month'], dia: p['day'], hora: p['hour'] % 24, minuto: p['minute'] };
}

/**
 * Operação inversa de partesNoFuso: recebe as partes vistas em um fuso
 * e devolve o instante real (Date) correspondente.
 * Calcula a diferença do fuso naquele momento e a desconta do horário UTC.
 */
export function dataDoFuso(partes: PartesData, fuso: string): Date {
  const comoUtc = Date.UTC(partes.ano, partes.mes - 1, partes.dia, partes.hora, partes.minuto);
  const vistoNoFuso = partesNoFuso(new Date(comoUtc), fuso);
  const diferenca =
    Date.UTC(vistoNoFuso.ano, vistoNoFuso.mes - 1, vistoNoFuso.dia, vistoNoFuso.hora, vistoNoFuso.minuto) - comoUtc;
  return new Date(comoUtc - diferenca);
}

/** Completa um número com zeros à esquerda (ex.: 7 -> "07"). */
function zeros(valor: number, tamanho = 2): string {
  return String(valor).padStart(tamanho, '0');
}

/**
 * Transforma as partes em texto usando o formato informado.
 * Marcadores aceitos: YYYY (ano), MM (mês), DD (dia), HH (hora 00-23), mm (minuto).
 * Qualquer outro caractere é mantido como está (ex.: "DD/MM/YYYY HH:mm").
 */
export function formatar(partes: PartesData, formato: string): string {
  const valores: Record<string, string> = {
    YYYY: zeros(partes.ano, 4), MM: zeros(partes.mes), DD: zeros(partes.dia),
    HH: zeros(partes.hora), mm: zeros(partes.minuto),
  };
  return formato.replace(/YYYY|MM|DD|HH|mm/g, (marcador) => valores[marcador]);
}

/**
 * Lê um texto digitado de acordo com o formato e devolve as partes,
 * ou null se o texto não corresponder ao formato ou for uma data inválida.
 */
export function interpretar(texto: string, formato: string): PartesData | null {
  const ordem: string[] = [];
  const padrao = formato
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/YYYY|MM|DD|HH|mm/g, (marcador) => {
      ordem.push(marcador);
      return marcador === 'YYYY' ? '(\\d{4})' : '(\\d{1,2})';
    });
  const resultado = new RegExp(`^${padrao}$`).exec(texto.trim());
  if (!resultado) return null;

  const v: Record<string, number> = { YYYY: 0, MM: 1, DD: 1, HH: 0, mm: 0 };
  ordem.forEach((marcador, i) => (v[marcador] = Number(resultado[i + 1])));
  const partes: PartesData = { ano: v['YYYY'], mes: v['MM'], dia: v['DD'], hora: v['HH'], minuto: v['mm'] };
  return partesValidas(partes) ? partes : null;
}

/** Verifica se as partes formam uma data real (ex.: rejeita 31/02 ou 25:00). */
export function partesValidas(p: PartesData): boolean {
  return p.mes >= 1 && p.mes <= 12 && p.dia >= 1 && p.dia <= diasNoMes(p.ano, p.mes)
    && p.hora >= 0 && p.hora <= 23 && p.minuto >= 0 && p.minuto <= 59;
}

/** Retorna quantos dias tem o mês (mes de 1 a 12). */
export function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}
