const FlipClock = (() => {
  const groups = {};
  let onFlipCallback = null;

  function createDigit(initialChar) {
    const root = document.createElement('div');
    root.className = 'flip-digit';
    root.dataset.value = initialChar;

    root.innerHTML =
      '<div class="flap top-static"><span>' + initialChar + '</span></div>' +
      '<div class="flap bottom-static"><span>' + initialChar + '</span></div>' +
      '<div class="flap top-flip"><span>' + initialChar + '</span></div>' +
      '<div class="flap bottom-flip"><span>' + initialChar + '</span></div>' +
      '<div class="hinge-line"></div>';

    return {
      el: root,
      topStatic: root.querySelector('.top-static span'),
      bottomStatic: root.querySelector('.bottom-static span'),
      topFlip: root.querySelector('.top-flip span'),
      bottomFlip: root.querySelector('.bottom-flip span'),
      current: initialChar,
      timer: null
    };
  }

  function flipDigit(slot, nextChar, animate) {
    if (slot.current === nextChar) return false;

    if (slot.timer) {
      clearTimeout(slot.timer);
      slot.timer = null;
      slot.el.classList.remove('flipping');
      slot.bottomStatic.textContent = slot.current;
    }

    const prevChar = slot.current;
    slot.current = nextChar;
    slot.el.dataset.value = nextChar;

    if (!animate) {
      slot.topStatic.textContent = nextChar;
      slot.bottomStatic.textContent = nextChar;
      slot.topFlip.textContent = nextChar;
      slot.bottomFlip.textContent = nextChar;
      return false;
    }

    slot.topStatic.textContent = nextChar;
    slot.bottomStatic.textContent = prevChar;
    slot.topFlip.textContent = prevChar;
    slot.bottomFlip.textContent = nextChar;

    slot.el.classList.remove('flipping');
    void slot.el.offsetWidth;
    slot.el.classList.add('flipping');

    slot.timer = setTimeout(() => {
      slot.bottomStatic.textContent = nextChar;
      slot.el.classList.remove('flipping');
      slot.timer = null;
    }, 520);

    return true;
  }

  function mount(containerMap, onFlip) {
    onFlipCallback = onFlip || null;
    Object.keys(containerMap).forEach((key) => {
      const container = containerMap[key];
      container.innerHTML = '';
      const slots = [createDigit('0'), createDigit('0')];
      slots.forEach((s) => container.appendChild(s.el));
      groups[key] = { container, slots };
    });
  }

  function setGroupValue(key, num, animate) {
    const group = groups[key];
    if (!group) return false;

    const str = String(Math.max(0, Math.floor(num))).padStart(2, '0');

    while (group.slots.length < str.length) {
      const extra = createDigit('0');
      group.slots.unshift(extra);
      group.container.insertBefore(extra.el, group.container.firstChild);
    }

    while (group.slots.length > Math.max(2, str.length)) {
      const removed = group.slots.shift();
      removed.el.remove();
    }

    let changed = false;
    for (let i = 0; i < str.length; i++) {
      if (flipDigit(group.slots[i], str[i], animate)) {
        changed = true;
      }
    }
    return changed;
  }

  function update(values, animate = true) {
    let anyFlipped = false;
    Object.keys(values).forEach((key) => {
      if (setGroupValue(key, values[key], animate)) {
        anyFlipped = true;
      }
    });
    if (anyFlipped && onFlipCallback) {
      onFlipCallback();
    }
  }

  return { mount, update };
})();
