function formatPesoText(text, keepComma) {
  const trailing = keepComma && !text.includes(".") && /\d,$/.test(text);
  const cleaned = text.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const whole = parts[0].replace(/^0+(?=\d)/, "");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (parts.length > 1) {
    return withCommas + "." + parts.slice(1).join("").slice(0, 2);
  }
  return trailing ? withCommas + "," : withCommas;
}

function reformat(input) {
  const caret = input.selectionStart;
  const digitsBefore = input.value
    .slice(0, caret)
    .replace(/[^\d.]/g, "").length;
  input.value = formatPesoText(input.value, true);
  if (input.value.endsWith(",")) {
    input.setSelectionRange(input.value.length, input.value.length);
    return;
  }
  let position = 0;
  let seen = 0;
  while (position < input.value.length && seen < digitsBefore) {
    if (/[\d.]/.test(input.value[position])) {
      seen += 1;
    }
    position += 1;
  }
  input.setSelectionRange(position, position);
}

function toCentavos(text) {
  const parts = text.replace(/,/g, "").split(".");
  const pesos = Number(parts[0] || 0);
  const centavos = Number(((parts[1] || "") + "00").slice(0, 2));
  return pesos * 100 + centavos;
}

function formatCentavos(value) {
  const pesos = Math.floor(value / 100);
  const centavos = value % 100;
  const suffix = centavos ? "." + String(centavos).padStart(2, "0") : "";
  return "₱" + pesos.toLocaleString("en-PH") + suffix;
}

document.addEventListener("focusout", function (event) {
  if (event.target.closest(".money")) {
    event.target.value = formatPesoText(event.target.value);
  }
});
