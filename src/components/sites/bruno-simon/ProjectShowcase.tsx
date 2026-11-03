"use client";

import { useEffect, useRef } from "react";
import type { Project } from "./data";

interface ProjectShowcaseProps {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  variant: "projects" | "lab";
}

const initialsFor = (title: string) =>
  title
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 3)
    .toUpperCase();

export default function ProjectShowcase({ projects, selectedId, onSelect, variant }: ProjectShowcaseProps) {
  const backRef = useRef<HTMLButtonElement | null>(null);
  const selected = projects.find((project) => project.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) backRef.current?.focus();
  }, [selected]);

  if (selected) {
    return (
      <div className={`bs-project-detail bs-project-detail--${variant}`}>
        <button
          ref={backRef}
          type="button"
          className="bs-project-back"
          onClick={() => onSelect(null)}
          aria-label={`Back to ${variant === "lab" ? "AI Lab" : "all projects"}`}
        >
          <span aria-hidden="true">←</span> Back to {variant === "lab" ? "AI Lab" : "Projects"}
        </button>

        <div className="bs-project-detail__hero">
          <div className="bs-project-detail__glyph" style={{ borderColor: selected.accent, color: selected.accent }}>
            {initialsFor(selected.title)}
          </div>
          <div>
            <div className="bs-project-detail__eyebrow">
              {selected.category === "ai" ? "AI / MACHINE LEARNING" : "IOT / HARDWARE"}
            </div>
            <h2 className="bs-title bs-project-detail__title">{selected.title}</h2>
            <p className="bs-project-detail__subtitle">{selected.subtitle}</p>
          </div>
        </div>

        <p className="bs-text">{selected.description}</p>

        <h3 className="bs-project-detail__heading">Features</h3>
        <ul className="bs-project-features">
          {selected.features.map((feature) => (
            <li key={feature}>
              <span aria-hidden="true">▸</span>
              {feature}
            </li>
          ))}
        </ul>

        <h3 className="bs-project-detail__heading">Technologies</h3>
        <div className="bs-tags">
          {selected.technologies.map((technology) => (
            <span key={technology} className="bs-tag">
              {technology}
            </span>
          ))}
        </div>

        {(selected.links.github || selected.links.demo) && (
          <div className="bs-project-detail__actions">
            {selected.links.github && (
              <a className="bs-button" href={selected.links.github} target="_blank" rel="noreferrer">
                View source
              </a>
            )}
            {selected.links.demo && (
              <a className="bs-button bs-button--green" href={selected.links.demo} target="_blank" rel="noreferrer">
                Live demo
              </a>
            )}
          </div>
        )}

        {!selected.links.github && !selected.links.demo && (
          <p className="bs-project-detail__note">
            Source and demo links were not supplied for this project.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`bs-project-showcase bs-project-showcase--${variant}`}>
      {variant === "lab" ? (
        <div className="bs-lab-readout" aria-hidden="true">
          <span className="bs-lab-readout__dot" />
          AI LAB ONLINE
          <span className="bs-lab-readout__meta">LOCAL MODELS · VISION · AGENTS</span>
        </div>
      ) : (
        <p className="bs-text bs-text--faded bs-project-showcase__intro">
          {projects.length} builds spanning generative AI, healthcare, computer vision, analytics and hardware.
          Select a project to inspect it.
        </p>
      )}

      <div className="bs-project-grid">
        {projects.map((project, index) => (
          <button
            key={project.id}
            type="button"
            className="bs-project-card"
            onClick={() => onSelect(project.id)}
            aria-label={`Open ${project.title}: ${project.subtitle}`}
            style={{ borderTopColor: project.accent }}
          >
            <span
              className="bs-project-card__glyph"
              style={{ color: project.accent, borderColor: project.accent }}
              aria-hidden="true"
            >
              {initialsFor(project.title)}
            </span>
            <span className="bs-project-card__index" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="bs-project-card__title">{project.title}</span>
            <span className="bs-project-card__subtitle">{project.subtitle}</span>
            <span className="bs-project-card__tags">
              {project.technologies.slice(0, 3).map((technology) => (
                <span key={technology}>{technology}</span>
              ))}
            </span>
            <span className="bs-project-card__open" aria-hidden="true">
              Inspect <span>→</span>
            </span>
          </button>
        ))}
      </div>

      {variant === "lab" && (
        <p className="bs-project-showcase__footer">
          Every terminal in the AI Lab maps to one of these projects.
        </p>
      )}
    </div>
  );
}
