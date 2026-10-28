const monthFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

// Annotate the first card of each month without changing the query's ordering.
export function addMatchMonthHeadings(matches) {
  const months = matches.map((match) => {
    const parts = monthFormatter.formatToParts(new Date(match.date));
    const month = parts.find((part) => part.type === "month").value;
    const year = parts.find((part) => part.type === "year").value;
    return `${month} ${year}`;
  });
  const counts = new Map();
  months.forEach((month) => counts.set(month, (counts.get(month) || 0) + 1));

  return matches.map((match, index) => ({
    ...match,
    monthHeading: index === 0 || months[index] !== months[index - 1]
      ? { label: months[index], count: counts.get(months[index]) }
      : null,
  }));
}
