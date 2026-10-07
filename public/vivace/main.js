(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var WA = "5511995164432";

  var y = $("#ano"); if (y) y.textContent = new Date().getFullYear();

  // altura do cabeçalho fixo (para ancoras e barra de categorias)
  var head = $(".top");
  var tools = $(".tools");
  function setHead() {
    if (head) document.documentElement.style.setProperty("--head-h", head.offsetHeight + "px");
    if (tools) document.documentElement.style.setProperty("--tools-h", tools.offsetHeight + "px");
  }
  setHead(); addEventListener("resize", setHead); addEventListener("load", setHead);

  // marca no menu e nas categorias a seção que está na tela
  function spy(links, attr) {
    var map = {};
    links.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var secs = Object.keys(map).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!("IntersectionObserver" in window) || !secs.length) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle("on", a === map[e.target.id]); });
        var on = map[e.target.id];
        if (on && on.parentElement && on.parentElement.scrollWidth > on.parentElement.clientWidth) {
          var p = on.parentElement;
          p.scrollTo({ left: on.offsetLeft - p.clientWidth / 2 + on.clientWidth / 2, behavior: "smooth" });
        }
      });
    }, { rootMargin: "-35% 0px -60% 0px" });
    secs.forEach(function (s) { io.observe(s); });
  }
  spy($$(".chips a"));
  spy($$(".menu a"));

  // busca de peças
  var q = $("#q"), vazio = $("#vazio");
  function norm(s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  if (q) q.addEventListener("input", function () {
    var t = norm(q.value.trim()), any = false;
    $$(".card").forEach(function (c) {
      var ok = !t || norm(c.getAttribute("data-search")).indexOf(t) > -1;
      c.hidden = !ok; if (ok) any = true;
    });
    $$(".cat").forEach(function (s) { s.hidden = !$$(".card:not([hidden])", s).length; });
    if (vazio) vazio.hidden = any;
  });

  // formulário -> WhatsApp
  var f = $("#form");
  if (f) f.addEventListener("submit", function (e) {
    e.preventDefault();
    var n = $("#nome"), m = $("#msg"), t = $("#tel"), err = $("#err");
    var bad = !n.value.trim() || !m.value.trim();
    n.classList.toggle("bad", !n.value.trim()); m.classList.toggle("bad", !m.value.trim());
    err.hidden = !bad; if (bad) return;
    var txt = "Olá, Vivace! Meu nome é " + n.value.trim() + ".\n" + m.value.trim() + (t.value.trim() ? "\n\nMeu telefone: " + t.value.trim() : "");
    window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(txt), "_blank", "noopener");
  });
})();
