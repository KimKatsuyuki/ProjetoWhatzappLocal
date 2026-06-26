# LocalChat — Mensageria P2P Local

Chat em tempo real pela rede Wi-Fi local. Sem internet, sem conta, sem nada na nuvem.

## Como usar

### 1. Instale as dependências (apenas na primeira vez)

```bash
npm install
```

### 2. Inicie o servidor

```bash
node server.js
```

### 3. Acesse

- No próprio PC:

```
http://localhost:(PORT configurada em server.js)
```

- No celular/outro PC (mesma rede Wi-Fi):
  - O terminal mostrará os IPs disponíveis, ex:

```
http://192.168.1.10:3000
```

  - Abra esse endereço no browser do celular.

## Funcionalidades

- ✅ Mensagens em grupo (todos veem)
- ✅ Mensagens privadas (só remetente e destinatário veem)
- ✅ Indicador de "digitando..."
- ✅ Histórico dos últimos 200 mensagens
- ✅ Lista de usuários online com dispositivo
- ✅ Interface responsiva (mobile-friendly)
- ✅ 100% local — nenhum dado sai da sua rede

## Requisitos

- Node.js 16+
- npm
