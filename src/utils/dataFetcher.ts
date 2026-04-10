import Papa from 'papaparse';

export interface EstoqueGeral {
  competencia: string;
  codForn: string;
  fornecedor: string;
  material: string;
  codGrupo: string;
  grupo: string;
  estocavel: string;
  generico: string;
  unid: string;
  classABC: string;
  subABC: string;
  qtd: number;
  custoMedio: number;
  residuo: number;
  valor: number;
}

export interface EstoqueAlmoxarifado {
  almoxarifado: string;
  material: string;
  fornecedor: string;
  endereco: string;
  situacao: string;
  estocavel: string;
  consignado: string;
  validade: string;
}

// Convert Brazilian number format (1.234,56 or 0,00) to actual JS numbers
const parseBrazilianNumber = (val: string): number => {
  if (!val) return 0;
  // Try to remove dots used for thousands, and replace comma with dot
  const cleanStr = val.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

export const fetchEstoqueGeral = (): Promise<EstoqueGeral[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse('/data/Estoque Geral.csv', {
      download: true,
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const mapped = data.map(row => ({
          competencia: row['Competência'] || '',
          codForn: row['Cód.Forn'] || '',
          fornecedor: row['Fornecedor'] || '',
          material: row['Material'] || '',
          codGrupo: row['Cód. Grupo'] || '',
          grupo: row['Grupo'] || '',
          estocavel: row['Estocável'] || '',
          generico: row['Genérico'] || '',
          unid: row['Unid.'] || '',
          classABC: row['Class. ABC'] || '',
          subABC: row['Sub. ABC'] || '',
          qtd: parseBrazilianNumber(row['Qtd']),
          custoMedio: parseBrazilianNumber(row['Custo Médio']),
          residuo: parseBrazilianNumber(row['Resíduo']),
          valor: parseBrazilianNumber(row['Valor']),
        }));
        resolve(mapped);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const fetchEstoqueAlmoxarifado = (): Promise<EstoqueAlmoxarifado[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse('/data/Estoque Almoxarifado.csv', {
      download: true,
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const mapped = data.map(row => ({
          almoxarifado: row['Almoxarifado'] || '',
          material: row['Material'] || '',
          fornecedor: row['Fornecedor'] || '',
          endereco: row['Endereço'] || '',
          situacao: row['Situação'] || '',
          estocavel: row['Estocável'] || '',
          consignado: row['Consignado'] || '',
          validade: row['Validade'] || '',
        }));
        resolve(mapped);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};
