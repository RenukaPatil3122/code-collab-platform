import React, { useState } from "react";
import { X, Search, Code2, FileCode } from "lucide-react";
import { getTemplatesForLanguage } from "../utils/codeTemplates";
import "./TemplateModal.css";

function TemplateModal({ language, onSelectTemplate, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const templates = getTemplatesForLanguage(language);
  const templateNames = Object.keys(templates);

  const filteredTemplates = templateNames.filter((name) =>
    name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSelectTemplate = (templateName) => {
    const template = templates[templateName];
    onSelectTemplate(template.code);
    onClose();
  };

  return (
    <div className="template-modal-overlay" onClick={onClose}>
      <div className="template-modal" onClick={(e) => e.stopPropagation()}>
        <div className="template-modal-header">
          <div className="header-title">
            <Code2 size={24} />
            <h2>Code Templates</h2>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="template-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        <div className="templates-list">
          {filteredTemplates.length === 0 ? (
            <div className="no-templates">
              <FileCode size={48} />
              <p>No templates found for "{searchTerm}"</p>
            </div>
          ) : (
            filteredTemplates.map((name) => (
              <div
                key={name}
                className="template-item"
                onClick={() => handleSelectTemplate(name)}
              >
                <div className="template-item-header">
                  <FileCode size={20} />
                  <h3>{name}</h3>
                </div>
                <p className="template-description">
                  {templates[name].description}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateModal;
