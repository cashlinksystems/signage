const inProgressList = document.querySelector('#inProgressList');
const readyList = document.querySelector('#readyList');
const connectionError = document.querySelector('#connectionError');
const promotionFrame = document.querySelector('#promotionFrame');

let pollIntervalMs = 5000;

function loadPromotion() {
  const promotionUrl = window.TV_CONFIG?.promotionUrl || 'promo-combo.html';
  promotionFrame.src = new URL(promotionUrl, window.location.href).toString();
}

function renderOrders(container, orders) {
  container.replaceChildren();

  if (!orders.length) {
    return;
  }

  for (const order of orders) {
    const item = document.createElement('div');
    item.className = 'order';
    item.textContent = String(order.number || '').slice(2);
    container.append(item);
  }
}

async function refreshOrders() {
  try {
    const response = await fetch('/api/orders', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const inProgress = data.orders.folyamatban || [];
    const ready = data.orders.elkeszult || [];

    pollIntervalMs = data.pollIntervalMs || pollIntervalMs;
    renderOrders(inProgressList, inProgress);
    renderOrders(readyList, ready);
    connectionError.hidden = true;
  } catch (error) {
    connectionError.hidden = false;
  } finally {
    window.setTimeout(refreshOrders, pollIntervalMs);
  }
}

loadPromotion();
refreshOrders();
