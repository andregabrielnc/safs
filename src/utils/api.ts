const BASE = import.meta.env.VITE_API_URL ?? '';

async function handleResponse<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`Erro na API: ${r.status} ${r.statusText}`);
  return r.json();
}

export interface Material {
  codigo: number;
  nome: string;
  umd_codigo: string;
  estoque: number;
  media_consumo_mensal: number;
  alerta: 'critico' | 'baixo' | 'atencao' | 'normal';
  dias_ate_ruptura: number | null;
  ultimo_mes: string | null;
}

export interface MateriaisResponse {
  total: number;
  page: number;
  limit: number;
  data: Material[];
}

export interface Stats {
  total_materiais: number;
  critico: number;
  baixo: number;
  atencao: number;
  normal: number;
}

export interface ConsumoMensal {
  competencia: string;
  quantidade: number | null;
  valor: number | null;
  saldo: number | null;
}

export interface MaterialDetalhe {
  codigo: number;
  nome: string;
  descricao: string;
  umd_codigo: string;
  estoque: number;
  alerta: 'critico' | 'baixo' | 'atencao' | 'normal';
  qtde_estq_min: number;
  qtde_estq_max: number;
  qtde_ponto_pedido: number;
  dt_ultimo_consumo: string | null;
  dt_ultima_compra: string | null;
}

export interface Almoxarifado {
  seq: number;
  descricao: string;
}

export interface CriticalityRule {
  id: number;
  nome: string;
  limite_critico: number;
  limite_baixo: number;
  limite_atencao: number;
  ativo: boolean;
}

export interface MonitoringLevel {
  id: number;
  nome: string;
  cor: string;
  quantidade: number;
  dias_semana: number[];
  horarios: string[];
  email: string;
  celular: string;
}

export interface MonitoredItem {
  id: number;
  mat_codigo: number;
  mat_nome: string;
  mat_umd: string;
  almox: number;
  level_id: number;
  level_nome: string;
  level_cor: string;
  level_quantidade: number;
  criado_em: string;
}

export interface Notification {
  id: number;
  mat_codigo: number;
  mat_nome: string;
  level_nome: string;
  level_cor: string;
  estoque: number;
  quantidade: number;
  criado_em: string;
  lida: number;
}

