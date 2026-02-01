const mapStatus = document.getElementById("map-status");
const locateMeButton = document.getElementById("locate-me");
const openLinkButton = document.getElementById("open-link-form");
const modal = document.getElementById("link-modal");
const closeModalButton = document.getElementById("close-modal");
const closeModalBottom = document.getElementById("close-modal-bottom");
const locationInput = document.getElementById("team-location");
const addressSuggestions = document.getElementById("address-suggestions");
const addressCombobox = locationInput ? locationInput.closest(".autocomplete") : null;
const clearAddressButton = addressCombobox
  ? addressCombobox.querySelector(".clear-btn")
  : null;
const linkForm = document.getElementById("link-form");

const accentColor =
  getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#e10600";
const defaultCenter = [39.8283, -98.5795];
const LRef = window.L;

const map = LRef ? LRef.map("map", { zoomControl: false }).setView(defaultCenter, 4) : null;
if (map && LRef) {
  LRef.control.zoom({ position: "bottomright" }).addTo(map);
  LRef.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
  }).addTo(map);
} else if (mapStatus) {
  mapStatus.textContent = "Map failed to load. Check your connection.";
}

let userMarker = null;

const setUserMarker = (coords) => {
  if (!map || !LRef) {
    if (mapStatus) {
      mapStatus.textContent = "Map is unavailable.";
    }
    return;
  }
  if (!userMarker) {
    userMarker = LRef.circleMarker(coords, {
      radius: 7,
      color: accentColor,
      fillColor: accentColor,
      fillOpacity: 0.9,
    }).addTo(map);
  } else {
    userMarker.setLatLng(coords);
  }
};

const toggleModal = (shouldOpen) => {
  if (!modal) {
    return;
  }
  modal.classList.toggle("show", shouldOpen);
  modal.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
};

if (openLinkButton) {
  openLinkButton.addEventListener("click", () => toggleModal(true));
}

if (closeModalButton) {
  closeModalButton.addEventListener("click", () => toggleModal(false));
}

if (closeModalBottom) {
  closeModalBottom.addEventListener("click", () => toggleModal(false));
}

if (linkForm) {
  linkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (mapStatus) {
      mapStatus.textContent = "Thanks! Your team info is recorded.";
    }
    linkForm.reset();
    toggleModal(false);
  });
}

if (modal) {
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      toggleModal(false);
    }
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleModal(false);
  }
});

window.addEventListener("load", () => {
  if (map) {
    map.invalidateSize({ animate: false });
  }
});

window.addEventListener("resize", () => {
  if (map) {
    map.invalidateSize({ animate: false });
  }
});

let addressTimer = null;
let lastAddressQuery = "";
let addressController = null;
let suggestionItems = [];
let activeSuggestionIndex = -1;

const clearAddressSuggestions = () => {
  if (addressSuggestions) {
    addressSuggestions.innerHTML = "";
    addressSuggestions.classList.remove("show");
  }
  if (addressCombobox) {
    addressCombobox.setAttribute("aria-expanded", "false");
  }
  suggestionItems = [];
  activeSuggestionIndex = -1;
};

const openSuggestions = () => {
  if (!addressSuggestions) {
    return;
  }
  if (suggestionItems.length === 0) {
    clearAddressSuggestions();
    return;
  }
  addressSuggestions.classList.add("show");
  if (addressCombobox) {
    addressCombobox.setAttribute("aria-expanded", "true");
  }
};

const applySuggestion = (value) => {
  if (!locationInput) {
    return;
  }
  locationInput.value = value;
  clearAddressSuggestions();
};

const renderSuggestions = () => {
  if (!addressSuggestions) {
    return;
  }
  addressSuggestions.innerHTML = "";
  suggestionItems.forEach((item, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "suggestion";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", index === activeSuggestionIndex ? "true" : "false");
    const parts = item.display_name.split(",");
    const title = parts.shift()?.trim() || item.display_name;
    const rest = parts.join(",").trim();
    button.textContent = title;
    if (rest) {
      const meta = document.createElement("small");
      meta.textContent = rest;
      button.appendChild(meta);
    }
    button.addEventListener("click", () => {
      applySuggestion(item.display_name);
    });
    addressSuggestions.appendChild(button);
  });
  openSuggestions();
};

const fetchAddressSuggestions = async (query) => {
  if (!addressSuggestions) {
    return;
  }
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    clearAddressSuggestions();
    return;
  }
  if (trimmed === lastAddressQuery) {
    return;
  }
  lastAddressQuery = trimmed;
  if (addressController) {
    addressController.abort();
  }
  addressController = new AbortController();
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  try {
    const response = await fetch(url.toString(), { signal: addressController.signal });
    if (!response.ok) {
      clearAddressSuggestions();
      return;
    }
    const data = await response.json();
    suggestionItems = data;
    activeSuggestionIndex = -1;
    renderSuggestions();
  } catch (error) {
    if (error.name !== "AbortError") {
      clearAddressSuggestions();
    }
  }
};

if (locationInput) {
  locationInput.addEventListener("input", (event) => {
    const value = event.target.value;
    if (addressTimer) {
      window.clearTimeout(addressTimer);
    }
    addressTimer = window.setTimeout(() => {
      fetchAddressSuggestions(value);
    }, 250);
  });

  locationInput.addEventListener("keydown", (event) => {
    if (!addressSuggestions || suggestionItems.length === 0) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestionItems.length;
      renderSuggestions();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeSuggestionIndex =
        activeSuggestionIndex <= 0 ? suggestionItems.length - 1 : activeSuggestionIndex - 1;
      renderSuggestions();
    } else if (event.key === "Enter") {
      if (activeSuggestionIndex >= 0) {
        event.preventDefault();
        applySuggestion(suggestionItems[activeSuggestionIndex].display_name);
      }
    } else if (event.key === "Escape") {
      clearAddressSuggestions();
    }
  });

  locationInput.addEventListener("focus", () => {
    if (suggestionItems.length > 0) {
      openSuggestions();
    }
  });

  locationInput.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (addressCombobox && !addressCombobox.contains(document.activeElement)) {
        clearAddressSuggestions();
      }
    }, 120);
  });
}

if (clearAddressButton && locationInput) {
  clearAddressButton.addEventListener("click", () => {
    locationInput.value = "";
    clearAddressSuggestions();
    locationInput.focus();
  });
}

document.addEventListener("click", (event) => {
  if (!addressCombobox || !addressSuggestions) {
    return;
  }
  if (!addressCombobox.contains(event.target)) {
    clearAddressSuggestions();
  }
});

if (locateMeButton) {
  locateMeButton.addEventListener("click", () => {
    if (!map) {
      if (mapStatus) {
        mapStatus.textContent = "Map is unavailable.";
      }
      return;
    }
    if (!navigator.geolocation) {
      if (mapStatus) {
        mapStatus.textContent = "Your browser does not support location services.";
      }
      return;
    }
    if (mapStatus) {
      mapStatus.textContent = "Locating you...";
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setUserMarker(coords);
        map.setView(coords, 11);
        if (mapStatus) {
          mapStatus.textContent = "Showing your location.";
        }
      },
      () => {
        if (mapStatus) {
          mapStatus.textContent = "Location permission denied.";
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
