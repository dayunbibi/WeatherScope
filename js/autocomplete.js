const DEBOUNCE_DELAY_MS = 100;

function debounce(callback, delay) {
  let timeoutId = null;

  return (...args) => {
    window.clearTimeout(timeoutId);

    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

function buildLocationLabel(location) {
  return [
    location.name,
    location.state,
    location.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function createSuggestionElement(location, index) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "autocomplete-option";
  button.id = `citySuggestion-${index}`;
  button.dataset.index = String(index);
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", "false");

  const cityName = document.createElement("span");
  cityName.className = "autocomplete-city";
  cityName.textContent = location.name;

  const details = document.createElement("span");
  details.className = "autocomplete-details";
  details.textContent = [
    location.state,
    location.country,
  ]
    .filter(Boolean)
    .join(", ");

  button.append(cityName);

  if (details.textContent) {
    button.append(details);
  }

  return button;
}

export function createCityAutocomplete({
  inputElement,
  panelElement,
  fetchSuggestions,
  onSelect,
}) {
  let suggestions = [];
  let activeIndex = -1;
  let requestId = 0;

  function closePanel() {
    suggestions = [];
    activeIndex = -1;

    panelElement.replaceChildren();
    panelElement.hidden = true;

    inputElement.setAttribute("aria-expanded", "false");
    inputElement.removeAttribute("aria-activedescendant");
  }

  function updateActiveOption() {
    const options = panelElement.querySelectorAll(
      ".autocomplete-option"
    );

    options.forEach((option, index) => {
      const isActive = index === activeIndex;

      option.classList.toggle("active", isActive);
      option.setAttribute(
        "aria-selected",
        String(isActive)
      );

      if (isActive) {
        inputElement.setAttribute(
          "aria-activedescendant",
          option.id
        );

        option.scrollIntoView({
          block: "nearest",
        });
      }
    });

    if (activeIndex < 0) {
      inputElement.removeAttribute(
        "aria-activedescendant"
      );
    }
  }

  function renderSuggestions(locations) {
    panelElement.replaceChildren();

    suggestions = locations;
    activeIndex = -1;

    if (!suggestions.length) {
      const empty = document.createElement("p");

      empty.className = "autocomplete-message";
      empty.textContent = "No matching cities found.";

      panelElement.append(empty);
      panelElement.hidden = false;

      inputElement.setAttribute(
        "aria-expanded",
        "true"
      );

      return;
    }

    const fragment = document.createDocumentFragment();

    suggestions.forEach((location, index) => {
      fragment.append(
        createSuggestionElement(location, index)
      );
    });

    panelElement.append(fragment);
    panelElement.hidden = false;

    inputElement.setAttribute(
      "aria-expanded",
      "true"
    );
  }

  function selectSuggestion(index) {
    const location = suggestions[index];

    if (!location) {
      return;
    }

    inputElement.value = buildLocationLabel(location);

    closePanel();
    onSelect(location);
  }

  async function searchSuggestions(query) {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      closePanel();
      return;
    }

    const currentRequestId = ++requestId;

    panelElement.replaceChildren();

    const loading = document.createElement("p");
    loading.className = "autocomplete-message";
    loading.textContent = "Searching cities…";

    panelElement.append(loading);
    panelElement.hidden = false;

    inputElement.setAttribute(
      "aria-expanded",
      "true"
    );

    try {
      const locations =
        await fetchSuggestions(normalizedQuery);

      if (currentRequestId !== requestId) {
        return;
      }

      renderSuggestions(locations);
    } catch (error) {
      if (currentRequestId !== requestId) {
        return;
      }

      panelElement.replaceChildren();

      const errorMessage =
        document.createElement("p");

      errorMessage.className =
        "autocomplete-message autocomplete-error";

      errorMessage.textContent =
        error instanceof Error
          ? error.message
          : "Unable to search cities.";

      panelElement.append(errorMessage);
      panelElement.hidden = false;

      inputElement.setAttribute(
        "aria-expanded",
        "true"
      );
    }
  }

  const debouncedSearch = debounce(
    searchSuggestions,
    DEBOUNCE_DELAY_MS
  );

  inputElement.addEventListener("input", () => {
    debouncedSearch(inputElement.value);
  });

  inputElement.addEventListener(
    "keydown",
    (event) => {
      if (panelElement.hidden) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();

        activeIndex =
          activeIndex < suggestions.length - 1
            ? activeIndex + 1
            : 0;

        updateActiveOption();
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();

        activeIndex =
          activeIndex > 0
            ? activeIndex - 1
            : suggestions.length - 1;

        updateActiveOption();
      }

      if (
        event.key === "Enter" &&
        activeIndex >= 0
      ) {
        event.preventDefault();
        selectSuggestion(activeIndex);
      }

      if (event.key === "Escape") {
        closePanel();
      }
    }
  );

  panelElement.addEventListener(
    "mousedown",
    (event) => {
      event.preventDefault();
    }
  );

  panelElement.addEventListener(
    "click",
    (event) => {
      const option = event.target.closest(
        ".autocomplete-option"
      );

      if (!option) {
        return;
      }

      selectSuggestion(
        Number(option.dataset.index)
      );
    }
  );

  document.addEventListener("click", (event) => {
    if (
      event.target !== inputElement &&
      !panelElement.contains(event.target)
    ) {
      closePanel();
    }
  });

  inputElement.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (
        !panelElement.contains(
          document.activeElement
        )
      ) {
        closePanel();
      }
    }, 100);
  });

  return {
    close: closePanel,
  };
}