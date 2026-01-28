"use client";

import { useState } from "react";
import styles from "./DriverSupportPage.module.css";

const FAQ_ITEMS = [
  {
    question: "How do I start a trip?",
    answer: `<p>When you're ready to begin a trip:</p>
<ul>
<li>Go to your Dashboard and find the trip in "Next Trip" or "My Trips"</li>
<li>Tap on the trip to open the trip details</li>
<li>Press the "I'm En Route" button when you're heading to pickup</li>
<li>Use the navigation links to get directions in your preferred maps app</li>
</ul>`,
  },
  {
    question: "What if the customer doesn't show up?",
    answer: `<p>If the customer is not at the pickup location:</p>
<ul>
<li>First, mark that you've "Arrived" at the pickup location</li>
<li>Wait for 15 minutes — the app will show a countdown timer</li>
<li>Try calling or texting the customer using the contact buttons</li>
<li>After 15 minutes, you can mark the trip as "No-Show"</li>
<li>Contact dispatch if you need guidance</li>
</ul>
<p>You'll still receive compensation for no-show trips per company policy.</p>`,
  },
  {
    question: "How do I contact the customer?",
    answer: `<p>On the trip details page, you'll see the customer's contact information:</p>
<ul>
<li>Tap "Call" to directly dial the customer</li>
<li>Tap "Text" to send them an SMS</li>
</ul>
<p>If no phone number is available, contact dispatch and they can reach out to the customer for you.</p>`,
  },
  {
    question: "When and how do I get paid?",
    answer: `<p>Payment details:</p>
<ul>
<li>Driver payments are processed weekly</li>
<li>Pay period runs Sunday through Saturday</li>
<li>Payments are deposited the following Friday</li>
<li>View your earnings anytime in the "Earnings" section</li>
</ul>
<p>If you have questions about a specific payment, contact the office during business hours.</p>`,
  },
  {
    question: "What should I do in case of an accident?",
    answer: `<p>If you're involved in an accident:</p>
<ul>
<li><strong>First, ensure everyone's safety</strong> — check on passengers and other parties</li>
<li>Call 911 if anyone is injured or there's significant damage</li>
<li>Call our Emergency Line immediately</li>
<li>Take photos of all vehicles, damage, and the scene</li>
<li>Exchange information with other drivers (name, insurance, plate number)</li>
<li>Get a police report if officers respond</li>
<li>Do not admit fault or discuss details with other parties</li>
</ul>
<p>Our team will guide you through the next steps once you call in.</p>`,
  },
  {
    question: "How do I handle customer complaints?",
    answer: `<p>If a customer has a complaint during a trip:</p>
<ul>
<li>Stay calm and professional</li>
<li>Listen to their concern and apologize for any inconvenience</li>
<li>If it's something you can resolve, do so</li>
<li>If not, let them know you'll report it to the office</li>
<li>After the trip, contact dispatch to document the issue</li>
</ul>
<p>Never argue with customers — let the office handle disputes.</p>`,
  },
  {
    question: "What if my app isn't working?",
    answer: `<p>Try these steps:</p>
<ul>
<li>Close and reopen the app</li>
<li>Check your internet connection (try switching between WiFi and cellular)</li>
<li>Refresh the page or clear your browser cache</li>
<li>Try logging out and back in</li>
</ul>
<p>If the problem persists, call dispatch and they can update trip statuses manually until the issue is resolved.</p>`,
  },
  {
    question: "How do I update my availability or schedule?",
    answer: `<p>Currently, scheduling is handled by the dispatch team:</p>
<ul>
<li>Call or text dispatch to update your availability</li>
<li>Give as much notice as possible for schedule changes</li>
<li>For time-off requests, contact the office at least 48 hours in advance</li>
</ul>
<p>Self-service scheduling may be added in a future update.</p>`,
  },
  {
    question: "What are the vehicle inspection requirements?",
    answer: `<p>Before each shift, complete a quick vehicle inspection:</p>
<ul>
<li>Check tire pressure and condition</li>
<li>Verify all lights are working (headlights, brake lights, turn signals)</li>
<li>Check fluid levels (oil, coolant, washer fluid)</li>
<li>Ensure the interior is clean and presentable</li>
<li>Confirm the vehicle registration and insurance are current and in the vehicle</li>
</ul>
<p>Report any issues to the office immediately. Don't drive a vehicle with safety concerns.</p>`,
  },
];

export default function DriverSupportFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggleItem(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <div className={styles.faqList}>
      {FAQ_ITEMS.map((item, index) => (
        <div key={index} className={styles.faqItem}>
          <button
            className={styles.faqButton}
            onClick={() => toggleItem(index)}
            aria-expanded={openIndex === index}
          >
            <span className={styles.faqQuestion}>{item.question}</span>
            <span
              className={`${styles.faqIcon} ${openIndex === index ? styles.faqIconOpen : ""}`}
            >
              +
            </span>
          </button>
          {openIndex === index && (
            <div
              className={styles.faqAnswer}
              dangerouslySetInnerHTML={{ __html: item.answer }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
