# Demonstração de transmissão ao vivo do LiveKit

<img width="1095" alt="Captura de tela 03/11/2023 às 10h13 37h" src="https://github.com/livekit/cloud-site/assets/304392/00f28e36-54bd-4b48-84fe -5fc6eb92a309">

Este é um aplicativo de demonstração para transmissão ao vivo via RTMP ou WHIP usando LiveKit. Um usuário é um radiodifusor que recebe um RTMP/WHIP para streaming (por exemplo, via OBS). Outros usuários podem visualizar seu stream e bate-papo. Também permitimos que você transmita diretamente do seu dispositivo na página "Host".

Hoje, a maioria das transmissões ao vivo apresenta um atraso de 5 a 30 segundos, o que é evidente no atraso que os streamers levam para responder aos bate-papos. Esses streams usam HLS, que aproveita os CDNs existentes, enviando pedaços de vídeo de 5 a 30 segundos, dos quais os clientes baixam um pedaço de cada vez. O HLS é extremamente escalável, mas vem com latência.

LiveKit é uma espécie de CDN WebRTC, alcançando latência inferior a 100 ms para públicos de 1.000 ou 100.000 pessoas, transmitindo vídeo em conexões de backbone da Internet e passando pela Internet pública apenas na última milha (ou seja, entrega para clientes conectados). Isso permite eventos de grande escala em tempo real, onde qualquer pessoa pode participar.

Este aplicativo de exemplo utiliza apenas as seguintes tecnologias:

- [Next.js 14](https://nextjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://github.com/shadcn/ui)

## Executando localmente

Clone o repositório e instale as dependências:

```bash
git clone git@github.com:livekit-examples/livestream.git
transmissão ao vivo do CD
instalação npm
```

Crie um novo projeto LiveKit em <https://cloud.livekit.io>. Em seguida, crie uma nova chave nas [configurações do projeto](https://cloud.livekit.io/projects/p_/settings/keys).

Crie um novo arquivo `.env.development` e adicione sua nova chave de API e segredo, bem como a URL WebSocket do seu projeto (encontrada na parte superior de <https://cloud.livekit.io>):

```
LIVEKIT_API_KEY=<sua chave de API>
LIVEKIT_API_SECRET=<seu segredo da API>
LIVEKIT_API_URL=https://<seu-projeto>.livekit.cloud
NEXT_PUBLIC_LIVEKIT_WS_URL=wss://<seu-projeto>.livekit.cloud
```

Em seguida, execute o servidor de desenvolvimento:

```bash
npm executar dev
# ou
desenvolvedor de fios
# ou
desenvolvedor pnpm
# ou
desenvolvedor de pão
```

Você pode testá-lo abrindo <http://localhost:3000> em um navegador.

## Implantando

Esta demonstração é um aplicativo Next.js. Você pode implantar em sua conta Vercel com um clique:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flivekit-examples%2Flivestream&env=LIVEKIT_API_KEY,LIVEKIT_API_SECRET,LIVEKIT_API_URL,NEXT_PUBLIC_LIVEKIT_WS_URL&envDescription=Sign%20up%20for%20an%20account%20at%20https%3A%2F%2Fcloud.livekit.io%20and%20create%20an%20API%20key%20in%20the%20Project%20Settings%20UI)

Refer to the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more about deploying to a production environment.
