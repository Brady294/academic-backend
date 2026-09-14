function getBasePricePerPage(academicLevel) {
  const level = academicLevel?.toLowerCase().trim();

  switch (level) {
    case "high school":
    case "highschool":
      return 10;

    case "university":
    case "undergraduate":
      return 12;

    case "masters":
    case "master":
    case "master's":
      return 18;

    default:
      throw new Error("Invalid academic level.");
  }
}

function getDeadlineMultiplier(deadlineHours) {
  if (deadlineHours < 12) {
    return 2.0;
  }

  if (deadlineHours <= 24) {
    return 1.5;
  }

  if (deadlineHours <= 72) {
    return 1.2;
  }

  return 1.0;
}

function calculatePrice(
  pages,
  academicLevel,
  deadlineHours
) {
  const basePricePerPage =
    getBasePricePerPage(academicLevel);

  const deadlineMultiplier =
    getDeadlineMultiplier(deadlineHours);

  const pricePerPage =
    basePricePerPage * deadlineMultiplier;

  const total =
    pages * pricePerPage;

  const deposit =
    total * 0.6;

  const balance =
    total - deposit;

  return {
    basePricePerPage,
    deadlineMultiplier,
    pricePerPage,
    total,
    deposit,
    balance,
  };
}

module.exports = {
  getBasePricePerPage,
  getDeadlineMultiplier,
  calculatePrice,
};