<script>
  let mensgs = 0;
  let numUsers = 0;
  let eu = ''
  let destinatarios = [];
  let de = [];
  let nomes = []

  const ws = new WebSocket("ws://127.0.0.1:6789");

  import { onMount } from "svelte";

  
  let messageInput;
  let palavras = [];
  let inputText = "";

  onMount(() => {
    messageInput.focus();
  });

  ws.onopen = function (){
    console.log("Websocket client connected");
    };


  ws.onclose = function (){
    console.log("Websock client disconnected")
  }

  ws.onmessage = function (e) {
    console.log("Received: " + e.data);
    let data = JSON.parse(e.data);
    if (data.type == 'msg') {
  
      mensgs = mensgs + 1;
      console.log(palavras)
      palavras = [...palavras, data.msg];
      console.log(palavras)
      destinatarios = [...destinatarios, data.para];
      de = [...de, data.nome]
      inputText = "";

    } else if (data.type == 'users') {
      numUsers = data.count;

    } else {
      console.error("unsupported event", data);
    }

  };

  function handleClick() {
    console.log(inputText)
    if(inputText.startsWith('/nome ')){
      ws.send(JSON.stringify({'msg':inputText.slice(6), 'para':'Todos', 'nome_certo':'False', 'normal':'False'}));
    }
		else if(inputText.startsWith('/privado ')){
      var priv = inputText.split(' ')
			var priv2 = priv[1].length 
			ws.send(JSON.stringify({'msg':inputText.slice(priv2+9), 'para': priv[1], 'nome_certo':'True', 'normal':'False'}));
    }
    else if (eu != null){
      ws.send(JSON.stringify({'msg': inputText, 'para':'Todos', 'nome_certo':'True', 'normal':'True'}));
    }
    else {
			console.error("unsupported event", data);
    }
  }
</script>

<style>
  main {
    background-color: lawngreen;
    width: calc(100% - 30px);
    text-align: center;
    padding: 1em;
    max-width: 1240px;
    margin: 0 auto;
  }

  * {
    box-sizing: border-box;
  }
  h1 {
    color: #000003;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }
  .chatbox {
    width: 100%;
    height: 50vh;
    padding: 0 1em;
    text-align: left;
    background-color: #eee;
    overflow-y: scroll;
    overscroll-behavior-y: contain;
    scroll-snap-type: y proximity;
  }
  .chatbox p {
    margin-top: 0.5em;
    margin-bottom: 0;
    padding-bottom: 0.5em;
  }
  .chatbox > p:last-child {
    scroll-snap-align: end;
  }
  .inputbox {
    display: flex;
    margin-top: 0.5em;
  }
  .inputbox input {
    flex-grow: 1;
  }
  .state {
    font-size: 2em;
    font-family: Verdana;
  }
  .servermsg{
    color:#ff3e00
  }
  .usermsg{
    color:black
  }
  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }
</style>

<main>
  <h1>Websockets Web</h1>

  <div class="state">
    <span class="users">Online ({numUsers})</span>
  </div>

  <div class="chatbox">
    <p class='servermsg'>(Instruções): Bem vindo ao Chat WebSockets de Redes Industriais!</p>
    <p class='servermsg'>(Instruções): Para definir seu usúario, digite: \nome SeuNome</p>
    <p class='servermsg'>(Instruções): Para mandar uma mensagem privada para algum dos usuários, digite: \privado usuário Mensagem</p>
    {#if mensgs>1}
      {#each palavras as palavra, i}
        {#if de != []}
          <p>({de[i]}): {palavra}</p>
        {/if}
      {/each}
    {/if}
  </div>
  <form class="inputbox">
    <input type="text" class="usermsg" bind:this={messageInput} bind:value={inputText} />
    
    <button type="submit" on:click|preventDefault={handleClick}>Send</button>
  </form>

</main>
