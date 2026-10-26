/* ============================================================
   Логика страницы оплаты: валидация суммы и переход на qr.nspk.ru
   Настройки — в файле config.js
   ============================================================ */
"use strict";

(function () {
  // ---------- Конфигурация (из config.js, с безопасными значениями по умолчанию) ----------
  var CONFIG = {
    link: typeof SBP_QR_LINK === "string" ? SBP_QR_LINK.trim() : "",
    merchant: typeof MERCHANT_NAME === "string" ? MERCHANT_NAME.trim() : "",
    min: typeof MIN_AMOUNT === "number" && MIN_AMOUNT > 0 ? MIN_AMOUNT : 1,
    max: typeof MAX_AMOUNT === "number" && MAX_AMOUNT > 0 ? MAX_AMOUNT : 1000000,
  };

  // ---------- Элементы ----------
  var form = document.getElementById("pay-form");
  var amountInput = document.getElementById("amount");
  var errorEl = document.getElementById("amount-error");
  var hintEl = document.getElementById("amount-hint");
  var roundEl = document.getElementById("round-note");
  var roundTextEl = document.getElementById("round-note-text");
  var button = document.getElementById("pay-button");
  var buttonLabel = button.querySelector(".pay-button__label");
  var setupWarning = document.getElementById("setup-warning");
  var subtitle = document.getElementById("subtitle");

  var REDIRECT_DELAY_MS = 450;
  var redirectTimer = null;

  // ---------- Вспомогательные ----------
  function formatRub(value) {
    var formatted = new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 2,
    }).format(value);
    // Неразрывный пробел: сумма не отрывается от знака ₽ при переносе
    return formatted + "\u00A0₽";
  }

  function showError(message) {
    roundEl.hidden = true;
    errorEl.textContent = message;
    errorEl.hidden = false;
    hintEl.hidden = true;
    amountInput.setAttribute("aria-invalid", "true");
  }

  function clearError() {
    if (!errorEl.hidden) {
      errorEl.hidden = true;
      errorEl.textContent = "";
      if (roundEl.hidden) hintEl.hidden = false;
      amountInput.removeAttribute("aria-invalid");
    }
  }

  function showRoundNote(amountWhole) {
    errorEl.hidden = true;
    errorEl.textContent = "";
    amountInput.removeAttribute("aria-invalid");
    hintEl.hidden = true;
    roundTextEl.textContent =
      "Копейки округлены вниз — к оплате " + formatRub(amountWhole);
    roundEl.hidden = false;
  }

  function hideRoundNote() {
    if (!roundEl.hidden) {
      roundEl.hidden = true;
      roundTextEl.textContent = "";
      if (errorEl.hidden) hintEl.hidden = false;
    }
  }

  // ---------- Округление вниз ----------
  // Возвращает целое число рублей, если введённое значение дробное
  // и попадает в лимиты, иначе null
  function getRoundedWhole(raw) {
    var cleaned = String(raw).replace(/[\s\u00A0]/g, "").replace(",", ".");
    if (!/^\d+\.\d+$/.test(cleaned)) return null; // дробная часть отсутствует
    var value = Number(cleaned);
    var whole = Math.floor(value);
    if (!isFinite(value) || value <= 0 || whole === value) return null;
    if (whole < CONFIG.min || whole > CONFIG.max) return null;
    return whole;
  }

  function updateRoundNote() {
    var whole = getRoundedWhole(amountInput.value);
    if (whole !== null) {
      showRoundNote(whole);
    } else {
      hideRoundNote();
    }
  }

  // ---------- Валидация ----------
  // Копейки округляются ВНИЗ до целого рубля: 1500,90 → 1500 ₽
  function parseAmount(raw) {
    var cleaned = String(raw).replace(/[\s\u00A0]/g, "").replace(",", ".");
    if (!cleaned) {
      return { error: "Введите сумму — например, 1500" };
    }
    if (!/^\d+(\.\d*)?$/.test(cleaned)) {
      return { error: "Сумма должна быть числом — например, 1500 или 1500,50" };
    }
    var entered = Number(cleaned);
    if (!isFinite(entered) || entered <= 0) {
      return { error: "Введите сумму больше нуля" };
    }
    var value = Math.floor(entered);
    if (value < CONFIG.min) {
      return { error: "Минимальная сумма — " + formatRub(CONFIG.min) };
    }
    if (value > CONFIG.max) {
      return { error: "Максимальная сумма — " + formatRub(CONFIG.max) };
    }
    return { value: value };
  }

  // ---------- Ссылка СБП ----------
  function resolveSbpUrl() {
    if (!CONFIG.link) return null;
    var raw = CONFIG.link;
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    try {
      return new URL(raw);
    } catch (e) {
      return null;
    }
  }

  function buildSbpUrl(baseUrl, amountRub) {
    var url = new URL(baseUrl.toString());
    // СБП ожидает сумму в копейках; amountRub здесь уже целые рубли:
    // 1500 ₽ → sum=150000
    url.searchParams.set("sum", String(Math.round(amountRub * 100)));
    if (!url.searchParams.has("cur")) url.searchParams.set("cur", "RUB");
    return url.toString();
  }

  // ---------- Переход ----------
  function redirectTo(url) {
    button.disabled = true;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
    buttonLabel.textContent = "Открываем страницу оплаты…";
    redirectTimer = window.setTimeout(function () {
      window.location.href = url;
    }, REDIRECT_DELAY_MS);
  }

  function showSetupWarning() {
    setupWarning.hidden = false;
    setupWarning.focus();
  }

  // ---------- События ----------
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (button.disabled) return;

    var result = parseAmount(amountInput.value);
    if (result.error) {
      showError(result.error);
      amountInput.focus();
      return;
    }
    clearError();

    var base = resolveSbpUrl();
    if (!base) {
      showSetupWarning();
      return;
    }
    redirectTo(buildSbpUrl(base, result.value));
  });

  amountInput.addEventListener("input", function () {
    clearError();
    updateRoundNote();
  });

  amountInput.addEventListener("blur", function () {
    updateRoundNote();
    if (amountInput.value.trim() === "") return;
    var result = parseAmount(amountInput.value);
    if (result.error) {
      showError(result.error);
    }
  });

  // ---------- Инициализация ----------
  if (CONFIG.merchant) {
    subtitle.textContent = "Безопасный перевод через СБП — по QR-коду из приложения вашего банка. Заказ в: " + CONFIG.merchant;
  }

  // Предзаполнение суммы из адреса: ?amount=1500 или ?amount=1500.50
  var prefill = new URLSearchParams(window.location.search).get("amount");
  if (prefill) {
    amountInput.value = prefill.replace(",", ".").replace(/[^\d.]/g, "");
    updateRoundNote();
  }

  // Если ссылка ещё не настроена — предупреждение показываем
  // только при попытке оплаты, при загрузке ничего не выводим
  resolveSbpUrl();

  window.addEventListener("pagehide", function () {
    if (redirectTimer) window.clearTimeout(redirectTimer);
  });
})();
