/* ============================================================
   DoramaFLIX — JS (vanilla, sem dependências)
   1) CONFIG de links   2) Carrosséis   3) Contador
   4) Barra fixa        5) Revelação ao rolar
   ============================================================ */
(function () {
  'use strict';

  /* ------------------------------------------------------------
     1) CONFIG — é aqui e SÓ aqui que você edita os links.
        Cole a URL entre as aspas. Enquanto estiver vazio (''),
        o botão apenas rola a página até a seção de planos.
     ------------------------------------------------------------ */
  var LINKS = {
    basico:   'https://ggcheckout.app/checkout/v3/huthToL3Cq8DED9qY65l',  // R$ 10,90
    premium:  'https://ggcheckout.app/checkout/v3/5kSkMNamu0gnaeUPM1Tt',  // R$ 19,90
    completo: 'https://ggcheckout.app/checkout/v3/0v6mqAh4Uh4mmNq9lVmW',  // R$ 49,90
    suporte:  'https://wa.me/5547984641097',
    contato:  'https://wa.me/5547984641097'
  };

  // Abre em nova aba? (recomendado para checkout externo)
  var ABRIR_EM_NOVA_ABA = true;

  document.querySelectorAll('[data-link]').forEach(function (el) {
    var url = LINKS[el.getAttribute('data-link')];
    if (!url) return;                       // sem URL: mantém o #planos
    el.setAttribute('href', url);
    if (ABRIR_EM_NOVA_ABA) {
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
    }
  });

  /* ------------------------------------------------------------
     1b) UPSELL — clicar no Básico abre o comparativo com o Premium
         antes de mandar a pessoa para o checkout. Os links de dentro
         do próprio modal seguem direto, sem reabrir nada.
     ------------------------------------------------------------ */
  var modal = document.getElementById('upsell');

  if (modal) {
    var focoAnterior = null;

    var fecharModal = function () {
      modal.hidden = true;
      document.body.classList.remove('has-modal');
      if (focoAnterior) focoAnterior.focus();
      focoAnterior = null;
    };

    var abrirModal = function (gatilho) {
      focoAnterior = gatilho || null;
      modal.hidden = false;
      document.body.classList.add('has-modal');
      var alvo = modal.querySelector('.btn');
      if (alvo) alvo.focus();
    };

    document.querySelectorAll('[data-link="basico"]').forEach(function (el) {
      if (modal.contains(el)) return;          // o "quero só o básico" segue direto
      el.addEventListener('click', function (e) {
        e.preventDefault();
        abrirModal(el);
      });
    });

    modal.querySelectorAll('[data-upsell-close]').forEach(function (el) {
      el.addEventListener('click', fecharModal);
    });

    // Sair pelo Esc e manter o Tab preso dentro do modal
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;

      if (e.key === 'Escape') { fecharModal(); return; }
      if (e.key !== 'Tab') return;

      var focaveis = modal.querySelectorAll('a[href], button');
      if (!focaveis.length) return;

      var primeiro = focaveis[0];
      var ultimo = focaveis[focaveis.length - 1];

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    });

    // Escolheu um dos dois: fecha para a página não voltar com o modal aberto
    modal.querySelectorAll('[data-link]').forEach(function (el) {
      el.addEventListener('click', fecharModal);
    });
  }

  var reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------
     2) CARROSSÉIS — rolagem automática contínua + arraste/swipe
        Cada fita é um container com overflow-x, então o usuário
        pode arrastar a qualquer momento. O laço duplica os itens
        para o loop ser imperceptível.
     ------------------------------------------------------------ */
  var fitas = [];

  document.querySelectorAll('[data-marquee]').forEach(function (track) {
    // Duplica os itens (a cópia é invisível para leitores de tela)
    var originais = Array.prototype.slice.call(track.children);
    originais.forEach(function (node) {
      var copia = node.cloneNode(true);
      copia.setAttribute('aria-hidden', 'true');
      copia.querySelectorAll('img').forEach(function (img) { img.setAttribute('alt', ''); });
      track.appendChild(copia);
    });

    var fita = {
      el: track,
      velocidade: parseFloat(track.getAttribute('data-speed')) || 24, // px por segundo
      pausada: false,
      retomarEm: 0,
      visivel: true,
      periodo: 0,
      // A posição é acumulada aqui em ponto flutuante: o navegador arredonda
      // scrollLeft para inteiro, e frações de pixel por frame se perderiam.
      pos: 0
    };

    // Um "período" é a largura de uma cópia da lista. Como duplicamos os itens,
    // largura total = 2 x período - 1 gap.
    fita.medir = function () {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      fita.periodo = (track.scrollWidth + gap) / 2;
    };
    fita.medir();

    // Pausa no hover (desktop), no foco por teclado e durante o toque
    track.addEventListener('mouseenter', function () { fita.pausada = true; });
    track.addEventListener('mouseleave', function () { fita.pausada = false; });
    track.addEventListener('focusin',    function () { fita.pausada = true; });

    ['pointerup', 'pointercancel', 'touchend'].forEach(function (evt) {
      track.addEventListener(evt, function () { fita.retomarEm = performance.now() + 2200; });
    });
    track.addEventListener('wheel', function () { fita.retomarEm = performance.now() + 2200; }, { passive: true });

    // Arraste com o mouse (no toque a rolagem nativa já resolve)
    var arrastando = false, xInicial = 0, scrollInicial = 0;

    track.addEventListener('pointerdown', function (e) {
      fita.pausada = true;
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      arrastando = true;
      xInicial = e.clientX;
      scrollInicial = track.scrollLeft;
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', function (e) {
      if (!arrastando) return;
      e.preventDefault();
      track.scrollLeft = scrollInicial - (e.clientX - xInicial);
    });

    ['pointerup', 'pointercancel'].forEach(function (evt) {
      track.addEventListener(evt, function () {
        arrastando = false;
        track.classList.remove('is-dragging');
      });
    });

    // Só anima quando a fita está na tela (economiza bateria/CPU)
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entradas) {
        fita.visivel = entradas[0].isIntersecting;
      }, { rootMargin: '120px' }).observe(track);
    }

    fitas.push(fita);
  });

  if (fitas.length) {
    // Remede as fitas quando o layout muda (rotação de tela, resize)
    var remedirTimer;
    window.addEventListener('resize', function () {
      clearTimeout(remedirTimer);
      remedirTimer = setTimeout(function () {
        fitas.forEach(function (fita) { fita.medir(); });
      }, 200);
    });

    if (!reduzirMovimento) {
      var anterior = 0;

      var animar = function (agora) {
        var dt = anterior ? Math.min((agora - anterior) / 1000, 0.05) : 0;
        anterior = agora;

        fitas.forEach(function (fita) {
          var el = fita.el;
          if (!fita.periodo) fita.medir();
          var periodo = fita.periodo;
          if (!periodo) return;

          if (fita.retomarEm && agora > fita.retomarEm) {
            fita.pausada = false;
            fita.retomarEm = 0;
          }

          // O usuário arrastou ou rolou: adota a posição dele
          if (Math.abs(el.scrollLeft - fita.pos) > 2) {
            fita.pos = (el.scrollLeft <= 0 && fita.pos > 4) ? periodo : el.scrollLeft;
          }

          if (!fita.pausada && fita.visivel && dt) {
            fita.pos += fita.velocidade * dt;
          }

          // Loop contínuo nas duas direções
          if (fita.pos >= periodo) fita.pos -= periodo;
          else if (fita.pos < 0) fita.pos += periodo;

          var alvo = Math.round(fita.pos);
          if (alvo !== el.scrollLeft) el.scrollLeft = alvo;
        });

        requestAnimationFrame(animar);
      };

      requestAnimationFrame(animar);
    }
  }

  /* ------------------------------------------------------------
     3) CONTADOR — promoção relâmpago encerra hoje às 23:59.
        Ao virar o dia, o prazo passa a ser o dia seguinte.
     ------------------------------------------------------------ */
  var relogio = document.querySelector('[data-countdown]');
  var dataPrazo = document.querySelector('[data-deadline-date]');

  if (relogio) {
    var doisDigitos = function (n) { return n < 10 ? '0' + n : String(n); };

    var atualizarContador = function () {
      var agora = new Date();
      var prazo = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 0, 0);
      if (agora > prazo) prazo.setDate(prazo.getDate() + 1);

      if (dataPrazo) {
        dataPrazo.textContent = doisDigitos(prazo.getDate()) + '/' + doisDigitos(prazo.getMonth() + 1);
      }

      var falta = Math.max(0, prazo - agora);
      var h = Math.floor(falta / 3600000);
      var m = Math.floor(falta / 60000) % 60;
      var s = Math.floor(falta / 1000) % 60;

      relogio.textContent = doisDigitos(h) + ':' + doisDigitos(m) + ':' + doisDigitos(s);
    };

    atualizarContador();
    setInterval(atualizarContador, 1000);
  }

  /* ------------------------------------------------------------
     4) BARRA FIXA DE CONVERSÃO — aparece depois do hero (mobile)
     ------------------------------------------------------------ */
  var barra = document.getElementById('stickyCta');
  var hero = document.querySelector('.hero');

  if (barra && hero && 'IntersectionObserver' in window) {
    barra.hidden = false;
    document.body.classList.add('has-sticky');

    new IntersectionObserver(function (entradas) {
      barra.classList.toggle('is-visible', !entradas[0].isIntersecting);
    }, { threshold: 0, rootMargin: '-60px 0px 0px 0px' }).observe(hero);
  }

  /* ------------------------------------------------------------
     5) REVELAÇÃO AO ROLAR
     ------------------------------------------------------------ */
  var blocos = document.querySelectorAll('[data-reveal]');

  if (!blocos.length) return;

  if (reduzirMovimento || !('IntersectionObserver' in window)) {
    blocos.forEach(function (b) { b.classList.add('is-in'); });
    return;
  }

  var observador = new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (!entrada.isIntersecting) return;
      entrada.target.classList.add('is-in');
      observador.unobserve(entrada.target);
    });
  }, { rootMargin: '0px 0px -60px 0px' });

  blocos.forEach(function (b) { observador.observe(b); });
})();
