/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AIRLINES, findAirlineByIata } from "@/lib/flight/airlineList";
import type { Airline } from "@/lib/flight/airlineList";
import styles from "./AirlineSelect.module.css";

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
    <div ref={containerRef} className={styles.container}>
      <div className={styles.inputWrapper}>
        {selectedAirline && !open && (
          <div className={styles.iataBadge}>{selectedAirline.iata}</div>
        )}

        <input
          ref={inputRef}
          type='text'
          value={displayValue}
          placeholder='Search airline...'
          className={`input emptySmall ${selectedAirline && !open ? styles.inputWithBadge : ""}`}
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
            className={styles.clearBtn}
            title='Clear airline'
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown list */}
      {open && (
        <div ref={listRef} className={styles.dropdown}>
          {filtered.length === 0 ? (
            <div className={styles.noResults}>
              No airlines match &ldquo;{search}&rdquo;
            </div>
          ) : (
            filtered.map((airline, i) => {
              const isHighlighted = i === highlightIndex;
              const isSelected = selectedAirline?.iata === airline.iata;

              return (
                <div
                  key={airline.iata}
                  data-airline-item
                  onClick={() => selectAirline(airline)}
                  onMouseEnter={() => setHighlightIndex(i)}
                  className={`${styles.airlineItem} ${isHighlighted ? styles.airlineItemHighlighted : ""} ${isSelected && !isHighlighted ? styles.airlineItemSelected : ""}`}
                >
                  <span
                    className={`${styles.airlineCode} ${isSelected ? styles.airlineCodeSelected : ""}`}
                  >
                    {airline.iata}
                  </span>
                  <span className={styles.airlineName}>{airline.name}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
