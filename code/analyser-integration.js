import * as Analyzer from "./layout-analyzer.js";

window.addEventListener('DOMContentLoaded', () => {
  'use strict'; // eslint-disable-line

  const ngramMappings = {
    sfb:         { title: "SFU",                    tableId: "Achoppements" },
    scisor:      { title: "ciseaux",                tableId: "Achoppements" },
    lsb:         { title: "extensions",             tableId: "Achoppements" },
    skb:         { title: "SKU",                    tableId: "Digrammes" },
    inwardRoll:  { title: "rolls intérieur",        tableId: "Digrammes" },
    outwardRoll: { title: "rolls extérieur",        tableId: "Digrammes" },
    redirect:    { title: "redirections",           tableId: "Trigrammes" },
    badRedirect: { title: "mauvaises redirections", tableId: "Trigrammes" },
    sfs:         { title: "presque SFB",            tableId: "Trigrammes" },
    sks:         { title: "presque SKB",            tableId: "Trigrammes" },
  };

  // store the keyboard state in the URL hash like it's 1995 again! :-)
  const state = { layout: 'ergol', corpus: 'en+fr' };
  const updateHashState = (key, value) => {
    state[key] = value;
    window.location.hash = `/${state.layout}/${state.corpus}`;
  };

  document
    .querySelector('#sticky-select #layout')
    .addEventListener('change', event => {
      updateHashState('layout', event.target.value);
  });

  document
    .querySelector('#sticky-select #corpus')
    .addEventListener('change', event => {
      updateHashState('corpus', event.target.value);
  });

  async function applyHashState() {
    const layout = await fetch(`../layouts/${state.layout}.json`).then(response => response.json());
    const corpus = await fetch(`../corpus/${state.corpus}.json`).then(response => response.json());

    const stats = Analyzer.getLayoutStats(layout, corpus);

    for (const [ngramType, values] of Object.entries(stats.ngrams)) {
      const { title, tableId } = ngramMappings[ngramType] ?? {};
      if (title === undefined) continue;

      document
        .getElementById(tableId)
        .updateTableData(ngramType, title, values);
    }
  }

  window.addEventListener('hashchange', applyHashState);

  applyHashState();
});
