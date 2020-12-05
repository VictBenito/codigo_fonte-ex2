# Websockets Echo Frontend

Este é apenas o frontend para o servidor counter Websocket baseado na biblioteca `websockets` do Python.
O código do servidor é:

```python
#!/usr/bin/env python

# WS server example that synchronizes state across clients

import asyncio
import json
import logging
import websockets

logging.basicConfig()

STATE = {"value": 0}

USERS = set()


def state_event():
    return json.dumps({"type": "state", **STATE})


def users_event():
    return json.dumps({"type": "users", "count": len(USERS)})


async def notify_state():
    if USERS:  # asyncio.wait doesn't accept an empty list
        message = state_event()
        await asyncio.wait([user.send(message) for user in USERS])


async def notify_users():
    if USERS:  # asyncio.wait doesn't accept an empty list
        message = users_event()
        await asyncio.wait([user.send(message) for user in USERS])


async def register(websocket):
    USERS.add(websocket)
    await notify_users()


async def unregister(websocket):
    USERS.remove(websocket)
    await notify_users()


async def counter(websocket, path):
    # register(websocket) sends user_event() to websocket
    await register(websocket)
    try:
        await websocket.send(state_event())
        async for message in websocket:
            data = json.loads(message)
            if data["action"] == "minus":
                STATE["value"] -= 1
                await notify_state()
            elif data["action"] == "plus":
                STATE["value"] += 1
                await notify_state()
            else:
                logging.error("unsupported event: {}", data)
    finally:
        await unregister(websocket)


start_server = websockets.serve(counter, "localhost", 6789)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
```

Execute o servidor com o Python antes de iniciar o servidor de desenvolvimento do frontend

## Iniciando o servidor de desenvolvimento do frontend

Primeiro, é necessário instalar as depêndencias do Node.js

```bash
cd counterserver_frontend
npm install
```

Depois, para executar o servidor

```bash
npm run dev
```

Com isso, abra o *browser* em [localhost:5000](http://localhost:5000). Você deve observar a sua aplicação em execução. Ao editar um arquivo de componenente em `src` e salvá-lo, você deverá ser capaz de ver suas mudanças na página.

Por padrão, o servidor vai responder apenas por requisições no localhost. Para habilitar conexões de outros computadores, edite os comandos `sirv` no package.json para incluir a opção `--host 0.0.0.0`.

Se você está usando [Visual Studio Code](https://code.visualstudio.com/), é recomendado a instalação da extensão oficial [Svelte for VS Code](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode). 