# seletor-data-hora

Seletor de data e hora para Angular (15+). Componente standalone, sem dependências externas, com calendário, seleção de horas, fuso horário e cores configuráveis.

## 1. Gerar e instalar o pacote

Esta pasta segue a estrutura padrão de biblioteca do Angular CLI (`projects/seletor-data-hora`).

```bash
# dentro de um workspace Angular (ex.: ng new minhas-libs --no-create-application)
# copie a pasta projects/seletor-data-hora e registre-a no angular.json, ou:
ng generate library seletor-data-hora   # e substitua o conteúdo gerado pelos arquivos desta pasta
ng build seletor-data-hora
cd dist/seletor-data-hora && npm pack   # gera seletor-data-hora-1.0.0.tgz
```

No projeto que vai usar:

```bash
npm install /caminho/seletor-data-hora-1.0.0.tgz   # ou publique com npm publish
```

## 2. Uso básico

```ts
import { SeletorDataHoraComponent, ValorSelecionado } from 'seletor-data-hora';

@Component({
  standalone: true,
  imports: [SeletorDataHoraComponent],
  template: `<seletor-data-hora (valorAlterado)="aoAlterar($event)"></seletor-data-hora>`,
})
export class ExemploComponent {
  aoAlterar(v: ValorSelecionado) {
    console.log(v.texto); // "2026-10-14 10:30"
    console.log(v.data);  // Date real, já considerando o fuso
  }
}
```

Em projetos com NgModule, adicione `SeletorDataHoraComponent` no `imports` do módulo.

### Com formulários

```html
<seletor-data-hora [(ngModel)]="agendamento"></seletor-data-hora>
<seletor-data-hora formControlName="inicio"></seletor-data-hora>
```

O valor do formulário é o **texto formatado** (ou `null` quando vazio). Também é possível iniciar com um `Date`.

## 3. Parâmetros (`@Input`)

| Parâmetro | Tipo | Padrão | O que faz |
|---|---|---|---|
| `modo` | `'data' \| 'dataHora'` | `'dataHora'` | `'data'` mostra só o calendário; `'dataHora'` inclui hora e minuto. |
| `exibicao` | `'dropdown' \| 'inline'` | `'dropdown'` | `'dropdown'` abre ao clicar no campo; `'inline'` deixa o calendário sempre visível. |
| `formato` | `string` | `'YYYY-MM-DD HH:mm'` (`'YYYY-MM-DD'` no modo data) | Formato do texto. Marcadores: `YYYY`, `MM`, `DD`, `HH`, `mm`. Ex.: `'DD/MM/YYYY HH:mm'`. |
| `fusoHorario` | `string` | fuso do navegador | Fuso IANA, ex.: `'America/Sao_Paulo'`, `'UTC'`. Define o "hoje" e o `Date` devolvido. |
| `cores` | `CoresSeletor` | tema claro | Cores do tema (ver abaixo). |
| `placeholder` | `string` | o formato | Texto do campo vazio. |
| `desabilitado` | `boolean` | `false` | Bloqueia o campo. |
| `valor` | `string \| Date` | — | Valor inicial, para quem não usa formulários. |

## 4. Evento (`@Output`)

| Evento | Conteúdo | Quando dispara |
|---|---|---|
| `valorAlterado` | `{ texto: string; data: Date }` | Sempre que o usuário escolhe dia, hora, minuto ou digita uma data válida. |

## 5. Cores / tema

Passe as cores do seu tema pelo parâmetro `cores` — qualquer cor omitida usa o padrão claro:

```html
<seletor-data-hora [cores]="{
  fundo: '#1e1e1e', fonte: '#f5f5f5', fonteSecundaria: '#8a8a8a',
  borda: '#333', destaque: '#4f8cff', fonteDestaque: '#fff', hover: '#2a2a2a'
}"></seletor-data-hora>
```

Também funcionam variáveis CSS do seu tema (ex.: `fundo: 'var(--cor-fundo)'`) ou definir as variáveis direto no CSS global:

```css
seletor-data-hora {
  --sdh-fundo: var(--mat-sys-surface);
  --sdh-fonte: var(--mat-sys-on-surface);
  --sdh-borda: var(--mat-sys-outline-variant);
  --sdh-destaque: var(--mat-sys-primary);
}
```

| Chave em `cores` | Variável CSS | Padrão |
|---|---|---|
| `fundo` | `--sdh-fundo` | `#ffffff` |
| `fonte` | `--sdh-fonte` | `#1e293b` |
| `fonteSecundaria` | `--sdh-fonte-secundaria` | `#94a3b8` |
| `borda` | `--sdh-borda` | `#e2e8f0` |
| `destaque` | `--sdh-destaque` | `#334155` |
| `fonteDestaque` | `--sdh-fonte-destaque` | `#ffffff` |
| `hover` | `--sdh-hover` | `#f1f5f9` |

## 6. Funções utilitárias exportadas

| Função | O que faz |
|---|---|
| `fusoDoNavegador()` | Retorna o fuso do navegador. |
| `partesNoFuso(data, fuso)` | Converte um `Date` em `{ ano, mes, dia, hora, minuto }` no fuso. |
| `dataDoFuso(partes, fuso)` | Operação inversa: partes no fuso → `Date`. |
| `formatar(partes, formato)` | Partes → texto. |
| `interpretar(texto, formato)` | Texto → partes (ou `null` se inválido). |
| `partesValidas(partes)` / `diasNoMes(ano, mes)` | Validações auxiliares. |

## 7. Manutenção

- `src/lib/utilitarios-data.ts` — lógica de datas (pura, fácil de testar).
- `src/lib/seletor-data-hora.component.ts` — visual (template + estilos) e interação.
- Semana começa no domingo; nomes de meses/dias ficam no topo do componente.
