"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Clock, Search } from "lucide-react";
import { locations } from "@/lib/data/locations";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { useCartActions, useCartState } from "@/context/cart-context";

// Great-circle distance in miles between two lat/lng points.
function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LocationFinder() {
  const router = useRouter();
  const { fulfillment } = useCartState();
  const { setFulfillment, setPickupLocation } = useCartActions();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter(
      (l) => l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
    );
  }, [query]);

  const [detecting, setDetecting] = useState(false);
  const [nearestId, setNearestId] = useState<string | null>(null);
  // False when we couldn't locate the user and are just suggesting a default kitchen.
  const [nearestIsReal, setNearestIsReal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function detectNearest() {
    setDetecting(true);
    setStatusMessage("Finding closest Ember kitchen...");

    // Without a position we can't claim anything is "nearest" — say what we're showing.
    const showDefault = (reason: string) => {
      setDetecting(false);
      setNearestId(locations[0].id);
      setNearestIsReal(false);
      setStatusMessage(`${reason} Showing our ${locations[0].name.replace(/^Ember /, "")} kitchen.`);
    };

    if (!navigator.geolocation) {
      showDefault("Location isn't available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDetecting(false);
        const { latitude, longitude } = position.coords;
        const withDistance = locations.map((loc) => ({
          loc,
          distance: haversineMiles(latitude, longitude, loc.lat, loc.lng),
        }));
        withDistance.sort((a, b) => a.distance - b.distance);
        const nearest = withDistance[0];
        setNearestId(nearest.loc.id);
        setNearestIsReal(true);
        setStatusMessage(`Nearest to you: ${nearest.loc.name} (${nearest.distance.toFixed(1)} mi)`);
      },
      () => showDefault("We couldn't get your location."),
      { timeout: 5000 }
    );
  }

  function orderHere(locationId: string) {
    // Choosing a kitchen to order from means picking up there.
    setFulfillment("pickup");
    setPickupLocation(locationId);
    router.push("/menu");
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28" id="locations">
      <SectionHeading label="Find Us" title="Good food. Closer than you think." />

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-cream/15 bg-charcoal-raised px-4 py-3">
          <Search size={16} className="text-cream/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by neighborhood or address"
            className="focus-ring w-full bg-transparent text-sm text-cream placeholder:text-cream/60"
            aria-label="Search locations"
          />
        </div>
        <div className="flex gap-2">
          {(["delivery", "pickup"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFulfillment(mode)}
              aria-pressed={fulfillment === mode}
              className={
                "focus-ring flex-1 rounded-full px-5 py-3 font-display text-xs font-bold uppercase tracking-wider transition-all active:scale-95 " +
                (fulfillment === mode ? "bg-ember-fill text-cream" : "border border-cream/10 bg-charcoal-raised text-cream/60")
              }
            >
              {mode}
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          size="md"
          className="shrink-0"
          onClick={detectNearest}
          disabled={detecting}
        >
          {detecting ? "Locating..." : "Find a Location"}
        </Button>
      </div>

      {/* Always mounted so screen readers announce message changes. */}
      <div role="status">
      {statusMessage && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-cream">
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="focus-ring text-cream/60 transition-colors hover:text-cream"
          >
            Dismiss
          </button>
        </div>
      )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((loc) => {
          const isNearest = loc.id === nearestId;
          return (
            <div
              key={loc.id}
              className={`flex flex-col gap-3 rounded-3xl bg-charcoal-raised p-5 transition-all ${
                isNearest
                  ? "border border-ember ring-2 ring-ember/20 shadow-lg bg-ember/10"
                  : "border border-cream/10"
              } sm:flex-row sm:items-center sm:justify-between`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-display text-base font-extrabold text-cream">{loc.name}</p>
                  {isNearest && (
                    <span className="rounded-full bg-ember-fill px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cream">
                      {nearestIsReal ? "Nearest" : "Suggested"}
                    </span>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-cream/60">
                  <MapPin size={14} /> {loc.address} · {loc.distanceMiles} mi
                </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-cream/60">
                <Clock size={14} /> {loc.hours}
              </p>
              <p className="mt-1 text-xs font-semibold text-cream/60">
                {loc.deliveryAvailable ? `Delivery available · Pickup ${loc.pickupEta}` : `Pickup only · ${loc.pickupEta}`}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => orderHere(loc.id)}
              className="shrink-0"
              aria-label={`Order pickup from ${loc.name}`}
            >
              Order Here
            </Button>
          </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-2 py-8 text-center text-sm text-cream/60">
            No locations match &ldquo;{query}&rdquo;.
          </p>
        )}
      </div>
    </section>
  );
}
