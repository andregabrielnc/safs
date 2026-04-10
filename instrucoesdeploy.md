# Instruções de Deploy — SAFS (Materiais AGHU)

## Visão geral

| Item | Valor |
|------|-------|
| Repositório | `andregabrielnc/safs` (branch `main`) |
| Diretório local | `/opt/safs/app` |
| Porta produção | `3040` (host) → `80` (container nginx) |
| Servidor web | Nginx (via Docker/Coolify) |
| Coolify app UUID | `ucscssw40kssgckosws40k0k` |
| Coolify porta | `9090` |
| Coolify token | `19|deploynow933836` |

---

## Fluxo completo: alteração → produção

```
Editar código → build local → homologação → aprovação → commit + push → deploy Coolify
```

### 1. Build de produção

```bash
cd /opt/safs/app
npm run build
```

Saída esperada: `✓ built in Xs` sem erros de TypeScript.
Se houver erros de TS, **corrija antes de prosseguir**.

---

### 2. Subir servidor de homologação

```bash
nohup npx serve dist -l 4200 -s > /tmp/serve-homolog.log 2>&1 &
echo "PID: $!"
```

Acesse **`http://<ip-do-servidor>:4200`** e teste manualmente.

---

### 3. Aguardar aprovação

**Não avance** sem confirmação explícita de quem solicitou a alteração.

---

### 4. Commit e push

```bash
cd /opt/safs/app

git add <arquivos-alterados>

git commit -m "$(cat <<'COMMIT'
tipo: descrição concisa do que foi feito

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
COMMIT
)"

git push
```

**Tipos de commit:** `feat`, `fix`, `refactor`, `style`, `docs`, `chore`

> O GitHub PAT está embutido no remote URL.
> Para verificar: `git remote get-url origin`
> Para atualizar: `git remote set-url origin https://andregabrielnc:<novo-token>@github.com/andregabrielnc/safs.git`

---

### 5. Deploy no Coolify

```bash
curl -s -X POST \
  "http://localhost:9090/api/v1/deploy?uuid=ucscssw40kssgckosws40k0k&force=false" \
  -H "Authorization: Bearer 19|deploynow933836"
```

Resposta esperada:
```json
{"deployments":[{"message":"Application safs deployment queued.","deployment_uuid":"..."}]}
```

Monitorar o deploy:

```bash
curl -s "http://localhost:9090/api/v1/deployments/<deployment_uuid>" \
  -H "Authorization: Bearer 19|deploynow933836" \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print('Status:', d.get('status'))"
```

Aguarde `finished`. O deploy costuma levar de 1 a 3 minutos.

---

### 6. Encerrar servidor de homologação

```bash
kill $(lsof -t -i:4200) 2>/dev/null || true
```

---

## Verificação pós-deploy

```bash
curl -o /dev/null -s -w "%{http_code}" http://localhost:3040/
```

Resposta `200` = produção no ar.

---

## Referência rápida (hotfix)

```bash
cd /opt/safs/app
npm run build                          # 1. build
git add <arquivos>                     # 2. stage
git commit -m "fix: descrição"         # 3. commit
git push                               # 4. push
curl -s -X POST \
  "http://localhost:9090/api/v1/deploy?uuid=ucscssw40kssgckosws40k0k&force=false" \
  -H "Authorization: Bearer 19|deploynow933836"  # 5. deploy
```

---

## Estrutura do projeto

```
safs/
├── src/
│   ├── components/     # Dashboard.tsx, KPICard.tsx, Layout.tsx
│   └── utils/          # dataFetcher.ts
├── public/data/        # CSVs de estoque
├── Dockerfile          # Multi-stage: node:20-alpine build + nginx:alpine serve
├── nginx.conf          # Config nginx SPA
└── instrucoesdeploy.md # Este arquivo
```

---

## Observações

- O `dist/` e `node_modules/` estão no `.gitignore` — o Coolify faz o build via Dockerfile
- O Coolify roda na porta **9090**
