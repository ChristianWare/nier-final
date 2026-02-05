/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIRLINES, findAirlineByIata } from "@/lib/flight/airlineList";
import type { Airline } from "@/lib/flight/airlineList";

type Props = {
  /** Current airline name value */
  value: string;
  /** Called with the full airline name when selected */
  onChange: (airlineName: string) => void;
  /** Called with the IATA code when an airline is selected (for pre-filling flight number) */
  onAirlineCodeSelected?: (iataCode: string) => void;
};

export default function AirlineSelect({
  value,
  onChange,
  onAirlineCodeSelected,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Filter airlines based on search
  const filtered = useMemo<Airline[]>(() => {
    if (!search.trim()) return AIRLINES;
    const q = search.toLowerCase().trim();
    return AIRLINES.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.iata.toLowerCase().includes(q),
    );
  }, [search]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-airline-item]");
      items[highlightIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex]);

  const selectAirline = useCallback(
    (airline: Airline) => {
      onChange(airline.name);
      onAirlineCodeSelected?.(airline.iata);
      setSearch("");
      setOpen(false);
      setHighlightIndex(-1);
    },
    [onChange, onAirlineCodeSelected],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          e.preventDefault();
          setOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev < filtered.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightIndex((prev) =>
            prev > 0 ? prev - 1 : filtered.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (highlightIndex >= 0 && filtered[highlightIndex]) {
            selectAirline(filtered[highlightIndex]);
          }
          break;
        case "Escape":
          setOpen(false);
          setHighlightIndex(-1);
          break;
        case "Tab":
          setOpen(false);
          setHighlightIndex(-1);
          break;
      }
    },
    [open, filtered, highlightIndex, selectAirline],
  );

  // Determine display value
  const displayValue = open ? search : value;

  // Find if current value matches an airline (for showing the code badge)
  const selectedAirline = value
    ? (AIRLINES.find((a) => a.name.toLowerCase() === value.toLowerCase()) ??
      null)
    : null;

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        {/* IATA badge inside input */}
        {selectedAirline && !open && (
          <div
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "#e0e7ff",
              color: "#3730a3",
              fontWeight: 700,
              fontSize: "1.1rem",
              padding: "2px 7px",
              borderRadius: 4,
              letterSpacing: "0.05em",
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            {selectedAirline.iata}
          </div>
        )}

        <input
          ref={inputRef}
          type='text'
          value={displayValue}
          placeholder='Search airline...'
          className='input emptySmall'
          style={selectedAirline && !open ? { paddingLeft: 48 } : undefined}
          onFocus={() => {
            setOpen(true);
            setSearch(value || "");
          }}
          onChange={(e) => {
            setSearch(e.target.value);
            setHighlightIndex(-1);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete='off'
        />

        {/* Clear button */}
        {value && !open && (
          <button
            type='button'
            onClick={() => {
              onChange("");
              setSearch("");
              inputRef.current?.focus();
              setOpen(true);
            }}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.4rem",
              color: "#94a3b8",
              padding: "2px 4px",
              lineHeight: 1,
            }}
            title='Clear airline'
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown list */}
      {open && (
        <div
          ref={listRef}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            maxHeight: 240,
            overflowY: "auto",
            background: "white",
            border: "1px solid rgba(0,0,0,0.15)",
            borderTop: "none",
            borderRadius: "0 0 8px 8px",
            zIndex: 100,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "12px 14px",
                fontSize: "1.2rem",
                color: "#94a3b8",
              }}
            >
              No airlines match &ldquo;{search}&rdquo;
            </div>
          ) : (
            filtered.map((airline, i) => (
              <div
                key={airline.iata}
                data-airline-item
                onClick={() => selectAirline(airline)}
                onMouseEnter={() => setHighlightIndex(i)}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: "1.3rem",
                  background:
                    i === highlightIndex
                      ? "#f1f5f9"
                      : selectedAirline?.iata === airline.iata
                        ? "#f0f7ff"
                        : "transparent",
                  transition: "background 0.1s ease",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 32,
                    padding: "2px 6px",
                    background:
                      selectedAirline?.iata === airline.iata
                        ? "#3730a3"
                        : "#e2e8f0",
                    color:
                      selectedAirline?.iata === airline.iata
                        ? "white"
                        : "#475569",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    borderRadius: 4,
                    letterSpacing: "0.05em",
                    flexShrink: 0,
                  }}
                >
                  {airline.iata}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {airline.name}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
