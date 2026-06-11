"use client";

import Link from "next/link";
import { useState } from "react";
import { CreateTemplateModal } from "./CreateTemplateModal";

const templates = [
  {
    id: "ecommerce",
    title: "E-commerce Orders",
    desc: "Map Shopify, Magento, or custom store order JSON structures.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: "users",
    title: "User Profiles",
    desc: "Standardized schema for identity management and auth sync.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "crm",
    title: "CRM Sync",
    desc: "Lead and contact data normalization for Salesforce or HubSpot.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none">
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
  },
];

export default function SchemaStepPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  function openCreateModal() {
    setIsCreateModalOpen(true);
  }

  function saveTemplateDraft() {
    setSelected("new");
    setIsCreateModalOpen(false);
  }

  return (
    <div className="wizard-step-page">
      <div className="wizard-hero">
        <h2>Standard Templates</h2>
      </div>

      <div className="template-grid">
        {templates.map((template) => (
          <button
            key={template.id}
            className={`template-card ${selected === template.id ? "is-selected" : ""}`}
            onClick={() => setSelected(template.id === selected ? null : template.id)}
          >
            <div className="template-card-icon">{template.icon}</div>
            <h3 className="template-card-title">{template.title}</h3>
            <p className="template-card-desc">{template.desc}</p>
          </button>
        ))}

        <button
          className={`template-card template-card-new ${selected === "new" ? "is-selected" : ""}`}
          onClick={openCreateModal}
        >
          <div className="template-card-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <h3 className="template-card-title">Add New Template</h3>
          <p className="template-card-desc">Start with a custom schema builder</p>
        </button>
      </div>

      <div className="template-footer">
        <div className="template-status">
          <span className={`template-selection-dot ${selected ? "ready" : ""}`} />
          <p>{selected ? "Template selected" : "Selection required to proceed"}</p>
        </div>
        <Link href="/wizard/workbook" className="primary-button">
          Continue to Upload
        </Link>
      </div>

      <CreateTemplateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={saveTemplateDraft}
      />
    </div>
  );
}
