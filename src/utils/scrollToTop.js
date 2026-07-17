export function scrollPageToTop({ behavior = "smooth" } = {}) {
  const scrollOptions = { top: 0, left: 0, behavior };
  const scrollElement = (element) => {
    if (!element) return;

    if (typeof element.scrollTo === "function") {
      element.scrollTo(scrollOptions);
      return;
    }

    element.scrollTop = 0;
    element.scrollLeft = 0;
  };

  const scroll = () => {
    window.scrollTo(scrollOptions);
    scrollElement(document.documentElement);
    scrollElement(document.body);
    document
      .querySelectorAll(".academic-audit-main, .admin-audit-main, .review-dashboard-main")
      .forEach(scrollElement);
  };

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(scroll);
  });
}
