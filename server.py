#!/usr/bin/env python

import asyncio
import json
import logging
import websockets

logging.basicConfig()

STATE = {'msg':'', 'nome': '','para':'Todos'}

USERS = {} #criando users como um dicionario

global teste
teste = ''

def state_event():
    return json.dumps({"type": "msg", **STATE})

def users_event():
    return json.dumps({"type": "users", "count": len(USERS)})

async def notify_state():
    global teste
    if USERS and STATE['para'] != 'Todos': #caso em que o comando /privado foi usado
        message = state_event()
        user1 = None
        user2 = None
        for i in USERS: #procura destinatario e mandante no dict
            if USERS[i] == STATE['nome']:
                user1 = i
            if USERS[i] == STATE['para']:
                user2 = i
            try: await asyncio.wait([user1.send(message), user2.send(message)])
            except: pass
    if USERS and STATE['para'] == teste: #caso em que o mandante é o server, procura-se só o destinatario
        message = state_event()
        user1 = None
        for i in USERS: #procura destinatario no dict
            if USERS[i] == teste:
                user1 = i
        try: await asyncio.wait([user1.send(message)])
        except: pass
    elif USERS:  # asyncio.wait doesn't accept an empty list
        message = state_event()
        await asyncio.wait([user.send(message) for user in USERS])

async def notify_users():
    if USERS:  # asyncio.wait doesn't accept an empty list
        message = users_event()
        await asyncio.wait([user.send(message) for user in USERS])

async def register(websocket):
    USERS[websocket] = None
    await notify_users()

async def unregister(websocket):
    USERS.pop(websocket)
    await notify_users()

async def counter(websocket, path):
    await register(websocket)
    try:

        await websocket.send(state_event())
        async for message in websocket:
            data = json.loads(message)
            usuario_novo = False
            if data['nome_certo'] == 'False':
                nome_novo = True
                global teste
                
                for i in USERS: #for para checar se o nome está disponível
                    if  data['msg'] == USERS[i]: # se nome == nome no dict
                        nome_novo = False
                        STATE['msg'] = ' Nome não disponível, por favor escolha outro com o mesmo comando'
                        STATE['para'] = USERS[websocket]
                        teste = USERS[websocket]
                        STATE['nome'] = 'Server'
                        await notify_state()
                if nome_novo:  
                    if USERS[websocket] == None:
                        usuario_novo = True
                        STATE['msg'] = ' Seu nome no chat é {}'.format(data['msg'])
                        teste = data['msg']
                        STATE['para'] = data['msg']
                        USERS.update({websocket:data['msg']})
                        STATE['nome'] = 'Server'
                        await notify_state()
                    else:
                        STATE['msg'] = ' Nome do usuário "{}" alterado para: "{}"'.format(USERS[websocket], data['msg'])
                        STATE['para'] = data['msg']
                        USERS.update({websocket:data['msg']})
                        STATE['nome'] = 'Server'
                        await notify_state()
                    if usuario_novo:
                        STATE['msg'] = ' Novo usuário na sala: {}'.format(data['msg'])
                        STATE['para'] = 'Todos'
                        STATE['nome'] = 'Server'
                        await notify_state() 
            elif data['para'] != 'Todos' and USERS[websocket] != None:
                STATE['msg'] = data['msg']
                STATE['para'] = data['para']
                STATE['nome'] = USERS[websocket]
                await notify_state()

            elif data['normal'] == 'True' and USERS[websocket] != None :
                STATE['msg'] = data['msg']
                STATE['nome'] = USERS[websocket]
                STATE['para'] = 'todos'
                await notify_state()  
            else:
                logging.error("unsupported event: {}")
    finally:
        await unregister(websocket)
start_server = websockets.serve(counter, "localhost", 6789)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