export const api = {
  stats: (almox = 1): Promise<Stats> =>
    fetch(`${BASE}/api/g36/stats?almox=${almox}`).then(r => handleResponse<Stats>(r)),

  materiais: (params: {
    page?: number; limit?: number; search?: string; almox?: number; alerta?: string;
  } = {}): Promise<MateriaisResponse> => {
    const qs = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 60),
      almox: String(params.almox ?? 1),
      ...(params.search ? { search: params.search } : {}),
      ...(params.alerta && params.alerta !== 'todos' ? { alerta: params.alerta } : {}),
    });
    return fetch(`${BASE}/api/g36/materiais?${qs}`).then(r => handleResponse<MateriaisResponse>(r));
  },

  ruptura: (almox = 1, dias = 90): Promise<Material[]> =>
    fetch(`${BASE}/api/g36/ruptura?almox=${almox}&dias=${dias}`).then(r => handleResponse<Material[]>(r)),

  material: (codigo: number, almox = 1): Promise<MaterialDetalhe> =>
    fetch(`${BASE}/api/g36/materiais/${codigo}?almox=${almox}`).then(r => handleResponse<MaterialDetalhe>(r)),

  consumo: (codigo: number, almox = 1, meses = 24): Promise<ConsumoMensal[]> =>
    fetch(`${BASE}/api/g36/materiais/${codigo}/consumo?almox=${almox}&meses=${meses}`).then(r => handleResponse<ConsumoMensal[]>(r)),

  almoxarifados: (): Promise<Almoxarifado[]> =>
    fetch(`${BASE}/api/g36/almoxarifados`).then(r => handleResponse<Almoxarifado[]>(r)),

  // ── Monitoramento ───────────────────────────────────────────────────────
  niveis: (): Promise<MonitoringLevel[]> =>
    fetch(`${BASE}/api/monitoramento/niveis`).then(r => handleResponse<MonitoringLevel[]>(r)),

  updateNivel: (id: number, data: { quantidade: number; dias_semana: number[]; horarios: string[]; email?: string; celular?: string }): Promise<MonitoringLevel> =>
    fetch(`${BASE}/api/monitoramento/niveis/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => handleResponse<MonitoringLevel>(r)),

  itensMonitorados: (): Promise<MonitoredItem[]> =>
    fetch(`${BASE}/api/monitoramento/itens`).then(r => handleResponse<MonitoredItem[]>(r)),

  monitorarItem: (item: { mat_codigo: number; mat_nome: string; mat_umd?: string; almox?: number; level_id: number }): Promise<{ id: number }> =>
    fetch(`${BASE}/api/monitoramento/itens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).then(r => handleResponse<{ id: number }>(r)),

  removerMonitoramento: (mat_codigo: number, almox = 1): Promise<{ ok: boolean }> =>
    fetch(`${BASE}/api/monitoramento/itens/${mat_codigo}?almox=${almox}`, { method: 'DELETE' })
      .then(r => handleResponse<{ ok: boolean }>(r)),

  notificacoes: (): Promise<Notification[]> =>
    fetch(`${BASE}/api/monitoramento/notificacoes`).then(r => handleResponse<Notification[]>(r)),

  unreadCount: (): Promise<{ total: number }> =>
    fetch(`${BASE}/api/monitoramento/notificacoes/unread-count`).then(r => handleResponse<{ total: number }>(r)),

  markAllRead: (): Promise<{ ok: boolean }> =>
    fetch(`${BASE}/api/monitoramento/notificacoes/mark-read`, { method: 'POST' })
      .then(r => handleResponse<{ ok: boolean }>(r)),

  checkNow: (mat_codigo: number, almox = 1): Promise<{ estoque: number; triggered: boolean }> =>
    fetch(`${BASE}/api/monitoramento/itens/${mat_codigo}/check-now?almox=${almox}`, { method: 'POST' })
      .then(r => handleResponse<{ estoque: number; triggered: boolean }>(r)),

  statsSnapshot: (almox = 1): Promise<{ ok: boolean }> =>
    fetch(`${BASE}/api/monitoramento/stats/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ almox }),
    }).then(r => handleResponse<{ ok: boolean }>(r)),

  statsHistorico: (almox = 1, dias = 30): Promise<{ dia: string; total_materiais: number; critico: number; baixo: number; atencao: number; normal: number }[]> =>
    fetch(`${BASE}/api/monitoramento/stats/historico?almox=${almox}&dias=${dias}`)
      .then(r => handleResponse(r)),

  registrarAcesso: (mat_codigo: number, mat_nome: string, almox = 1): Promise<{ ok: boolean }> =>
    fetch(`${BASE}/api/monitoramento/acesso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mat_codigo, mat_nome, almox }),
    }).then(r => handleResponse<{ ok: boolean }>(r)),

  registrarBusca: (termo: string, almox = 1, resultados?: number): Promise<{ ok: boolean }> =>
    fetch(`${BASE}/api/monitoramento/busca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termo, almox, resultados }),
    }).then(r => handleResponse<{ ok: boolean }>(r)),

  recorrentes: (almox = 1, limit = 20): Promise<{ itens: { mat_codigo: number; mat_nome: string; total_acessos: number; ultimo_acesso: string }[]; buscas: { termo: string; total_buscas: number; ultima_busca: string }[] }> =>
    fetch(`${BASE}/api/monitoramento/recorrentes?almox=${almox}&limit=${limit}`)
      .then(r => handleResponse(r)),

  criticidade: (): Promise<CriticalityRule> =>
    fetch(`${BASE}/api/monitoramento/criticidade`).then(r => handleResponse<CriticalityRule>(r)),

  updateCriticidade: (id: number, data: Omit<CriticalityRule, 'id' | 'ativo'>): Promise<CriticalityRule> =>
    fetch(`${BASE}/api/monitoramento/criticidade/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => handleResponse<CriticalityRule>(r)),
};
