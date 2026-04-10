const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3041';

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
  quantidade: number;
  valor: number;
}

export interface MaterialDetalhe {
  codigo: number;
  nome: string;
  descricao: string;
  umd_codigo: string;
  estoque: number;
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

export const api = {
  stats: (almox = 1): Promise<Stats> =>
    fetch(`${BASE}/api/g36/stats?almox=${almox}`).then(r => r.json()),

  materiais: (params: {
    page?: number; limit?: number; search?: string; almox?: number;
  } = {}): Promise<MateriaisResponse> => {
    const qs = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 60),
      almox: String(params.almox ?? 1),
      ...(params.search ? { search: params.search } : {}),
    });
    return fetch(`${BASE}/api/g36/materiais?${qs}`).then(r => r.json());
  },

  material: (codigo: number, almox = 1): Promise<MaterialDetalhe> =>
    fetch(`${BASE}/api/g36/materiais/${codigo}?almox=${almox}`).then(r => r.json()),

  consumo: (codigo: number, almox = 1, meses = 24): Promise<ConsumoMensal[]> =>
    fetch(`${BASE}/api/g36/materiais/${codigo}/consumo?almox=${almox}&meses=${meses}`).then(r => r.json()),

  almoxarifados: (): Promise<Almoxarifado[]> =>
    fetch(`${BASE}/api/g36/almoxarifados`).then(r => r.json()),
};
