# Arquitetura e requisitos — Saúde by TAP Fitness

## Fase 1 — piloto estático v0.2 (implementada)

```
Android / iOS / Desktop
  └── navegador/PWA (GitHub Pages)
      ├── index.html + CSS + app.mjs: formulário e visualização
      ├── engine.mjs: regiões corporais + regras de alerta e sugestões condicionais
      ├── service worker: cache apenas de assets públicos
      └── sem chamadas para APIs de cadastro, sem dados persistidos
```

- Não usa cookies, localStorage, sessionStorage, Google Drive, repositório GitHub nem telemetria para responder à triagem.
- Os dados apenas existem temporariamente em campos do formulário e variáveis JS. O navegador/dispositivo pode ter mecanismos próprios de histórico/snapshot não controlados pelo site; não inserir informações reais sensíveis no piloto.
- O modo offline depende do primeiro carregamento HTTPS com service worker disponível.
- Um resultado do app nunca equivale a autorização clínica ou profissional, mesmo quando indica continuidade do plano aprovado.

## Fase 2 — plataforma para academias (não implementada)

```
PWA hospedada em infraestrutura apta a aplicativo comercial
   |
   v
Identity provider: MFA para profissionais, consentimento para alunos
   |
   v
Backend: autenticação, autorização por tenant + validação de esquema
   |                   |
   v                   v
Firestore/SQL       Auditoria imutável de ações administrativas
   |                   |
   +---- somente perfis autorizados
   |
   +---- export administrativo consentido --> Google Drive/Workspace
```

### Modelo relacional sugerido

- `academies`: id, nome, contrato, política de retenção, responsável pelo tratamento.
- `users`: id pseudônimo, papel, academy_id, confirmação de idade, revisão de consentimento, status.
- `approved_plans`: id, user_id, trainer_id, plano versionado, teto de RPE, duração e atividades aprovadas, data de revisão.
- `checkins`: id, user_id, created_at, dados mínimos necessários, respostas de triagem criptografadas, status, versão do algoritmo, array validado de `discomfort_regions`, `discomfort_intensity`, `discomfort_kind`.
- `regions_catalog`: catálogo versionado de regiões anatômicas informadas pelo aluno; não inferir diagnóstico nem condição de órgão a partir de marcações.
- `recommendations`: id, checkin_id, explicação de regras, decisão não vinculante, override por profissional.
- `audit_events`: ação, ator, data, entidade, finalidade; **sem dados clínicos no log**.

### Regras de autorização necessárias

- Por padrão negar acesso a tudo; aluno lê só os próprios registros; profissional só de alunos vinculados mediante autorização; administrador acessa apenas dados de gestão necessários.
- Isolamento rígido por academia. Não confiar em `academy_id`/`role` enviados pelo navegador; regras no servidor verificam claims autorizadas.
- Exigir consentimentos/base legal apropriados, transparência e fluxo de revogação, correção, portabilidade e exclusão de dados.
- Webhook, sincronização Drive e exportação devem ter autenticação servidor-servidor, escopos mínimos e auditoria.
- Monitorar abuso, tentativas de enumeração, falhas e acessos; limitar taxa e duração do armazenamento.

### Critérios de aceite para produção

- Aprovado por profissionais habilitados e revisão clínica externa.
- Avaliação de impacto e requisitos LGPD documentados; testes de autorização negativa (IDOR/cross-tenant), criptografia e logs.
- Algoritmo versionado, validação de limiares, taxa de falsos negativos e cenários limite; sem treinos gerados automaticamente para casos com alertas.
- Fluxo de recuperação de conta, política de acesso e descarte, backup e restauração testados.
- Risco de dispositivo compartilhado considerado; jamais manter segredo persistente no frontend público.

## GitHub Pages versus Google Drive

GitHub Pages só entrega arquivos estáticos. GitHub Issues, Gists ou arquivos no repositório não devem ser usados como banco privado de informações de saúde. Google Drive/Sheets exige camada segura de autenticação e autorização por usuário; uma API de Apps Script publicada como proprietário não deve abrir uma planilha médica a acessos arbitrários. Para relatórios administrativos privados e consentidos, Drive pode ser um destino **secundário**, não o motor de cadastro de alunos.
