"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { JoinAsTeacherAction } from "@/components/join-as-teacher-action";
import { defaultHomepageShowcaseConfig, loadHomepageShowcaseConfig, type HomepageShowcaseConfig } from "@/lib/mock-db";

const subjectCards = [
  { name: "Mathematics", count: "24 tutors available" },
  { name: "Science", count: "18 tutors available" },
  { name: "Chemistry", count: "12 tutors available" },
  { name: "Physics", count: "16 tutors available" },
  { name: "English", count: "20 tutors available" },
  { name: "Biology", count: "10 tutors available" },
  { name: "Hindi", count: "22 tutors available" },
  { name: "Computer Sci.", count: "8 tutors available" },
];

const howSteps = [
  {
    title: "Search your locality",
    description: "Filter by subject, grade, board and price.",
  },
  {
    title: "Review verified profiles",
    description: "Check experience, subjects and availability before deciding.",
  },
  {
    title: "Connect directly",
    description: "Reach out and continue on WhatsApp.",
  },
];

const whyItems = [
  {
    icon: "LOC",
    iconClass: "wi-saffron",
    title: "Truly hyperlocal",
    description: "Every tutor is listed with area details for practical matching.",
  },
  {
    icon: "DOC",
    iconClass: "wi-green",
    title: "Manually verified",
    description: "Teacher documents are reviewed before public listing.",
  },
  {
    icon: "FEE",
    iconClass: "wi-blue",
    title: "Zero commission",
    description: "Docent does not deduct commissions from parents or teachers.",
  },
  {
    icon: "REV",
    iconClass: "wi-purple",
    title: "Real reviews only",
    description: "Review access is tied to signed-in accounts.",
  },
];

export default function HomePage() {
  const [showcase, setShowcase] = useState<HomepageShowcaseConfig>(defaultHomepageShowcaseConfig);

  useEffect(() => {
    setShowcase(loadHomepageShowcaseConfig());
  }, []);

  function subjectQuery(subjectName: string) {
    if (subjectName === "Mathematics") return "Maths";
    if (subjectName === "Computer Sci.") return "Computer Science";
    return subjectName;
  }

  return (
    <div>
      <div className="page-section">
        <section className="hero">
          <div className="hero-accent" />
          <div className="hero-accent2" />

          <div className="hero-left">
            <div className="hero-eyebrow">
              <div className="hero-eyebrow-dot" />
              <span>Hyperlocal · Verified · Trusted in Mathura</span>
            </div>

            <h1 className="hero-headline">
              Find the <em>right</em><br />
              home tutor <span className="underline-word">near</span><br />
              you.
            </h1>

            <p className="hero-sub">
              Docent helps families discover local tutors filtered by subject, grade, locality, and budget.
            </p>

            <form action="/browse" className="hero-search">
              <input name="subject" className="search-field" placeholder="What subject?" />
              <div className="search-divider" />
              <input name="locality" className="search-field" placeholder="Which area?" />
              <button type="submit" className="search-btn">Find Tutors</button>
            </form>

            <div className="hero-tags">
              <span>Popular:</span>
              <span className="tag">Maths Class 10</span>
              <span className="tag">Physics JEE</span>
              <span className="tag">English CBSE</span>
              <span className="tag">Hindi UP Board</span>
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-right-label">Featured Today</div>

            <div className="featured-card">
              <div className="featured-card-top">
                <div className="teacher-avatar">{showcase.cards[0]?.initials ?? "NA"}</div>
                <div className="teacher-meta">
                  <h4>{showcase.cards[0]?.name ?? "Teacher"}</h4>
                  <p>{showcase.cards[0]?.locality ?? "Mathura"}</p>
                </div>
              </div>
              <div className="featured-card-pills">
                {(showcase.cards[0]?.tags ?? []).map((tag) => (
                  <span key={tag} className="pill">{tag}</span>
                ))}
              </div>
              <div className="featured-card-footer">
                <div className="price">₹{showcase.cards[0]?.price ?? 0} <span>/ month</span></div>
                <div className="rating">
                  <span className="rating-star">Rating</span>
                  <span className="rating-val">{(showcase.cards[0]?.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="featured-card">
              <div className="featured-card-top">
                <div className="teacher-avatar green">{showcase.cards[1]?.initials ?? "NA"}</div>
                <div className="teacher-meta">
                  <h4>{showcase.cards[1]?.name ?? "Teacher"}</h4>
                  <p>{showcase.cards[1]?.locality ?? "Mathura"}</p>
                </div>
              </div>
              <div className="featured-card-pills">
                {(showcase.cards[1]?.tags ?? []).map((tag) => (
                  <span key={tag} className="pill">{tag}</span>
                ))}
              </div>
              <div className="featured-card-footer">
                <div className="price">₹{showcase.cards[1]?.price ?? 0} <span>/ month</span></div>
                <div className="rating">
                  <span className="rating-star">Rating</span>
                  <span className="rating-val">{(showcase.cards[1]?.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="hero-stats">
              {(showcase.stats ?? []).map((item) => (
                <div key={item.label} className="stat-item">
                  <span className="stat-num">{item.value}</span>
                  <span className="stat-label">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="page-section" id="subjects">
        <div className="subjects-section">
          <p className="section-eyebrow text-white/35">Browse by subject</p>
          <h2 className="subjects-title">Every subject,<br /><em>one platform.</em></h2>
          <p className="subjects-sub">Click any subject to see available tutors in your area</p>
          <div className="subjects-grid">
            {subjectCards.map((item) => (
              <Link key={item.name} href={`/browse?subject=${encodeURIComponent(subjectQuery(item.name))}`} className="subject-card">
                <div className="subject-name">{item.name}</div>
                <div className="subject-count">{item.count}</div>
                <div className="subject-arrow">View</div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="page-section" id="how-it-works">
        <div className="section-padding">
          <div className="how-grid">
            <div>
              <p className="section-eyebrow">For parents</p>
              <h2 className="section-title">As easy as asking<br />a <em>neighbour.</em></h2>
              <p className="mt-6 max-w-[420px] text-[15px] leading-8 text-[var(--muted)]">Find, compare, and contact tutors without broker calls.</p>
            </div>
            <div className="how-steps">
              {howSteps.map((step, index) => (
                <div key={step.title} className="how-step">
                  <div className="step-num-box">{index + 1}</div>
                  <div>
                    <div className="step-title">{step.title}</div>
                    <div className="step-desc">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="page-section">
        <div className="why-section">
          <div>
            <p className="section-eyebrow">Why Docent</p>
            <h2 className="section-title">Built on<br /><em>trust,</em><br />not traffic.</h2>
            <p className="mt-6 max-w-[400px] text-[15px] leading-8 text-[var(--muted)]">Focused on quality matches and verified listings.</p>
          </div>
          <div className="why-features">
            {whyItems.map((item) => (
              <div key={item.title} className="why-feature">
                <div className={`why-icon ${item.iconClass}`}>{item.icon}</div>
                <div>
                  <div className="why-feature-title">{item.title}</div>
                  <div className="why-feature-desc">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="page-section">
        <section className="cta-section">
          <h2 className="cta-title">Your child&apos;s best<br />tutor is <em>already</em><br />in your mohalla.</h2>
          <p className="cta-sub">Find tutors by subject, area and availability.</p>
          <div className="cta-buttons">
            <Link href="/browse" className="btn-cta-primary">Find a Tutor Now</Link>
            <JoinAsTeacherAction className="btn-cta-ghost">Join as Teacher</JoinAsTeacherAction>
          </div>
        </section>
      </div>
    </div>
  );
}
