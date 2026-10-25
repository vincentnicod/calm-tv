// Voice answers (voice.js): Home Assistant (Assist) and a language model, against local stand-ins for both.
const { ok, call, serve, req, memoryConfig, run } = require('./lib');

run(async () => {
  const haLog = [],
    TOKEN = 'secret-ha-token-123';
  const ha = await serve((q, r) => {
    let b = '';
    q.on('data', c => (b += c));
    q.on('end', () => {
      const send = (c, o) => {
        r.writeHead(c, { 'content-type': 'application/json' });
        r.end(JSON.stringify(o));
      };
      if (q.headers.authorization !== 'Bearer ' + TOKEN) return send(401, { message: '401: Unauthorized' });
      if (q.url === '/api/config') return send(200, { location_name: 'Home', version: '2026.10.0' });
      if (q.url === '/api/states')
        return send(200, [
          { entity_id: 'light.x', attributes: {} },
          { entity_id: 'conversation.home_assistant', attributes: { friendly_name: 'Home Assistant' } },
          { entity_id: 'conversation.llm', attributes: {} },
        ]);
      if (q.url !== '/api/conversation/process') return send(404, {});
      const o = JSON.parse(b);
      haLog.push(o);
      const reply = (type, speech, code) =>
        send(200, {
          conversation_id: 'conv-1',
          response: { response_type: type, data: code ? { code } : {}, speech: { plain: { speech } } },
        });
      if (o.text === 'turn on the light') return reply('action_done', 'Turned on the light');
      if (o.text === 'quiet') return reply('action_done', '');
      if (o.text === 'slow') return setTimeout(() => reply('query_answer', 'Finally'), 600);
      reply('error', "Sorry, I couldn't understand that", 'no_intent_match');
    });
  });
  const ai = await serve((q, r) => {
    q.on('data', () => {});
    q.on('end', () => {
      r.writeHead(200, { 'content-type': 'application/json' });
      r.end(JSON.stringify({ choices: [{ message: { content: 'The AI says hello' } }] }));
    });
  });
  process.env.CYTV_OPENROUTER = ai.url;
  const cards = [];
  const v = req('voice').create({ config: memoryConfig(), notify: { show: async o => cards.push(o) } });
  const vask = (act, body, method) => call(v, '/api/voice/' + act, method || 'POST', body);

  let r = await vask('set', { ha: { url: 'ftp://x' } });
  ok(r.code === 400, 'a Home Assistant address that is not http(s) is refused');
  r = await vask('set', { ha: { route: 'sideways' } });
  ok(r.code === 400, 'an unknown routing is refused');
  r = await vask('set', { ha: { url: ha.url + '/', token: 'wrong' } });
  ok(
    r.code === 200 && r.j.ha.url === ha.url && r.j.ha.route === 'ha-first',
    'the address is stored without a trailing slash; the default routing is Home Assistant first'
  );
  ok(JSON.stringify(r.j).indexOf('wrong') < 0 && r.j.ha.hasToken === true, 'the status never contains the token');
  r = await vask('ha-test');
  ok(r.code === 502 && /refused the access token/.test(r.j.error), 'a bad token is reported');
  await vask('set', { ha: { token: TOKEN } });
  r = await vask('ha-test');
  ok(r.j.name === 'Home' && r.j.version === '2026.10.0', 'test connection reads the name and version');
  r = await vask('ha-agents');
  ok(
    r.j.agents.length === 2 && r.j.agents[0].id === 'conversation.home_assistant' && r.j.agents[0].name === 'Home Assistant',
    'agents are the conversation.* entities'
  );
  r = await vask('ask', { text: 'turn on the light', card: false });
  ok(r.j.answer === 'Turned on the light' && r.j.via === 'ha', 'Assist answers an understood command');
  r = await vask('ask', { text: 'quiet', card: false });
  ok(r.j.answer === 'Done', 'an action without speech shows Done');
  ok(haLog[1].conversation_id === 'conv-1' && !haLog[0].conversation_id, 'the conversation id is passed on to the next request');
  r = await vask('ask', { text: 'slow', card: false });
  ok(r.j.answer === 'Finally', 'a slow answer is waited for');
  r = await vask('ask', { text: 'what is love', card: false });
  ok(r.j.answer === "Sorry, I couldn't understand that" && r.j.via === 'ha', "not understood and no AI: Assist's own message is shown");
  await vask('set', { llm: { key: 'sk-test', enabled: true } });
  r = await vask('ask', { text: 'what is love', card: false });
  ok(r.j.answer === 'The AI says hello' && r.j.via === 'ai', 'not understood: the same text goes to the AI');
  r = await vask('ask', { text: 'turn on the light', card: false });
  ok(r.j.via === 'ha', 'understood: the AI is not asked');
  await vask('set', { ha: { route: 'ha-only' } });
  r = await vask('ask', { text: 'what is love', card: false });
  ok(r.j.via === 'ha' && /couldn't understand/.test(r.j.answer), 'Home Assistant only: never the AI');
  await vask('set', { ha: { route: 'ai-only' } });
  const n0 = haLog.length;
  r = await vask('ask', { text: 'turn on the light', card: false });
  ok(r.j.via === 'ai' && haLog.length === n0, 'AI only: Home Assistant is not asked');
  await vask('set', { ha: { route: 'ha-first', agent: 'conversation.llm' } });
  await vask('ask', { text: 'turn on the light', card: false });
  ok(haLog[haLog.length - 1].agent_id === 'conversation.llm', 'the chosen agent is sent');
  await vask('set', { ha: { agent: '' } });
  await vask('forget');
  await vask('ask', { text: 'turn on the light', card: false });
  ok(
    !haLog[haLog.length - 1].conversation_id && !('agent_id' in haLog[haLog.length - 1]),
    'forgetting starts a new conversation; no agent means the default'
  );
  await vask('set', { ha: { url: 'http://127.0.0.1:1' } });
  r = await vask('ask', { text: 'turn on the light', card: false });
  ok(r.j.answer === 'The AI says hello' && r.j.via === 'ai', 'Home Assistant unreachable: the AI answers');
  await vask('set', { llm: { clearKey: true } });
  r = await vask('ask', { text: 'turn on the light', card: false });
  ok(!r.j.answer && /Home Assistant:/.test(r.j.error), 'Home Assistant unreachable and no AI: the error is reported');
  await vask('set', { ha: { clear: true } });
  r = await vask('status', null, 'GET');
  ok(r.j.ha.configured === false && r.j.ha.hasToken === false, 'removing Home Assistant clears the address and token');
  // the setup page for a phone (port 8769): it starts, answers with the token only, and stops
  r = await vask('pair');
  ok(r.code === 200 && /^http:\/\/.*:8769\//.test(r.j.url || ''), 'the phone setup page starts (' + JSON.stringify(r.j) + ')');
  if (r.j && r.j.url) {
    const page = await new Promise(res => {
      require('http')
        .get('http://127.0.0.1:8769' + r.j.url.replace(/^http:\/\/[^/]+/, ''), rs => {
          let b = '';
          rs.on('data', c => (b += c));
          rs.on('end', () => res({ code: rs.statusCode, body: b }));
        })
        .on('error', e => res({ code: 0, body: String(e) }));
    });
    ok(page.code === 200 && /Voice setup/.test(page.body), 'the setup page answers at its address');
  }
  r = await vask('pair-stop');
  ok(r.code === 200, 'the setup page stops');
  ha.server.close();
  ai.server.close();
});
