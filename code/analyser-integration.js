import * as Analyzer from "./layout-analyzer.js";

window.addEventListener('DOMContentLoaded', () => {
  'use strict'; // eslint-disable-line

  (async () => {
    const layout = await fetch('../layouts/ergol.json').then(response => response.json());
    const corpus = await fetch('../corpus/fr.json').then(response => response.json());

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

    const stats = Analyzer.getLayoutStats(layout, corpus);

    for (const [ngramType, values] of Object.entries(stats.ngrams)) {
      const { title, tableId } = ngramMappings[ngramType] ?? {};
      if (title === undefined) continue;

      document
        .getElementById(tableId)
        .updateTableData(ngramType, title, values);

      // console.log(ngramTitlesAndId[key]);
    }

    // const totalDoubleRoll = Object.values(stats.ngrams.redirect).reduce((e, acc) => e + acc, 0);
    // console.log(totalDoubleRoll);
  })();

  // const inputField = document.querySelector('input');
  // const keyboard = document.querySelector('x-keyboard');

  // let keyChars = {};
  // let corpus = {};
  // let digrams = {};
  // let trigrams = {};
  // let corpusName = '';
  // let impreciseData = false;


  // // display a percentage value
  // const fmtPercent = (num, p) => `${Math.round(10 ** p * num) / 10 ** p}%`;
  // const showPercent = (sel, num, precision, parentId) => {
  //   const element = parentId
  //     ? document.querySelector(parentId).shadowRoot
  //     : document;
  //   element.querySelector(sel).innerText = fmtPercent(num, precision);
  // };

  // const showPercentAll = (sel, nums, precision, parentId) => {
  //   const element = parentId
  //     ? document.querySelector(parentId).shadowRoot
  //     : document;
  //   element.querySelector(sel).innerText =
  //     nums.map(value => fmtPercent(value, precision)).join(' / ');
  // };

  // const sumUpBar = bar => bar.good + bar.meh + bar.bad;
  // const sumUpBarGroup = group => group.reduce((acc, bar) => acc + sumUpBar(bar), 0);

  // // display a finger/frequency table and bar graph
  // const showFingerData = (sel, values, maxValue, precision) => {
  //   const canvas = document.querySelector(`${sel} canvas`);
  //   const table = document.querySelector(`${sel} table`);

  //   canvas.width = 1000;
  //   canvas.height = 100;
  //   const ctx = canvas.getContext('2d');
  //   ctx.save();
  //   const headingColor = getComputedStyle(
  //     document.querySelector('h1'),
  //   ).getPropertyValue('color');
  //   ctx.fillStyle = impreciseData ? headingColor : '#88f';
  //   const width = canvas.width / 11;
  //   const margin = 20;
  //   const scale = 100 / maxValue;

  //   let cols = '';
  //   Object.values(values).forEach((value, i) => {
  //     const idx = i >= 4 ? i + 2 : i + 1;
  //     cols +=
  //       (i === 4 ? '<td></td>' : '') +
  //       `<td>${fmtPercent(value, precision)}</td>`;
  //     ctx.fillRect(
  //       idx * width + margin / 2,
  //       canvas.height - value * scale,
  //       width - margin / 2,
  //       value * scale,
  //     );
  //   });
  //   ctx.restore();
  //   table.innerHTML = `<tr><td></td>${cols}<td></td></tr>`;
  // };

  // const computeNGrams = () => {
  //   // Render digrams
  //   document.querySelector('#sfu stats-canvas').renderData({
  //     values: totalSfuSkuPerFinger,
  //     maxValue: 4,
  //     precision: 2,
  //     flipVertically: true,
  //     detailedValues: true,
  //   });

  //   const sum = dict => Object.entries(dict).reduce((acc, [_, e]) => acc + e, 0);

  //   showPercent('#sfu-all', sum(ngrams.sfb), 2);
  //   showPercent('#sku-all', sum(ngrams.skb), 2);

  //   showPercent('#sfu-all',        sum(ngrams.sfb),    2, '#Achoppements');
  //   showPercent('#extensions-all', sum(ngrams.lsb),    2, '#Achoppements');
  //   showPercent('#scisors-all',    sum(ngrams.scisor), 2, '#Achoppements');

  //   showPercent('#inward-all',  sum(ngrams.inwardRoll),  1, '#Digrammes');
  //   showPercent('#outward-all', sum(ngrams.outwardRoll), 1, '#Digrammes');
  //   showPercent('#sku-all',     sum(ngrams.skb),         2, '#Digrammes');

  //   const achoppements = document.getElementById('Achoppements');
  //   achoppements.updateTableData('#sfu-digrams', 'SFU', ngrams.sfb, 2);
  //   achoppements.updateTableData('#extended-rolls', 'extensions', ngrams.lsb, 2,);
  //   achoppements.updateTableData('#scisors', 'ciseaux', ngrams.scisor, 2);

  //   const digrammes = document.getElementById('Digrammes');
  //   digrammes.updateTableData('#sku-digrams', 'SKU', ngrams.skb, 2);
  //   digrammes.updateTableData('#inward', 'rolls intérieur', ngrams.inwardRoll, 2);
  //   digrammes.updateTableData('#outward', 'rolls extérieur', ngrams.outwardRoll, 2);

  //   // Display trigrams
  //   showPercent('#almost-skb-all',   sum(ngrams.sks), 1, '#Trigrammes');
  //   showPercent('#almost-sfb-all',   sum(ngrams.sfs), 1, '#Trigrammes');
  //   showPercent('#redirect-all',     sum(ngrams.redirect), 1, '#Trigrammes');
  //   showPercent('#bad-redirect-all', sum(ngrams.badRedirect), 2, '#Trigrammes');

  //   const trigrammes = document.getElementById('Trigrammes');
  //   trigrammes.updateTableData('#almost-skbs', 'presque SKBs', ngrams.sks, 2);
  //   trigrammes.updateTableData('#almost-sfbs', 'presque SFBs', ngrams.sfs, 2);
  //   trigrammes.updateTableData('#redirect', 'redirections', ngrams.redirect, 2);
  //   trigrammes.updateTableData(
  //     '#bad-redirect',
  //     'mauvaises redirections',
  //     ngrams.badRedirect,
  //     2,
  //   );
  // };

  // // compute the heatmap for a text on a given layout
  // const computeHeatmap = () => {

  //   document.querySelector('#load stats-canvas').renderData({
  //     values: loadGroups,
  //     maxValue: 25,
  //     precision: 1
  //   });
  //   showPercentAll('#load small', loadGroups.map(sumUpBarGroup), 1);

  //   showPercent('#unsupported-all', totalUnsupportedChars, 3, '#Achoppements');

  //   document
  //     .getElementById('Achoppements')
  //     .updateTableData('#unsupported', 'non-support\u00e9', unsupportedChars, 3);
  // };

  // // keyboard state: these <select> element IDs match the x-keyboard properties
  // // -- but the `layout` property requires a JSON fetch
  // const IDs = ['layout', 'geometry', 'corpus'];
  // const setProp = (key, value) => {
  //   if (key === 'layout') {
  //     if (value) {
  //       fetch(`../layouts/${value}.json`)
  //         .then(response => response.json())
  //         .then(data => {
  //           inputField.placeholder = `zone de saisie ${value}`;
  //           keyboard.setKeyboardLayout(
  //             data.keymap,
  //             data.deadkeys,
  //             data.geometry.replace('ergo', 'iso'),
  //           );
  //           data.keymap.Enter = ['\r', '\n'];
  //           keyChars = supportedChars(data.keymap, data.deadkeys);
  //           computeHeatmap();
  //           computeNGrams();
  //         });
  //     } else {
  //       keyboard.setKeyboardLayout();
  //       keyChars = {};
  //       inputField.placeholder = 'select a keyboard layout';
  //     }
  //   } else if (key === 'corpus') {
  //     if (value && value !== corpusName) {
  //       fetch(`../corpus/${value}.json`)
  //         .then(response => response.json())
  //         .then(data => {
  //           corpus = data.symbols;
  //           digrams = data.digrams;
  //           trigrams = data.trigrams;
  //           if (Object.keys(keyChars).length > 0) {
  //             computeHeatmap();
  //             computeNGrams();
  //           }
  //         });
  //       corpusName = value;
  //     }
  //   } else {
  //     keyboard[key] = value;
  //   }
  //   document.getElementById(key).value = value;
  // };

  // // store the keyboard state in the URL hash like it's 1995 again! :-)
  // const state = {};
  // const updateHashState = (key, value) => {
  //   state[key] = value;
  //   window.location.hash = '/' +
  //     IDs.map(prop => state[prop]).join('/').replace(/\/+$/, '');
  // };

  // const applyHashState = () => {
  //   const hash = window.location.hash || '#/ergol//en+fr';
  //   const hashState = hash.split('/').slice(1);
  //   IDs.forEach((key, i) => {
  //     setProp(key, hashState[i] || '');
  //     state[key] = hashState[i] || '';
  //   });
  // };

  // IDs.forEach(key => {
  //   document
  //     .getElementById(key)
  //     .addEventListener('change', event =>
  //       updateHashState(key, event.target.value),
  //     );
  // });

  // window.addEventListener('hashchange', applyHashState);
  // applyHashState();
});
