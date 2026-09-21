/** Share the same accessible work/education icon across cards and map tooltips. */
window.CategoryIcon = (type) => {
  const label = Portfolio.escape(Portfolio.t(type));
  return `<span class="category-icon" role="img" aria-label="${label}" title="${label}">${Icons.svg(PORTFOLIO_RUNTIME.categoryIcons[type])}</span>`;
};
