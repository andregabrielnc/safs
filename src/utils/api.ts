const BASE = import.meta.env.VITE_API_URL ?? '';

const TOKEN_KEY = 'safs_auth_token';
const USER_KEY  = 'safs_auth_user';

export interface AuthUser {
  username: string;
  name: string;
  email: string;
}

export const auth = {
  getToken(): string | null { return localStorage.getItem(TOKEN_KEY); },
  getUser(): AuthUser | null {
    try { const v = localStorage.getItem(USER_KEY); return v ? JSON.parse(v) : null; }
    catch { return null; }
  },
  setSession(token: string, user: AuthUser) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: () => void) { onUnauthorized = fn; }

function authHeaders(): Record<string, string> {
  const t = auth.getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...authHeaders(),
  };
  return fetch(input, { ...init, headers }).then(r => {
    if (r.status === 401) {
      auth.clear();
      if (onUnauthorized) onUnauthorized();
    }
    return r;
  });
}

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
  media_consumo_mensal: number;
  dias_ate_ruptura: number | null;
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

export interface EneContrato {
  nro_af: number;
  cpto: number;
  pregao: string;
  vencimento: string;
  status: string;
  fornecedor: string;
  item: number;
  qtde_contratada: number;
  qtde_empenhada: number;
  saldo: number;
  monitorado: number | null; // level_id se monitorado, null caso contrário
}

export interface MonitoredContract {
  id: number;
  nro_af: number;
  cpto: number;
  mat_codigo: number;
  mat_nome: string;
  pregao: string;
  fornecedor: string;
  qtde_contratada: number;
  level_id: number;
  level_nome: string;
  level_cor: string;
  level_quantidade: number;
  saldo_atual: number | null;
  vencimento: string | null;
  status_af: string | null;
  atualizado_em: string | null;
  alerta: 'critico' | 'baixo' | 'atencao' | 'normal' | null;
  criado_em: string;
}

