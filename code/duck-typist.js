/**
 * WebTypist v3 (preview) a.k.a. DuckTypist.
 * https://github.com/OneDeadKey/webtypist
 *
 * Copyleft (C) 2010-2024, Fabien & Léo Cazenave.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const QUACK = new Audio('quack.wav');
const MIN_PRECISION  = 98;  // percentage of correct keys
const MIN_CPM_SPEED  = 100; // characters per minute
const MIN_WIN_STREAK = 5;

const STARTING_LEVEL = 4;      // number of keys to begin with
const MIN_WORD_COUNT = 42;     // nim number or words/ngrams we want for a lesson
const INCLUDE_NEW_LETTERS = 2; // at least of the n last letters should be included in each word

const ALL_30_KEYS = [
  'KeyF', 'KeyJ',
  'KeyD', 'KeyK',
  'KeyS', 'KeyL',
  'KeyA', 'Semicolon',
  'KeyE', 'KeyI',
  'KeyW', 'KeyO',
  'KeyV', 'KeyM',
  'KeyG', 'KeyH',
  'KeyQ', 'KeyP',
  'KeyR', 'KeyU',
  'KeyT', 'KeyY',
  'KeyB', 'KeyN',
  'KeyC', 'Comma',
  'KeyX', 'Period',
  'KeyZ', 'Slash',
];

window.addEventListener('DOMContentLoaded', () => {
  'use strict'; // eslint-disable-line

  const gKeyboard = document.querySelector('x-keyboard');
  const gGeometry = document.querySelector('#geometry');
  const gLayout   = document.querySelector('#layout');
  const gDict     = document.querySelector('#dict');

  const gKeyList  = document.querySelector('.key_list');
  const gStatus   = document.querySelector('.status');
  const gQuacks   = document.querySelector('.quacks');
  const gLesson   = document.querySelector('#lesson');
  const gInput    = document;
  const gCustomText = document.querySelector('#custom-text');
  const gUseCustomText = document.querySelector('#use-custom-text');
  const gClearCustomText = document.querySelector('#clear-custom-text');
  const gToggleCustomText = document.querySelector('#toggle-custom-text');
  const gCustomTextPanel = document.querySelector('#custom-text-panel');

  let gKeyLayout = undefined;
  let gDictionary = {
    words:    undefined,
    trigrams: undefined,
    bigrams:  undefined,
  };

  let gLessonWords     = [];
  let gLessonCurrent   = undefined;
  let gLessonStartTime = undefined;
  let gLessonLevel     = undefined;
  let gQuackCount      = undefined
  let gPendingError    = false;
  let gCustomLessonText = null; // Store custom text for lessons

  // fetch a kalamine corpus: symbols, bigrams, trigrams
  const fetchNgrams = () => {
    const ngrams = gDict.value.split(',')[0];
    return fetch(`../corpus/${ngrams}.json`)
      .then(response => response.json())
      .then(data => {
        gDictionary.trigrams = Object.keys(data.trigrams);
        gDictionary.bigrams = Object.keys(data.digrams);
      });
  };

  // fetch MonkeyType words
  const fetchWords = () => {
    const words = gDict.value.split(',')[1];
    return fetch(`./${words}.json`)
      .then(response => response.json())
      .then(data => {
        gDictionary.words = data.words;
      });
  };

  // fetch a kalamine keyboard layout
  const fetchLayout = () => {
    const selected = gLayout.querySelector(`option[value="${gLayout.value}"`);
    return fetch(`../keymaps/${selected.dataset.folder}/${gLayout.value}.json`)
      .then(response => response.json())
      .then(layout => {
        gKeyboard.setKeyboardLayout(layout.keymap, layout.deadkeys, gGeometry.value);
        gKeyboard.theme = 'hints';
        gKeyLayout = layout;
      });
  };

  const setLessonLevel = () => {
    localStorage.setItem(`${gLayout.value}.level`, gLessonLevel);

    const keys = ALL_30_KEYS.slice(0, gLessonLevel);
    const rawLetters = keys.map(key => gKeyLayout.keymap[key][0]);
    const altLetters = keys.flatMap(key => gKeyLayout.keymap[key]);

    const odk = gKeyLayout.deadkeys['**'];
    const has1dk = keys.some(key => gKeyLayout.keymap[key].indexOf('**') >= 0);
    const deadkeyLetters = !has1dk ? [] :
      rawLetters
        .filter(letter => letter in odk)
        .map(letter => odk[letter]);

    const lessonLetters = rawLetters.concat(deadkeyLetters).join('');
    const newLettersCount = gLessonLevel == STARTING_LEVEL ? STARTING_LEVEL : INCLUDE_NEW_LETTERS;
    const newLetters = rawLetters.slice(-newLettersCount).join('');
    const lessonRe = new RegExp(`^[${lessonLetters}]*[${newLetters}][${lessonLetters}]*$`)
    const lessonFilter = word => lessonRe.test(word)

    gLessonWords = [];
    for (const dict of [
      gDictionary.words, gDictionary.trigrams, gDictionary.bigrams, rawLetters
    ]) {
      gLessonWords = gLessonWords.concat(dict.filter(lessonFilter));
      if (gLessonWords.length > MIN_WORD_COUNT) {
        break;
      }
    }

    showQuackStatus();
    showLesson();
    showKeys();
  };

  const showKeys = () => {
    const isActive = idx => idx >= 0 && idx < gLessonLevel;

    const serializeKey = (key, idx) => {
      const action = gKeyLayout.keymap[key][0];
      const char = action === '**' ? '★' : action.slice(-1);
      const state = isActive(idx) ? '' : 'inactive';
      return `<kbd data-level="${idx + 1}" class="${state}">${char}</kbd>`;
    };
    gKeyList.innerHTML = ALL_30_KEYS.map(serializeKey).join('');

    gKeyboard.keys.forEach(key => {
      key.style.opacity = isActive(ALL_30_KEYS.indexOf(key.id)) ? 1.0 : 0.5;
    });
  };

  const showLesson = () => {
    gLessonStartTime = undefined;
    gLesson.innerHTML = '';
    
    let lessonText = '';
    
    if (gCustomLessonText) {
      // Use custom text
      lessonText = gCustomLessonText;
    } else {
      // Use original word-based lesson
      if (gLessonWords.length === 0) {
        return;
      }
      
      while(lessonText.length < 120) {
        lessonText += gLessonWords[gLessonWords.length * Math.random() | 0] + ' ';
      }
      lessonText = lessonText.slice(0, -1); // Remove trailing space
    }
    
    // Convert text to spans while preserving formatting
    gLesson.innerHTML = Array.from(lessonText)
      .map(char => {
        if (char === ' ') {
          return '<span class="space">·</span>';
        } else if (char === '\n') {
          return '<span class="carriage-return">↵</span><br>';
        } else if (char === '\r') {
          return '<span class="carriage-return">↵</span><br>';
        } else if (char === '\t') {
          return '<span class="tab">→</span><span class="tab-spacing">&nbsp;&nbsp;&nbsp;&nbsp;</span>';
        } else {
          // Escape HTML characters
          const escaped = char.replace(/&/g, '&amp;')
                             .replace(/</g, '&lt;')
                             .replace(/>/g, '&gt;')
                             .replace(/"/g, '&quot;')
                             .replace(/'/g, '&#39;');
          return `<span>${escaped}</span>`;
        }
      })
      .join('');

    gLessonCurrent = gLesson.firstElementChild;
    if (gLessonCurrent) {
      gLessonCurrent.id = 'current';
    }
    gPendingError = false;
    
    // Reset scroll position to top
    gLesson.scrollTop = 0;
  };

  const goNextChar = value => {
    if (!gLessonCurrent) {
      return;
    }

    // Handle different types of elements
    let correctChar = false;
    
    if (gLessonCurrent.classList.contains('carriage-return')) {
      // Line break - check for Enter key
      correctChar = value === '\n' || value === '\r';
    } else if (gLessonCurrent.classList.contains('space')) {
      // Space character
      correctChar = value === ' ';
    } else if (gLessonCurrent.classList.contains('tab')) {
      // Tab character
      correctChar = value === '\t';
    } else {
      // Regular character - compare with the actual text content
      correctChar = gLessonCurrent.textContent === value;
    }

    if (!correctChar && !gLessonStartTime) {
      return; // ignore errors on first char
    }

    if (correctChar) {
      gLessonCurrent.classList.add(gPendingError ? 'fixed' : 'done');
      gLessonCurrent.id = '';
      
      // Skip the next element if it's a BR (for carriage returns) or tab-spacing
      let nextElement = gLessonCurrent.nextSibling;
      if (nextElement && (nextElement.tagName === 'BR' || nextElement.classList?.contains('tab-spacing'))) {
        nextElement = nextElement.nextSibling;
      }
      
      gLessonCurrent = nextElement;
      gPendingError = false;
    } else {
      gLessonCurrent.classList.add('error');
      gPendingError = true;
    }

    if (!gLessonStartTime) { // first char?
      gLessonStartTime = performance.now()
      gStatus.innerText = '…';
    }
    if (gLessonCurrent) { // next char
      gLessonCurrent.id = 'current';
      // Auto-scroll to keep current character in view
      scrollToCurrentChar();
    } else { // last char, compute stats
      showLessonStatus(performance.now());
      gLessonStartTime = undefined;
    }
  };

  const scrollToCurrentChar = () => {
    if (!gLessonCurrent) return;
    
    try {
      // Get the current character's position relative to the lesson container
      const currentRect = gLessonCurrent.getBoundingClientRect();
      const lessonRect = gLesson.getBoundingClientRect();
      
      // Calculate relative position within the scrollable container
      const relativeTop = currentRect.top - lessonRect.top;
      const relativeBottom = relativeTop + currentRect.height;
      
      // Check if we need to scroll
      const containerHeight = gLesson.clientHeight;
      const scrollTop = gLesson.scrollTop;
      
      // If current character is below visible area (with some margin)
      if (relativeBottom > containerHeight - 20) {
        // Scroll to keep the character in view, positioned in upper portion
        const targetScroll = scrollTop + relativeBottom - containerHeight * 0.7;
        gLesson.scrollTop = Math.max(0, targetScroll);
      }
      // If current character is above visible area
      else if (relativeTop < 20) {
        // Scroll up to show the character with some margin
        const targetScroll = scrollTop + relativeTop - 20;
        gLesson.scrollTop = Math.max(0, targetScroll);
      }
    } catch (e) {
      // Fallback: if getBoundingClientRect fails, try simple scrollIntoView
      if (gLessonCurrent.scrollIntoView) {
        gLessonCurrent.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'nearest'
        });
      }
    }
  };

  const showLessonStatus = (now) => {
    const elapsed = (now - gLessonStartTime) / 60000;
    const errors = gLesson.querySelectorAll('.error').length;
    const words = gLesson.querySelectorAll('.space').length + 1;
    const chars = gLesson.children.length;
    const cpm = Math.round(chars / elapsed);
    const wpm = Math.round(cpm / 5);
    const prc = 100 - Math.round(1000 * errors / chars) / 10;
    gStatus.innerHTML = `${wpm} wpm, ${cpm} cpm <progress value="${cpm}" max="${MIN_CPM_SPEED}">${cpm}</progress>, ${prc} % <progress value="${prc}" max="${MIN_PRECISION}">${prc}%</progress>`;

    if (cpm >= MIN_CPM_SPEED && prc >= MIN_PRECISION) {
      moreQuacks();
    } else {
      lessQuacks();
    }
  };

  const moreQuacks = () => {
    QUACK.play();
    gQuackCount++;
    showQuackStatus();

    if (gQuackCount >= MIN_WIN_STREAK) {
      gLessonLevel = 2 * (Math.floor(gLessonLevel / 2) + 1); // next even number
      gQuackCount = 1;
      gQuacks.parentNode.classList.add('active');
      setTimeout(setLessonLevel, 500);
    } else {
      setTimeout(showLesson, 500);
    }

  };

  const lessQuacks = () => {
    gQuackCount = Math.max(1, gQuackCount -1);
    showQuackStatus();
    setTimeout(showLesson, 500);
  };

  const showQuackStatus = () => {
    localStorage.setItem(`${gLayout.value}.quacks`, gQuackCount);
    gQuacks.parentNode.classList.remove('active');
    gQuacks.innerText = Array(gQuackCount).fill('🦆').join('');
  };

  gQuacks.addEventListener('transitionend', showQuackStatus);
  gQuacks.addEventListener('dblclick', moreQuacks); // cheat code!

  // Toggle custom text panel
  gToggleCustomText.addEventListener('click', () => {
    const isVisible = gCustomTextPanel.style.display !== 'none';
    gCustomTextPanel.style.display = isVisible ? 'none' : 'block';
    gToggleCustomText.style.background = isVisible ? '#f0f0f0' : '#007acc';
    gToggleCustomText.style.color = isVisible ? '#333' : 'white';
  });

  // Custom text functionality
  gUseCustomText.addEventListener('click', () => {
    const customText = gCustomText.value.trim();
    if (customText) {
      gCustomLessonText = customText;
      gLesson.classList.add('custom-text-mode');
      gToggleCustomText.textContent = '📝 Custom Text (Active)';
      gToggleCustomText.style.background = '#28a745';
      gToggleCustomText.style.color = 'white';
      showLesson();
    }
  });

  gClearCustomText.addEventListener('click', () => {
    gCustomText.value = '';
    gCustomLessonText = null;
    gLesson.classList.remove('custom-text-mode');
    gToggleCustomText.textContent = '📝 Custom Text';
    gToggleCustomText.style.background = '#f0f0f0';
    gToggleCustomText.style.color = '#333';
    showLesson();
  });

  // Allow Enter key in textarea to trigger use custom text
  gCustomText.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      gUseCustomText.click();
    }
  });

  // startup
  const loadLayout = () => {
    const layout   = window.location.hash.slice(1);
    const dict     = localStorage.getItem('dict');
    const geometry = localStorage.getItem('geometry');
    const level    = localStorage.getItem(`${gLayout.value}.level`);
    const quacks   = localStorage.getItem(`${gLayout.value}.quacks`);

    if (layout)   gLayout.value   = layout;
    if (dict)     gDict.value     = dict;
    if (geometry) gGeometry.value = geometry;
    gLessonLevel = level  ? Number(level)  : STARTING_LEVEL;
    gQuackCount  = quacks ? Number(quacks) : 1;

    window.location.hash = `#${gLayout.value}`;

    Promise.all([fetchNgrams(), fetchWords(), fetchLayout()])
      .then(setLessonLevel);
  };

  window.addEventListener('hashchange', loadLayout);
  gLayout.addEventListener('change', () => {
    window.location.hash = `#${gLayout.value}`;
  });

  gDict.addEventListener('change', () => {
    localStorage.setItem('dict', gDict.value);
    Promise.all([fetchNgrams(), fetchWords()]).then(setLessonLevel);
  });

  gGeometry.addEventListener('change', event => {
    localStorage.setItem('geometry', gGeometry.value);
    gKeyboard.geometry = gGeometry.value;
  });

  gKeyList.addEventListener('click', event => {
    if (event.target.nodeName.toLowerCase() == 'kbd') {
      gLessonLevel = event.target.dataset.level;
      setLessonLevel();
    }
  });

  loadLayout();

  /**
   * Keyboard highlighting & layout emulation
   */

  // required to work around a Chrome bug, see the `keyup` listener below
  const pressedKeys = {};

  // highlight keyboard keys and emulate the selected layout
  gInput.onkeydown = event => {
    // Don't intercept events when typing in the custom text area
    if (event.target === gCustomText) {
      return true;
    }
    
    pressedKeys[event.code] = true;
    
    // Handle special keys for custom text mode
    if (gCustomLessonText) {
      if (event.key === 'Enter') {
        goNextChar('\n');
        return false;
      } else if (event.key === 'Tab') {
        event.preventDefault();
        goNextChar('\t');
        return false;
      }
    }
    
    const value = gKeyboard.keyDown(event);

    if (value) {
      goNextChar(value);
    } else {
      return true; // don't intercept special keys or key shortcuts
    }
    return false; // event has been consumed, stop propagation
  };

  gInput.addEventListener('keyup', event => {
    // Don't intercept events when typing in the custom text area
    if (event.target === gCustomText) {
      return true;
    }
    
    if (pressedKeys[event.code]) { // expected behavior
      gKeyboard.keyUp(event);
      delete pressedKeys[event.code];
    } else {
      /**
       * We got a `keyup` event for a key that did not trigger any `keydown`
       * event first: this is a known bug with "real" dead keys on Chrome.
       * As a workaround, emulate a keydown + keyup. This introduces some lag,
       * which can result in a typo (especially when the "real" dead key is used
       * for an emulated dead key) -- but there's not much else we can do.
       */
      // output.innerText += gKeyboard.keyDown(event);
      goNextChar(event.value);
      setTimeout(() => gKeyboard.keyUp(event), 100);
    }
  });

  /**
   * When pressing a "real" dead key + key sequence, Firefox and Chrome will
   * add the composed character directly to the text input (and nicely trigger
   * an `insertCompositionText` or `insertText` input event, respectively).
   * Not sure wether this is a bug or not -- but this is not the behavior we
   * want for a keyboard layout emulation. The code below works around that.
   */
  gInput.addEventListener('input', event => {
    if (
      event.inputType === 'insertCompositionText' ||
      event.inputType === 'insertText'
    ) {
      event.target.value = event.target.value.slice(0, -event.data.length);
    }
  });
});
