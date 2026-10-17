"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map from "@/components/Map";
import { supabase } from "@/lib/supabaseClient";

const EMPTY_FORM = {
  teamName: "",
  teamNumber: "",
  meetingLocation: "",
  contactInfo: "",
  description: "",
};

const geocodeAddress = async (address) => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: {
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error("Unable to reach the geocoding service.");
  }

  const data = await response.json();
  if (!data.length) {
    throw new Error("Address not found. Try adding a city or zip code.");
  }

  return {
    lat: Number.parseFloat(data[0].lat),
    lng: Number.parseFloat(data[0].lon),
    displayName: data[0].display_name,
  };
};

export default function Home() {
  const [teams, setTeams] = useState([]);
  const [mapStatus, setMapStatus] = useState("Drop in to see FTC teams near you.");
  const [userLocation, setUserLocation] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [formStatus, setFormStatus] = useState("");
  const [authStatus, setAuthStatus] = useState("");
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [isAddressFocused, setIsAddressFocused] = useState(false);
  const autocompleteRef = useRef(null);
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchTeams = useCallback(async () => {
    if (!supabase) {
      setMapStatus("Supabase is not configured. Add env vars to enable data.");
      setTeams([]);
      return;
    }
    setMapStatus("Loading teams...");
    const { data, error } = await supabase
      .from("teams")
      .select(
        "id, name, team_number, description, address, apply_link, lat, lng, user_id, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setMapStatus("Unable to load teams right now.");
      setTeams([]);
      return;
    }

    // Hide a seeded (unowned) listing once the real team has linked itself.
    const claimedNumbers = new Set(
      (data || []).filter((team) => team.user_id).map((team) => team.team_number)
    );
    const normalized = (data || [])
      .filter((team) => team.user_id || !claimedNumbers.has(team.team_number))
      .map((team) => ({
        ...team,
        lat: Number(team.lat),
        lng: Number(team.lng),
      }));
    setTeams(normalized);
    setMapStatus(
      normalized.length
        ? `Showing ${normalized.length} teams on the map.`
        : "No teams on the map yet."
    );
  }, [supabase]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams, supabase]);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data?.session ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      fetchTeams();
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchTeams]);

  useEffect(() => {
    if (!isAddressFocused) {
      return;
    }

    const query = formData.meetingLocation.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "6");

      try {
        const response = await fetch(url.toString(), { signal: controller.signal });
        if (!response.ok) {
          setAddressSuggestions([]);
          setShowSuggestions(false);
          return;
        }
        const data = await response.json();
        setAddressSuggestions(data || []);
        setActiveSuggestionIndex(-1);
        setShowSuggestions(Boolean(data?.length));
      } catch (error) {
        if (error.name !== "AbortError") {
          setAddressSuggestions([]);
          setShowSuggestions(false);
        }
      }
    }, 250);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [formData.meetingLocation, isAddressFocused]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setMapStatus("Your browser does not support location services.");
      return;
    }

    setMapStatus("Locating you...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setMapStatus("Showing teams near your location.");
      },
      () => {
        setMapStatus("Location permission denied.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpenLink = () => {
    if (!session) {
      setAuthStatus("Sign in to add your team.");
      setShowAuthModal(true);
      return;
    }
    setFormStatus("");
    setFormData(EMPTY_FORM);
    setShowLinkModal(true);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    if (!supabase) {
      setAuthStatus("Supabase is not configured.");
      return;
    }
    if (!email.trim()) {
      setAuthStatus("Enter a valid email address.");
      return;
    }
    setAuthStatus("Sending magic link...");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      setAuthStatus(error.message);
      return;
    }

    setAuthStatus("Check your inbox for the sign-in link.");
    setEmail("");
  };

  const handleSignOut = async () => {
    if (!supabase) {
      setAuthStatus("Supabase is not configured.");
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthStatus("Unable to sign out right now.");
    } else {
      setAuthStatus("Signed out.");
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const selectSuggestion = (suggestion) => {
    setFormData((prev) => ({ ...prev, meetingLocation: suggestion.display_name }));
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const handleAddressKeyDown = (event) => {
    if (!showSuggestions || addressSuggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev + 1 >= addressSuggestions.length ? 0 : prev + 1
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev <= 0 ? addressSuggestions.length - 1 : prev - 1
      );
    } else if (event.key === "Enter") {
      if (activeSuggestionIndex >= 0) {
        event.preventDefault();
        selectSuggestion(addressSuggestions[activeSuggestionIndex]);
      }
    } else if (event.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!session) {
      setFormStatus("Sign in to add your team.");
      return;
    }
    if (!supabase) {
      setFormStatus("Supabase is not configured.");
      return;
    }

    const { teamName, teamNumber, meetingLocation, contactInfo, description } = formData;
    if (!teamName || !teamNumber || !meetingLocation || !contactInfo || !description) {
      setFormStatus("Please fill in every field.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormStatus("Looking up the address...");
      const geo = await geocodeAddress(meetingLocation);
      setFormStatus("Saving your team...");

      const { error } = await supabase.from("teams").insert({
        name: teamName,
        team_number: teamNumber,
        description,
        address: geo.displayName || meetingLocation,
        apply_link: contactInfo,
        lat: geo.lat,
        lng: geo.lng,
        user_id: session.user.id,
      });

      if (error) {
        throw new Error(error.message);
      }

      await fetchTeams();
      setFormStatus("Team added!");
      setFormData(EMPTY_FORM);
      setShowLinkModal(false);
    } catch (error) {
      setFormStatus(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!supabase) {
      setMapStatus("Supabase is not configured.");
      return;
    }
    const confirmed = window.confirm("Delete this team listing?");
    if (!confirmed) {
      return;
    }
    const { error } = await supabase.from("teams").delete().eq("id", teamId);
    if (error) {
      setMapStatus("Unable to delete this team right now.");
      return;
    }
    setMapStatus("Team removed.");
    fetchTeams();
  };

  const isSignedIn = Boolean(session);
  const authButtonLabel = isSignedIn ? "Account" : "Sign in";
  const myTeams = isSignedIn
    ? teams.filter((team) => team.user_id === session?.user?.id)
    : [];

  return (
    <>
      <div className="page">
        <header className="hero">
          <button
            className="btn ghost auth-trigger"
            onClick={() => {
              setAuthStatus("");
              setShowAuthModal(true);
            }}
          >
            {authButtonLabel}
          </button>
          <p className="eyebrow">Powered by Ninjabotics</p>
          <h1>FTCConnect</h1>
          <p className="subtitle">Find and connect with FTC teams in your area.</p>
          {isSignedIn && session?.user?.email ? (
            <p className="status-line">Signed in as {session.user.email}</p>
          ) : null}
        </header>

        <section className="map-wrap" aria-label="FTC team map">
          <Map teams={teams} userLocation={userLocation} userRadiusMiles={15} />
          <div className="map-overlay">{mapStatus}</div>
        </section>

        <div className="cta-row">
          <button className="btn ghost" onClick={handleLocate}>
            Use my location
          </button>
          <button className="btn primary" onClick={handleOpenLink}>
            Link your team
          </button>
        </div>

        {isSignedIn ? (
          <section className="my-teams" aria-label="Your teams">
            <div className="my-teams-header">
              <h2>Your teams</h2>
              <p>{myTeams.length ? `${myTeams.length} listing(s)` : "No teams yet."}</p>
            </div>
            <div className="my-team-list">
              {myTeams.length ? (
                myTeams.map((team) => (
                  <div className="my-team-card" key={team.id}>
                    <div>
                      <h3>
                        {team.name} {team.team_number ? `#${team.team_number}` : ""}
                      </h3>
                      <span>{team.address}</span>
                    </div>
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => handleDeleteTeam(team.id)}
                    >
                      Delete
                    </button>
                  </div>
                ))
              ) : (
                <p className="my-team-empty">Link your team to see it here.</p>
              )}
            </div>
          </section>
        ) : null}
      </div>

      <div className={`modal ${showLinkModal ? "show" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-card">
          <div className="modal-header">
            <h2>Link your team</h2>
            <button className="icon-btn" onClick={() => setShowLinkModal(false)} aria-label="Close">
              &times;
            </button>
          </div>
          <form className="link-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="team-name">Team Name</label>
              <input
                id="team-name"
                name="teamName"
                type="text"
                placeholder="e.g. RoboHawks"
                value={formData.teamName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="team-number">Team Number</label>
              <input
                id="team-number"
                name="teamNumber"
                type="text"
                placeholder="e.g. 1234"
                value={formData.teamNumber}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="team-location">Meeting Location</label>
              <div
                className="autocomplete"
                ref={autocompleteRef}
                role="combobox"
                aria-expanded={showSuggestions}
                aria-owns="address-suggestions"
              >
                <input
                  id="team-location"
                  name="meetingLocation"
                  type="search"
                  placeholder="Start typing an address"
                  value={formData.meetingLocation}
                  onChange={handleInputChange}
                  onKeyDown={handleAddressKeyDown}
                  onFocus={() => setIsAddressFocused(true)}
                  onBlur={() => {
                    setIsAddressFocused(false);
                    setShowSuggestions(false);
                  }}
                  autoComplete="off"
                  aria-autocomplete="list"
                  aria-controls="address-suggestions"
                  required
                />
                <button
                  className="clear-btn"
                  type="button"
                  aria-label="Clear address"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      meetingLocation: "",
                    }))
                  }
                >
                  &times;
                </button>
                <div
                  className={`suggestions ${showSuggestions ? "show" : ""}`}
                  id="address-suggestions"
                  role="listbox"
                >
                  {addressSuggestions.map((item, index) => {
                    const parts = item.display_name.split(",");
                    const title = parts.shift()?.trim() || item.display_name;
                    const rest = parts.join(",").trim();
                    return (
                      <button
                        key={`${item.place_id}-${index}`}
                        type="button"
                        className={`suggestion ${
                          index === activeSuggestionIndex ? "active" : ""
                        }`}
                        role="option"
                        aria-selected={index === activeSuggestionIndex}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectSuggestion(item)}
                      >
                        {title}
                        {rest ? <small>{rest}</small> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="field">
              <label htmlFor="team-contact">Application link or contact info</label>
              <input
                id="team-contact"
                name="contactInfo"
                type="text"
                placeholder="https://... or @discord / email / phone"
                value={formData.contactInfo}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="field full">
              <label htmlFor="team-description">Description</label>
              <textarea
                id="team-description"
                name="description"
                rows="3"
                placeholder="What makes your team special?"
                value={formData.description}
                onChange={handleInputChange}
                required
              ></textarea>
            </div>
            {formStatus ? <p className="form-note full">{formStatus}</p> : null}
            <div className="modal-actions full">
              <button className="btn primary" type="submit" disabled={!isSignedIn || isSubmitting}>
                {isSubmitting ? "Saving..." : "Submit"}
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() => setShowLinkModal(false)}
              >
                Close
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`modal ${showAuthModal ? "show" : ""}`} role="dialog" aria-modal="true">
        <div className="modal-card small auth-card">
          <div className="modal-header">
            <h2>Account</h2>
            <button className="icon-btn" onClick={() => setShowAuthModal(false)} aria-label="Close">
              &times;
            </button>
          </div>
          {isSignedIn ? (
            <div className="auth-row">
              <p className="auth-status">Signed in as {session?.user?.email || "User"}</p>
              <button className="btn ghost" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
              <button className="btn primary" type="submit">
                Send magic link
              </button>
              {authStatus ? <p className="auth-status">{authStatus}</p> : null}
            </form>
          )}
        </div>
      </div>
    </>
  );
}
