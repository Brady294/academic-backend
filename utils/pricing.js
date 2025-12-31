function getPricePerPage(deadlineHours) {
  if (deadlineHours < 12) return 20;
  if (deadlineHours <= 24) return 15;
  if (deadlineHours <= 72) return 12;
  return 10;
}

function calculatePrice(pages, deadlineHours) {
  const pricePerPage = getPricePerPage(deadlineHours);
  const total = pages * pricePerPage;
  const deposit = total * 0.6; // 60% deposit

  return {
    pricePerPage,
    total,
    deposit,
  };
}

module.exports = { calculatePrice };