export interface ContractNotification {
  id: number;
  nro_af: number;
  cpto: number;
  mat_codigo: number;
  mat_nome: string;
  pregao: string;
  fornecedor: string;
  level_nome: string;
  level_cor: string;
  saldo: number;
  quantidade: number;
  lida: boolean;
  criado_em: string;
}

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────
  login: async (username: string, password: string): Promise<{ token: string; user: AuthUser }> => {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      throw new Error(body.error || `Erro ${r.status}`);
    }
    const data = await r.json();
    auth.setSession(data.token, data.user);
    return data;
  },
  logout: () => { auth.clear(); },
  me: (): Promise<{ user: AuthUser }> =>
    apiFetch(`${BASE}/api/auth/me`).then(r => handleResponse<{ user: AuthUser }>(r)),

  stats: (almox = 1): Promise<Stats> =>
    apiFetch(`${BASE}/api/g36/stats?almox=${almox}`).then(r => handleResponse<Stats>(r)),

  materiais: (params: {
    page?: number; limit?: number; search?: string; almox?: number; alerta?: string; contrato?: string;
  } = {}): Promise<MateriaisResponse> => {
    const qs = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 60),
      almox: String(params.almox ?? 1),
      ...(params.search ? { search: params.search } : {}),
      ...(params.alerta && params.alerta !== 'todos' ? { alerta: params.alerta } : {}),
      ...(params.contrato ? { contrato: params.contrato } : {}),
    });
    return apiFetch(`${BASE}/api/g36/materiais?${qs}`).then(r => handleResponse<MateriaisResponse>(r));
  },

  ruptura: (almox = 1, dias = 90): Promise<Material[]> =>
    apiFetch(`${BASE}/api/g36/ruptura?almox=${almox}&dias=${dias}`).then(r => handleResponse<Material[]>(r)),

  material: (codigo: number, almox = 1): Promise<MaterialDetalhe> =>
    apiFetch(`${BASE}/api/g36/materiais/${codigo}?almox=${almox}`).then(r => handleResponse<MaterialDetalhe>(r)),

  consumo: (codigo: number, almox = 1, meses = 24): Promise<ConsumoMensal[]> =>
    apiFetch(`${BASE}/api/g36/materiais/${codigo}/consumo?almox=${almox}&meses=${meses}`).then(r => handleResponse<ConsumoMensal[]>(r)),

  almoxarifados: (): Promise<Almoxarifado[]> =>
    apiFetch(`${BASE}/api/g36/almoxarifados`).then(r => handleResponse<Almoxarifado[]>(r)),

  // ── Monitoramento ───────────────────────────────────────────────────────
  niveis: (): Promise<MonitoringLevel[]> =>
    apiFetch(`${BASE}/api/monitoramento/niveis`).then(r => handleResponse<MonitoringLevel[]>(r)),

  updateNivel: (id: number, data: { quantidade: number; dias_semana: number[]; horarios: string[] }): Promise<MonitoringLevel> =>
    apiFetch(`${BASE}/api/monitoramento/niveis/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => handleResponse<MonitoringLevel>(r)),

  itensMonitorados: (): Promise<MonitoredItem[]> =>
    apiFetch(`${BASE}/api/monitoramento/itens`).then(r => handleResponse<MonitoredItem[]>(r)),

  monitorarItem: (item: { mat_codigo: number; mat_nome: string; mat_umd?: string; almox?: number; level_id: number }): Promise<{ id: number }> =>
    apiFetch(`${BASE}/api/monitoramento/itens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    }).then(r => handleResponse<{ id: number }>(r)),

  removerMonitoramento: (mat_codigo: number, almox = 1): Promise<{ ok: boolean }> =>
    apiFetch(`${BASE}/api/monitoramento/itens/${mat_codigo}?almox=${almox}`, { method: 'DELETE' })
      .then(r => handleResponse<{ ok: boolean }>(r)),

  notificacoes: (): Promise<Notification[]> =>
    apiFetch(`${BASE}/api/monitoramento/notificacoes`).then(r => handleResponse<Notification[]>(r)),

  unreadCount: (): Promise<{ total: number }> =>
    apiFetch(`${BASE}/api/monitoramento/notificacoes/unread-count`).then(r => handleResponse<{ total: number }>(r)),

  markAllRead: (): Promise<{ ok: boolean }> =>
    apiFetch(`${BASE}/api/monitoramento/notificacoes/mark-read`, { method: 'POST' })
      .then(r => handleResponse<{ ok: boolean }>(r)),

  checkNow: (mat_codigo: number, almox = 1): Promise<{ estoque: number; triggered: boolean }> =>
    apiFetch(`${BASE}/api/monitoramento/itens/${mat_codigo}/check-now?almox=${almox}`, { method: 'POST' })
      .then(r => handleResponse<{ estoque: number; triggered: boolean }>(r)),

  statsSnapshot: (almox = 1): Promise<{ ok: boolean }> =>
    apiFetch(`${BASE}/api/monitoramento/stats/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ almox }),
    }).then(r => handleResponse<{ ok: boolean }>(r)),

  statsHistorico: (almox = 1, dias = 30): Promise<{ dia: string; total_materiais: number; critico: number; baixo: number; atencao: number; normal: number }[]> =>
    apiFetch(`${BASE}/api/monitoramento/stats/historico?almox=${almox}&dias=${dias}`)
      .then(r => handleResponse(r)),

  registrarAcesso: (mat_codigo: number, mat_nome: string, almox = 1): Promise<{ ok: boolean }> =>
    apiFetch(`${BASE}/api/monitoramento/acesso`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mat_codigo, mat_nome, almox }),
    }).then(r => handleResponse<{ ok: boolean }>(r)),

  registrarBusca: (termo: string, almox = 1, resultados?: number): Promise<{ ok: boolean }> =>
    apiFetch(`${BASE}/api/monitoramento/busca`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ termo, almox, resultados }),
    }).then(r => handleResponse<{ ok: boolean }>(r)),

  recorrentes: (almox = 1, limit = 20): Promise<{ itens: { mat_codigo: number; mat_nome: string; total_acessos: number; ultimo_acesso: string }[]; buscas: { termo: string; total_buscas: number; ultima_busca: string }[] }> =>
    apiFetch(`${BASE}/api/monitoramento/recorrentes?almox=${almox}&limit=${limit}`)
      .then(r => handleResponse(r)),

  criticidade: (): Promise<CriticalityRule> =>
    apiFetch(`${BASE}/api/monitoramento/criticidade`).then(r => handleResponse<CriticalityRule>(r)),

  eneContratos: (codigo: number): Promise<EneContrato[]> =>
    apiFetch(`${BASE}/api/ene/materiais/${codigo}`).then(r => handleResponse<EneContrato[]>(r)),

  eneMonitorados: (): Promise<MonitoredContract[]> =>
    apiFetch(`${BASE}/api/ene/monitorados`).then(r => handleResponse<MonitoredContract[]>(r)),

  monitorarContrato: (data: { nro_af: number; cpto: number; mat_codigo: number; mat_nome: string; pregao?: string; fornecedor?: string; qtde_contratada?: number; level_id: number }): Promise<{ id: number }> =>
    apiFetch(`${BASE}/api/ene/monitorados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => handleResponse<{ id: number }>(r)),

  removerContratoMonitorado: (nro_af: number, cpto: number): Promise<{ ok: boolean }> =>
    apiFetch(`${BASE}/api/ene/monitorados/${nro_af}/${cpto}`, { method: 'DELETE' })
      .then(r => handleResponse<{ ok: boolean }>(r)),

  checkNowContrato: (nro_af: number, cpto: number): Promise<{ saldo: number; triggered: boolean; alerta: string }> =>
    apiFetch(`${BASE}/api/ene/monitorados/${nro_af}/${cpto}/check-now`, { method: 'POST' })
      .then(r => handleResponse<{ saldo: number; triggered: boolean; alerta: string }>(r)),

  eneNotificacoes: (): Promise<ContractNotification[]> =>
    apiFetch(`${BASE}/api/ene/notificacoes`).then(r => handleResponse<ContractNotification[]>(r)),

  updateCriticidade: (id: number, data: Omit<CriticalityRule, 'id' | 'ativo'>): Promise<CriticalityRule> =>
    apiFetch(`${BASE}/api/monitoramento/criticidade/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => handleResponse<CriticalityRule>(r)),
};
