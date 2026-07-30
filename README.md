# Atlas Protocol Frontend

Frontend Angular standalone reconstruído do zero para integração com o backend Atlas Protocol.

## Rodar

```bash
npm install
npm start
```

Acesse `http://localhost:4200`.

## API

As URLs ficam exclusivamente nos environments:

- desenvolvimento: `http://localhost:3000/api/v1`;
- produção: `https://atlas-protocol-6yo0.onrender.com/api/v1`.

## Área autenticada

```text
/app
  -> /app/dashboard
```

O dashboard consome dados reais de `GET /dashboard`. Nesta etapa, a interface
completa é disponibilizada para atleta; professional e admin recebem fallbacks
seguros correspondentes às suas roles.

## Qualidade

```bash
npm run build
npm test -- --watch=false
```
