async function check() {
  try {
    const res = await fetch('https://n8nback.zapgestao.app.br/webhook/cadastroNovoCliente', {
      method: 'POST',
      body: 'test'
    });
    console.log(res.status, res.statusText);
  } catch (e) {
    console.error(e.message);
  }
}
check();
