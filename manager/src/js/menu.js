function build() {
  rows = [];
  if (view === 'share') {
    rows.push({ label: 'Close', fn: closeShare });
    return;
  }
  if (view === 'keys') {
    rows = kRows;
    return;
  }
  if (view === 'notifyhow' || view === 'voicehow') {
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  if (view === 'theme') {
    var tc = (th && th.current) || { id: 'classic', accent: '' };
    ((th && th.themes) || []).forEach(function (x) {
      rows.push({
        label: x.name,
        sub: x.id === tc.id ? 'selected' : x.installed ? '' : 'on GitHub',
        pv: x.preview ? x.id : '',
        info: {
          t: x.name,
          d:
            x.description +
            (x.author ? '\n\nBy ' + x.author : '') +
            (x.installed || x.id === 'classic' ? '' : '\n\nDownloaded from GitHub when you choose it.'),
        },
        fn: function () {
          setTheme({ id: x.id, name: x.name });
        },
      });
    });
    rows.push({ sep: true });
    var an = 'Theme default';
    ((th && th.accents) || []).forEach(function (a) {
      if (a.hex === tc.accent) an = a.name;
    });
    rows.push({
      label: 'Theme options',
      sub: 'accent colour \u00B7 ' + an,
      fn: function () {
        push('themeopts');
      },
    });
    rows.push({ sep: true });
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  if (view === 'themeopts') {
    var to = (th && th.current) || { id: 'classic', accent: '' },
      an2 = 'Theme default';
    ((th && th.accents) || []).forEach(function (a) {
      if (a.hex === to.accent) an2 = a.name;
    });
    rows.push({
      label: 'Accent colour',
      sub: an2,
      fn: function () {
        push('accent');
      },
    });
    rows.push({
      label: 'Go back to the previous theme',
      sub: th && th.previous ? th.previous.id : 'nothing to go back to',
      dim: !(th && th.previous),
      fn: function () {
        if (th && th.previous) themeCall('/api/theme/revert', {}, 'Previous theme restored');
      },
    });
    rows.push({ sep: true });
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  if (view === 'accent') {
    var ta = (th && th.current && th.current.accent) || '';
    ((th && th.accents) || []).forEach(function (a) {
      rows.push({
        label: a.name,
        sub: a.hex === ta ? 'selected' : a.hex || '',
        fn: function () {
          themeCall('/api/theme/set', { accent: a.hex }, a.name === 'Theme default' ? 'Accent: theme default' : 'Accent: ' + a.name, true);
        },
      });
    });
    rows.push({ sep: true });
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  if (view === 'channel') {
    var cc = (st && st.channel) || '';
    rows.push({
      label: 'Stable releases',
      sub: (cc ? '' : 'selected \u00B7 ') + 'the latest published release',
      fn: function () {
        setChannel('');
      },
    });
    ((tst && tst.builds) || []).forEach(function (b) {
      rows.push({
        label: 'Test: ' + b.branch,
        sub:
          (b.tag === cc ? 'selected \u00B7 ' : '') +
          (b.build ? 'build ' + b.build : '') +
          (b.published ? (b.build ? ' \u00B7 ' : '') + String(b.published).slice(0, 10) : ''),
        fn: function () {
          setChannel(b.tag);
        },
      });
    });
    if (!tst || !tst.builds || !tst.builds.length)
      rows.push({
        label: 'No test builds right now',
        sub: tst && tst.error ? String(tst.error) : 'a test build appears when a branch is pushed',
        dim: true,
        fn: null,
      });
    rows.push({ sep: true });
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  if (view === 'models') {
    var cur = ((vo || {}).llm || {}).model;
    mdl.forEach(function (x) {
      rows.push({
        label: x.name,
        sub: x.id + (x.price != null ? ' \u00B7 $' + x.price + ' per million words in' : '') + (x.id === cur ? ' \u00B7 selected' : ''),
        fn: function () {
          pickModel(x.id);
        },
      });
    });
    rows.push({ sep: true });
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  if (view === 'agents') {
    var ca = ((vo || {}).ha || {}).agent || '';
    rows.push({
      label: 'Default agent',
      sub: 'Home Assistant\u2019s own' + (ca ? '' : ' \u00B7 selected'),
      fn: function () {
        pickAgent('');
      },
    });
    agl.forEach(function (x) {
      rows.push({
        label: x.name,
        sub: x.id + (x.id === ca ? ' \u00B7 selected' : ''),
        fn: function () {
          pickAgent(x.id);
        },
      });
    });
    rows.push({ sep: true });
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  if (view === 'voice') {
    var v = vo || {},
      wk = v.job && v.job.state === 'working';
    var vk = (st.keys && st.keys.voice) || '',
      lm = v.llm || {};
    var ha = v.ha || {},
      haOk = !!ha.configured,
      HR = { 'ha-first': 'Home Assistant first, then the AI', 'ha-only': 'Home Assistant only', 'ai-only': 'The AI only' };
    if (!v.installed) {
      rows.push({
        label: 'Install voice',
        sub: wk ? 'installing…' : 'downloads about 80 MB',
        dim: wk,
        fn: function () {
          if (wk) return;
          api('/api/voice/install', {}).then(
            function (x) {
              vo = x;
              build();
              draw();
              voiceRefresh();
            },
            function () {
              banner('The service did not answer', 'err');
            }
          );
        },
      });
    } else {
      rows.push({
        label: 'Listen on the voice button',
        sub: vk ? onoff(v.enabled) : 'learn a button first',
        dim: !vk,
        fn: function () {
          if (!vk) return;
          api('/api/voice/set', { enabled: !v.enabled })
            .then(function (x) {
              vo = x;
              return api('/api/manager/status');
            })
            .then(
              function (s2) {
                st = s2;
                build();
                draw();
              },
              function () {
                banner('The service did not answer', 'err');
              }
            );
        },
      });
      rows.push({
        label: 'Learn the voice button',
        sub: vk ? 'now: ' + vk : 'not learned',
        fn: function () {
          openKeys('voice');
        },
      });
      rows.push({
        label: 'Try it now',
        sub: v.listening ? 'listening…' : 'speak when the card appears',
        dim: v.listening,
        fn: function () {
          if (v.listening) return;
          api('/api/voice/listen', {}).then(
            function (x) {
              if (x.error) banner(x.error, 'err');
              else banner('Speak now…', 'work');
              voiceRefresh();
            },
            function () {
              banner('The service did not answer', 'err');
            }
          );
        },
      });
      rows.push({
        label: 'Switch off LG\u2019s voice assistant',
        sub: onoff(v.suppressLg) + (v.suppressLg && v.enabled && !v.lgPaused ? ' \u00B7 not paused yet' : ''),
        fn: function () {
          api('/api/voice/set', { suppressLg: !v.suppressLg }).then(
            function (x) {
              vo = x;
              build();
              draw();
            },
            function () {
              banner('The service did not answer', 'err');
            }
          );
        },
      });
    }
    rows.push({ sep: true });
    rows.push({
      label: 'Home Assistant (Assist)',
      sub: haOk
        ? ha.url.replace(/^https?:\/\//, '').replace(/\/.*/, '') + ' \u00B7 ' + HR[ha.route]
        : 'not set \u00B7 set up from your phone',
      fn: function () {
        if (!haOk) {
          openPair();
          return;
        }
        haTest();
      },
    });
    rows.push({
      label: 'Which answers first',
      sub: HR[ha.route || 'ha-first'],
      fn: function () {
        var o = ['ha-first', 'ha-only', 'ai-only'],
          n = o[(o.indexOf(ha.route || 'ha-first') + 1) % 3];
        api('/api/voice/set', { ha: { route: n } }).then(
          function (x) {
            if (x.error) {
              banner(x.error, 'err');
              return;
            }
            vo = x;
            build();
            draw();
          },
          function () {
            banner('The service did not answer', 'err');
          }
        );
      },
    });
    rows.push({
      label: 'Assist agent',
      sub: haOk ? ha.agent || 'default' : 'set up Home Assistant first',
      dim: !haOk,
      fn: function () {
        if (haOk) openAgents();
      },
    });
    rows.push({
      label: 'AI chat (OpenRouter)',
      sub: lm.hasKey ? onoff(lm.enabled) + ' \u00B7 ' + lm.model : 'no key set',
      fn: function () {
        if (!lm.hasKey) {
          openPair();
          return;
        }
        api('/api/voice/set', { llm: { enabled: !lm.enabled } }).then(
          function (x) {
            if (x.error) {
              banner(x.error, 'err');
              return;
            }
            vo = x;
            build();
            draw();
          },
          function () {
            banner('The service did not answer', 'err');
          }
        );
      },
    });
    rows.push({ label: 'Model', sub: lm.model || 'openrouter/auto', fn: openModels });
    rows.push({
      label: 'Send the text to',
      sub: v.url ? v.url.replace(/^(https?:\/\/[^\/]+).*/, '$1') : 'not set · shows a card only',
      fn: function () {
        kText =
          'Set the address of your server (from a shell on the TV):\n\ncurl -X POST localhost:8765/api/voice/set -d \'{"url":"http://server:port/path","token":"optional secret"}\'\n\nThe TV sends: POST, JSON {"text":"..."}, with "Authorization: Bearer <token>" when a token is set. If your server answers with JSON {"text":"..."} (or plain text), the answer is shown as a card. Only the recognised text is sent, never audio.';
        push('voicehow');
      },
    });
    rows.push({ sep: true });
    rows.push({ label: 'Set up from your phone', sub: 'key, model, Home Assistant, server', fn: openPair });
    rows.push({
      label: 'Set up with commands',
      sub: 'for scripts and ssh',
      fn: function () {
        kText = aiHelp();
        push('voicehow');
      },
    });
    rows.push({
      label: 'Forget the conversation',
      fn: function () {
        api('/api/voice/forget', {}).then(
          function () {
            banner('Conversation cleared', 'ok');
          },
          function () {
            banner('The service did not answer', 'err');
          }
        );
      },
    });
    if (v.installed) {
      rows.push({ sep: true });
      rows.push({
        label: 'Remove voice',
        sub: 'deletes the ' + Math.round((v.bytes || 0) / 1048576) + ' MB download',
        fn: function () {
          api('/api/voice/uninstall', {})
            .then(function (x) {
              vo = x;
              return api('/api/manager/status');
            })
            .then(
              function (s2) {
                st = s2;
                banner('Voice removed', 'ok');
                build();
                draw();
              },
              function () {
                banner('The service did not answer', 'err');
              }
            );
        },
      });
    }
    rows.push({ sep: true });
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  if (view === 'notifyapi') {
    rows.push({
      label: 'Accept notifications from the network',
      sub: onoff(napi && napi.enabled),
      fn: function () {
        api('/api/manager/notify-api', { enabled: !(napi && napi.enabled) }).then(
          function (n) {
            napi = n;
            api('/api/manager/status').then(function (s2) {
              st = s2;
              build();
              draw();
            });
          },
          function () {
            banner('The service did not answer', 'err');
          }
        );
      },
    });
    if (napi && napi.enabled) {
      rows.push({
        label: 'How to send',
        sub: 'address, token, example',
        fn: function () {
          kText =
            'Send a POST request:\nhttp://' +
            napi.ip +
            ':' +
            napi.port +
            '/notify\n\nHeader:\nAuthorization: Bearer ' +
            napi.token +
            '\n\nBody (JSON):\n{"title":"Front door","text":"Someone is at the door","image":"http://…/snapshot.jpg","seconds":15}';
          push('notifyhow');
        },
      });
      rows.push({ label: 'Show as QR code', sub: 'scan with a phone to copy the address and token', fn: openNotifyQr });
      rows.push({
        label: 'New token',
        sub: 'the old one stops working',
        fn: function () {
          api('/api/manager/notify-api', { regenerate: true }).then(function (n) {
            napi = n;
            banner('New token created. Open \u201CHow to send\u201D to see it.', 'ok');
            build();
            draw();
          });
        },
      });
    }
    rows.push({ sep: true });
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  if (offline) {
    // before the setup: a newer package first, then choose, set up, then the extras
    updIdx = 0;
    if (upd) {
      rows.push({ label: 'Update to ' + upd.updateTo, sub: 'recommended first · installed ' + upd.installed, fn: offlineUpdate });
      rows.push({ sep: true });
    }
    rows.push({
      label: 'Debloat LG’s ads and telemetry',
      sub: onoff(setup.debloat),
      fn: function () {
        setup.debloat = !setup.debloat;
        build();
        draw();
      },
    });
    rows.push({
      label: 'Take over the Input key',
      sub: onoff(setup.inputKey),
      fn: function () {
        setup.inputKey = !setup.inputKey;
        build();
        draw();
      },
    });
    rows.push({ sep: true });
    setupIdx = rows.length;
    rows.push({
      label: 'Set up now',
      sub: 'the screen blinks once',
      fn: function () {
        doSetup(false);
      },
    });
    if (forceOffer)
      rows.push({
        label: 'Set up anyway',
        sub: 'untested firmware; a failed start restarts the TV',
        fn: function () {
          doSetup(true);
        },
      });
    rows.push({ sep: true });
    rows.push({ label: 'Check for updates', sub: 'works without the service', fn: offlineCheck });
    rows.push({ label: 'Share log', sub: 'QR code for your phone', fn: openShare });
    return;
  }
  if (view === 'confirm-home' || view === 'confirm-uninstall') {
    var un = view === 'confirm-uninstall',
      on = !(st.home && st.home.enabled);
    rows.push({ label: 'Cancel', fn: pop });
    rows.push({
      label: un ? 'Yes, remove CleanYourTV' : on ? 'Yes, use CleanYourTV as Home' : 'Yes, use LG’s Home',
      sub: un ? 'settings and apps are deleted; the TV restarts' : 'the TV restarts',
      fn: function () {
        api(un ? '/api/manager/uninstall' : '/api/manager/home', un ? {} : { enabled: on }).catch(function () {});
        banner(
          un
            ? 'Removing CleanYourTV… the TV restarts in a moment and LG’s Home comes back.'
            : on
              ? 'Switching to CleanYourTV… the TV restarts in a moment.'
              : 'Switching to LG’s Home… the TV restarts in a moment.',
          'work'
        );
      },
    });
    return;
  }
  if (view === 'livetv') {
    var lo = st.options.liveTv !== false,
      l2 = lv || {},
      gk = (st.keys && st.keys.guide) || '';
    rows.push({
      label: 'Show Live TV',
      sub: onoff(lo),
      fn: function () {
        opt({ liveTv: !lo });
      },
    });
    rows.push({
      label: 'Playlist',
      sub: l2.configured
        ? l2.channels +
          ' channels' +
          (l2.epg ? ' \u00B7 guide for ' + l2.epg + ' programmes' : '') +
          (l2.state && l2.state !== 'idle' ? ' \u00B7 ' + l2.state : '')
        : 'not set \u00B7 set up from your phone',
      fn: openLivePair,
    });
    rows.push({
      label: 'Refresh playlist and guide',
      sub: l2.error ? String(l2.error).slice(0, 70) : '',
      dim: !l2.configured,
      fn: function () {
        if (!l2.configured) return;
        banner('Refreshing\u2026', 'work');
        api('/api/live/refresh', {}).then(
          function () {
            banner('Refreshing in the background', 'ok');
            setTimeout(liveRefresh, 3000);
          },
          function () {
            banner('The service did not answer', 'err');
          }
        );
      },
    });
    rows.push({
      label: 'Learn the Guide key',
      sub: lo ? (gk ? 'now: ' + gk : 'not learned \u00B7 LG\u2019s guide stays') : 'Live TV is off',
      dim: !lo,
      fn: function () {
        if (lo) openKeys('guide');
      },
    });
    rows.push({ sep: true });
    rows.push({
      label: 'Clear recent channels',
      fn: function () {
        api('/api/live/state', { op: 'clear' }).then(
          function () {
            banner('Recent channels cleared', 'ok');
          },
          function () {
            banner('The service did not answer', 'err');
          }
        );
      },
    });
    rows.push({
      label: 'Remove the playlist',
      sub: l2.configured ? '' : 'nothing to remove',
      dim: !l2.configured,
      fn: function () {
        if (l2.configured) push('confirm-live-reset');
      },
    });
    rows.push({ sep: true });
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  if (view === 'confirm-live-reset') {
    rows.push({
      label: 'Yes, remove the playlist',
      sub: 'the address, the channel list, the guide and your favourites are deleted',
      fn: function () {
        api('/api/live/reset', {}).then(
          function () {
            banner('Playlist removed', 'ok');
            pop();
            liveRefresh();
          },
          function () {
            banner('The service did not answer', 'err');
          }
        );
      },
    });
    rows.push({ label: 'No, keep it', fn: pop });
    return;
  }
  if (view === 'inputkey') {
    var hk = st.inputhook || {},
      na = hk.hook && !hk.hook.attached;
    rows.push({
      label: 'Input key opens our Inputs list',
      sub: na ? 'not available on this firmware' : onoff(st.options.inputKey),
      fn: function () {
        opt({ inputKey: !st.options.inputKey });
      },
    });
    rows.push({
      label: 'Learn the Input key',
      sub: st.keys && st.keys.inputIsDefault ? 'default (' + st.keys.input + ')' : 'learned: ' + (st.keys && st.keys.input),
      fn: function () {
        openKeys('input');
      },
    });
    var pk = st.picker || {},
      pkMode = pk.mode || 'overlay',
      PKT = {
        overlay: 'over the running app, ready in the background (instant)',
        ondemand: 'over the running app, started when pressed',
        launcher: 'the launcher\u2019s Inputs list',
      };
    rows.push({
      label: 'Input key shows',
      sub:
        (pk.released ? 'LG\u2019s own list: CleanYourTV is not the Home' : PKT[pkMode]) +
        (pk.reason && !pk.released ? ' \u00B7 ' + pk.reason : ''),
      fn: function () {
        var o = ['overlay', 'ondemand', 'launcher'];
        opt({ pickerMode: o[(o.indexOf(pkMode) + 1) % 3] });
      },
    });
    rows.push({
      label: 'Learn the Home key',
      sub: 'optional · ' + (st.keys && st.keys.home ? 'now: ' + st.keys.home : 'not learned'),
      fn: function () {
        openKeys('home');
      },
    });
    rows.push({ sep: true });
    rows.push({ label: 'Back', fn: pop });
    return;
  }
  var fe = st.frontend,
    sv = st.service,
    busy = st.job && st.job.state === 'working';
  var uptxt = function (u) {
    return u
      ? 'Update to ' + u + (st.channel ? ' (test build)' : '')
      : st.checking
        ? 'Checking…'
        : st.checkError
          ? /no release/.test(st.checkError)
            ? 'No release yet'
            : 'Cannot check'
          : 'Up to date';
  };
  // updates, then the settings, then support; the destructive row last
  rows.push({
    label: 'Launcher ' + fe.version,
    sub: uptxt(fe.updateTo),
    dim: busy,
    fn: fe.updateTo
      ? function () {
          run('/api/manager/update-frontend', { version: fe.updateTo });
        }
      : null,
  });
  rows.push({
    label: 'Service ' + sv.version,
    sub: uptxt(sv.updateTo),
    dim: busy,
    fn: sv.updateTo
      ? function () {
          run('/api/manager/update-service', { version: sv.updateTo });
        }
      : null,
  });
  rows.push({
    label: 'Check for updates',
    dim: busy,
    fn: function () {
      banner('Checking…', 'work');
      api('/api/manager/check', {}).then(refreshDone, refreshDone);
    },
  });
  rows.push({
    label: 'Update channel',
    sub: st.channel ? 'Test: ' + st.channel.replace(/^test-/, '') : 'Stable releases',
    dim: busy,
    fn: openChannel,
  });
  if (fe.previous)
    rows.push({
      label: 'Go back to launcher ' + fe.previous,
      dim: busy,
      fn: function () {
        run('/api/manager/rollback-frontend', {});
      },
    });
  rows.push({ sep: true });
  rows.push({
    label: 'CleanYourTV as Home',
    sub: onoff(st.home && st.home.enabled),
    fn: function () {
      push('confirm-home');
    },
  });
  rows.push({
    label: 'Theme',
    sub: (function () {
      var n = '';
      ((th && th.themes) || []).forEach(function (x) {
        if (th.current && x.id === th.current.id) n = x.name;
      });
      return n;
    })(),
    fn: openTheme,
  });
  rows.push({ label: 'Live TV', sub: onoff(st.options.liveTv !== false), fn: openLiveTv });
  rows.push({
    label: 'Input key',
    sub: st.inputhook && st.inputhook.hook && !st.inputhook.hook.attached ? 'not available' : onoff(st.options.inputKey),
    fn: function () {
      push('inputkey');
    },
  });
  rows.push({ sep: true });
  rows.push({
    label: 'Voice',
    sub: st.voice ? (st.voice.installed ? onoff(st.voice.enabled) : 'not installed') : '',
    fn: function () {
      api('/api/voice/status').then(
        function (v) {
          vo = v;
          push('voice');
          if ((v.job && v.job.state === 'working') || v.listening) voiceRefresh();
        },
        function () {
          banner('The service did not answer', 'err');
        }
      );
    },
  });
  rows.push({
    label: 'Network notifications',
    sub: onoff(st.notifyApi && st.notifyApi.enabled),
    fn: function () {
      api('/api/manager/notify-api').then(
        function (n) {
          napi = n;
          push('notifyapi');
        },
        function () {
          banner('The service did not answer', 'err');
        }
      );
    },
  });
  rows.push({
    label: 'Debloat LG’s ads and telemetry',
    sub: onoff(st.options.debloat),
    fn: function () {
      opt({ debloat: !st.options.debloat });
    },
  });
  rows.push({ sep: true });
  rows.push({ label: 'Share log', sub: 'QR code for your phone', fn: openShare });
  rows.push({
    label: 'Uninstall',
    fn: function () {
      push('confirm-uninstall');
    },
  });
}
