"use client";

import { DatePicker } from "@/components/shared/DatePicker";
import { useState } from "react";
import ReportModal from "@/components/admin/ReportModal/ReportModal";
import styles from "./AdminReportsPage.module.css";

type ReportType = "income" | "tax" | "drivers" | "operations" | "corporate";

const TYPES: { value: ReportType; label: string; about: string }[] = [
  {
    value: "income",
    label: "Income summary",
    about:
      "Money received by payment date: fares, tips, refunds, and every payment.",
  },
  {
    value: "tax",
    label: "Tax year package",
    about:
      "One ZIP for your accountant: a summary PDF plus CSVs of payments, refunds, driver pay and corporate invoices for the year.",
  },
  {
    value: "drivers",
    label: "Driver pay statements",
    about:
      "Pay and tips per driver for completed rides, ready to send or file for 1099 prep.",
  },
  {
    value: "operations",
    label: "Bookings & operations",
    about:
      "Rides, completion, cancellations, no-shows, lead time and peak times.",
  },
  {
    value: "corporate",
    label: "Corporate invoices",
    about:
      "Invoices issued to corporate accounts: invoiced, paid and outstanding.",
  },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function ReportBuilder({
  years,
  defaultYear,
  defaultMonth,
  drivers,
}: {
  years: string[];
  defaultYear: string;
  /** "01".."12" */
  defaultMonth: string;
  drivers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ReportType>("income");
  const [period, setPeriod] = useState("month");
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [quarter, setQuarter] = useState(
    String(Math.floor((Number(defaultMonth) - 1) / 3) + 1),
  );
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [basis, setBasis] = useState("pickup");
  const [driver, setDriver] = useState("all");
  const [summary, setSummary] = useState(true);
  const [charts, setCharts] = useState(true);
  const [tables, setTables] = useState(true);
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");

  const isTax = type === "tax";
  const rangeIncomplete = !isTax && period === "range" && (!from || !to);
  const about = TYPES.find((t) => t.value === type)?.about;

  function generate() {
    const q = new URLSearchParams({ type, format: isTax ? "zip" : format });
    q.set("period", isTax ? "year" : period);
    q.set("year", year);
    if (!isTax && period === "month") q.set("month", month);
    if (!isTax && period === "quarter") q.set("quarter", quarter);
    if (!isTax && period === "range") {
      q.set("from", from);
      q.set("to", to);
    }
    if (type === "operations") q.set("basis", basis);
    if (type === "drivers") q.set("driver", driver);
    if (!isTax && format === "pdf") {
      if (!summary) q.set("summary", "0");
      if (!charts) q.set("charts", "0");
      if (!tables) q.set("tables", "0");
    }
    window.location.assign(`/admin/reports/export?${q.toString()}`);
  }

  const field = (label: string, control: React.ReactNode) => (
    <label className={styles.builderField}>
      <span className='miniNote'>{label}</span>
      {control}
    </label>
  );

  return (
    <>
      <button
        type='button'
        className='rangeSubmitBtn'
        onClick={() => setOpen(true)}
      >
        Build a report
      </button>

      {open ? (
        <ReportModal
          title='Build a report'
          onClose={() => setOpen(false)}
          footer={
            <>
              <button
                type='button'
                className='tab'
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type='button'
                className='rangeSubmitBtn'
                onClick={generate}
                disabled={rangeIncomplete}
              >
                {isTax
                  ? "Download tax package (ZIP)"
                  : `Generate ${format.toUpperCase()}`}
              </button>
            </>
          }
        >
          <div className={styles.builderGrid}>
            {field(
              "Report",
              <select
                className='selectBorder emptySmall'
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>,
            )}
            {isTax
              ? field(
                  "Tax year",
                  <select
                    className='selectBorder emptySmall'
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>,
                )
              : field(
                  "Period",
                  <select
                    className='selectBorder emptySmall'
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option value='month'>Month</option>
                    <option value='quarter'>Quarter</option>
                    <option value='year'>Year</option>
                    <option value='range'>Date range</option>
                    <option value='all'>All time</option>
                  </select>,
                )}
          </div>
          {about ? <p className='miniNote'>{about}</p> : null}

          {!isTax && period !== "all" ? (
            <div className={styles.builderGrid}>
              {period !== "range"
                ? field(
                    "Year",
                    <select
                      className='selectBorder emptySmall'
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                    >
                      {years.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>,
                  )
                : null}
              {period === "month"
                ? field(
                    "Month",
                    <select
                      className='selectBorder emptySmall'
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={m} value={String(i + 1).padStart(2, "0")}>
                          {m}
                        </option>
                      ))}
                    </select>,
                  )
                : null}
              {period === "quarter"
                ? field(
                    "Quarter",
                    <select
                      className='selectBorder emptySmall'
                      value={quarter}
                      onChange={(e) => setQuarter(e.target.value)}
                    >
                      <option value='1'>Q1 (Jan–Mar)</option>
                      <option value='2'>Q2 (Apr–Jun)</option>
                      <option value='3'>Q3 (Jul–Sep)</option>
                      <option value='4'>Q4 (Oct–Dec)</option>
                    </select>,
                  )
                : null}
              {period === "range" ? (
                <>
                  {field(
                    "From",
                    <DatePicker
                      className='selectBorder'
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />,
                  )}
                  {field(
                    "To",
                    <DatePicker
                      className='selectBorder'
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />,
                  )}
                </>
              ) : null}
            </div>
          ) : null}

          {type === "operations" || type === "drivers" ? (
            <div className={styles.builderGrid}>
              {type === "operations"
                ? field(
                    "Count rides by",
                    <select
                      className='selectBorder emptySmall'
                      value={basis}
                      onChange={(e) => setBasis(e.target.value)}
                    >
                      <option value='pickup'>Pickup date</option>
                      <option value='created'>Booked date</option>
                    </select>,
                  )
                : field(
                    "Driver",
                    <select
                      className='selectBorder emptySmall'
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                    >
                      <option value='all'>All drivers</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>,
                  )}
            </div>
          ) : null}

          {!isTax ? (
            <>
              <div className={styles.builderGrid}>
                {field(
                  "Format",
                  <select
                    className='selectBorder emptySmall'
                    value={format}
                    onChange={(e) => setFormat(e.target.value as "pdf" | "csv")}
                  >
                    <option value='pdf'>PDF (with charts)</option>
                    <option value='csv'>CSV (opens in Excel)</option>
                  </select>,
                )}
              </div>
              {format === "pdf" ? (
                <div className={styles.builderChecks}>
                  <span className='miniNote'>Include</span>
                  <label>
                    <input
                      type='checkbox'
                      checked={summary}
                      onChange={(e) => setSummary(e.target.checked)}
                    />{" "}
                    Summary cards
                  </label>
                  <label>
                    <input
                      type='checkbox'
                      checked={charts}
                      onChange={(e) => setCharts(e.target.checked)}
                    />{" "}
                    Charts
                  </label>
                  <label>
                    <input
                      type='checkbox'
                      checked={tables}
                      onChange={(e) => setTables(e.target.checked)}
                    />{" "}
                    Detail tables
                  </label>
                </div>
              ) : null}
            </>
          ) : null}
        </ReportModal>
      ) : null}
    </>
  );
}
