function initLinkCard(linkCardElement, linkModalOverlay) {
  const moreButton = linkCardElement.querySelector(".link-card__button--more");
  if (moreButton) {
    moreButton.addEventListener("click", () => {
      linkModalOverlay.classList.add("show");
      document.body.style.overflow = "hidden";
    });
  }
}

function initLinkModal(linkModalOverlay) {
  linkModalOverlay.addEventListener("click", (e) => {
    if (
      e.target === linkModalOverlay ||
      e.target.closest(".link-modal__close")
    ) {
      linkModalOverlay.classList.remove("show");
      document.body.style.overflow = "auto";
    }
  });
}
