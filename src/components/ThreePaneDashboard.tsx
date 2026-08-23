'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PenLine } from 'lucide-react';
import {
  AppDocument,
  AppSection,
  LineOfBusiness,
  SubItem,
  ContentType,
} from '@/lib/models';
import SubItemEditor, { EditorTarget, EditorMode } from './SubItemEditor';

export default function ThreePaneDashboard() {
  // State for Line of Business Filter
  const [selectedLoB, setSelectedLoB] = useState<LineOfBusiness>('Health Apps');

  // Data State
  const [apps, setApps] = useState<AppDocument[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [currentApp, setCurrentApp] = useState<AppDocument | null>(null);

  // Loading & Selection / Editor State
  const [loadingApps, setLoadingApps] = useState(false);
  const [loadingAppDetail, setLoadingAppDetail] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<EditorTarget | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>('view');
  const [isRightPaneCollapsed, setIsRightPaneCollapsed] = useState(false);

  // Modals / Inputs state
  const [showAddAppModal, setShowAddAppModal] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [addingSubItemSectionIndex, setAddingSubItemSectionIndex] = useState<number | null>(null);
  const [newSubItemName, setNewSubItemName] = useState('');
  const [newSubItemType, setNewSubItemType] = useState<ContentType>('rtf');

  // Fetch Apps list when Line of Business changes
  const fetchApps = useCallback(async (lob: LineOfBusiness) => {
    setLoadingApps(true);
    try {
      const res = await fetch(`/api/apps?lineOfBusiness=${encodeURIComponent(lob)}`);
      if (!res.ok) throw new Error('Failed to fetch apps');
      const data = await res.json();
      setApps(data.apps || []);

      // Auto-select first app if none selected or current app not in list
      if (data.apps && data.apps.length > 0) {
        setSelectedAppId(data.apps[0]._id.toString());
      } else {
        setSelectedAppId(null);
        setCurrentApp(null);
        setSelectedTarget(null);
      }
    } catch (err) {
      console.error('Error fetching apps:', err);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  useEffect(() => {
    fetchApps(selectedLoB);
  }, [selectedLoB, fetchApps]);

  // Fetch single App details
  const fetchAppDetail = useCallback(async (appId: string) => {
    setLoadingAppDetail(true);
    try {
      const res = await fetch(`/api/apps/${appId}`);
      if (!res.ok) throw new Error('Failed to load app details');
      const data = await res.json();
      setCurrentApp(data.app);
    } catch (err) {
      console.error('Error loading app detail:', err);
    } finally {
      setLoadingAppDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      fetchAppDetail(selectedAppId);
    }
  }, [selectedAppId, fetchAppDetail]);

  // Create a new App
  const handleCreateApp = async () => {
    if (!newAppName.trim()) return;
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: newAppName.trim(),
          lineOfBusiness: selectedLoB,
        }),
      });
      if (!res.ok) throw new Error('Failed to create app');
      const data = await res.json();
      setNewAppName('');
      setShowAddAppModal(false);
      await fetchApps(selectedLoB);
      if (data.app && data.app._id) {
        setSelectedAppId(data.app._id.toString());
        setSelectedTarget(null);
      }
    } catch (err) {
      console.error('Error creating app:', err);
    }
  };

  // Add a new empty Section to currentApp
  const handleAddSection = async () => {
    if (!currentApp) return;
    const sectionName = prompt('Enter section name:');
    if (!sectionName || !sectionName.trim()) return;

    const currentSections = currentApp.sections || [];
    const newSection: AppSection = {
      name: sectionName.trim(),
      order: currentSections.length + 1,
      subItems: [],
    };

    const updatedSections = [...currentSections, newSection];

    try {
      const res = await fetch(`/api/apps/${currentApp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updatedSections }),
      });
      if (!res.ok) throw new Error('Failed to add section');
      const data = await res.json();
      setCurrentApp(data.app);
    } catch (err) {
      console.error('Error adding section:', err);
    }
  };

  // Rename a Section
  const handleRenameSection = async (sectionIndex: number) => {
    if (!currentApp || !currentApp.sections) return;
    const currentSec = currentApp.sections[sectionIndex];
    if (!currentSec) return;

    const newName = prompt('Enter new section name:', currentSec.name);
    if (!newName || !newName.trim() || newName.trim() === currentSec.name) return;

    const updatedSections = currentApp.sections.map((sec, idx) =>
      idx === sectionIndex ? { ...sec, name: newName.trim() } : sec
    );

    try {
      const res = await fetch(`/api/apps/${currentApp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updatedSections }),
      });
      if (!res.ok) throw new Error('Failed to rename section');
      const data = await res.json();
      setCurrentApp(data.app);
    } catch (err) {
      console.error('Error renaming section:', err);
    }
  };

  // Remove a Section
  const handleRemoveSection = async (sectionIndex: number) => {
    if (!currentApp || !currentApp.sections) return;
    const targetSec = currentApp.sections[sectionIndex];
    if (!targetSec) return;

    if (!confirm(`Are you sure you want to remove section "${targetSec.name}" and all its sub-items?`)) return;

    const updatedSections = currentApp.sections
      .filter((_, idx) => idx !== sectionIndex)
      .map((sec, i) => ({ ...sec, order: i + 1 }));

    try {
      const res = await fetch(`/api/apps/${currentApp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updatedSections }),
      });
      if (!res.ok) throw new Error('Failed to remove section');
      const data = await res.json();
      setCurrentApp(data.app);
      if (selectedTarget?.sectionIndex === sectionIndex) {
        setSelectedTarget(null);
      }
    } catch (err) {
      console.error('Error removing section:', err);
    }
  };

  // Add Sub-item (Page) to a specific Section and immediately open in EDIT mode
  const handleAddSubItem = async (sectionIndex: number) => {
    if (!currentApp || !currentApp.sections || !newSubItemName.trim()) return;

    const currentSec = currentApp.sections[sectionIndex];
    if (!currentSec) return;

    const existingItems = currentSec.subItems || [];
    const newSubItem: SubItem = {
      name: newSubItemName.trim(),
      contentType: newSubItemType,
      value:
        newSubItemType === 'object'
          ? []
          : newSubItemType === 'table'
          ? { columns: ['Column 1', 'Column 2'], rows: [['', '']] }
          : '',
      order: existingItems.length + 1,
    } as SubItem;

    const updatedSubItems = [...existingItems, newSubItem];
    const updatedSections = currentApp.sections.map((sec, idx) =>
      idx === sectionIndex ? { ...sec, subItems: updatedSubItems } : sec
    );

    try {
      const res = await fetch(`/api/apps/${currentApp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updatedSections }),
      });
      if (!res.ok) throw new Error('Failed to add sub-item');
      const data = await res.json();
      setCurrentApp(data.app);
      setNewSubItemName('');
      setAddingSubItemSectionIndex(null);

      // Open new sub-item directly in EDIT mode
      const newIndex = updatedSubItems.length - 1;
      setSelectedTarget({
        type: 'subitem',
        sectionIndex,
        index: newIndex,
        item: newSubItem,
      });
      setEditorMode('edit');
      setIsRightPaneCollapsed(false);
    } catch (err) {
      console.error('Error adding sub-item:', err);
    }
  };

  // Reorder Sub-item within a section
  const handleReorderSubItem = async (
    sectionIndex: number,
    subItemIndex: number,
    direction: 'up' | 'down'
  ) => {
    if (!currentApp || !currentApp.sections) return;

    const targetSec = currentApp.sections[sectionIndex];
    if (!targetSec || !targetSec.subItems) return;

    const targetSubItemIndex = direction === 'up' ? subItemIndex - 1 : subItemIndex + 1;
    if (targetSubItemIndex < 0 || targetSubItemIndex >= targetSec.subItems.length) return;

    const updatedSubItems = [...targetSec.subItems];
    const [moved] = updatedSubItems.splice(subItemIndex, 1);
    updatedSubItems.splice(targetSubItemIndex, 0, moved);

    const reorderedSubItems = updatedSubItems.map((item, i) => ({
      ...item,
      order: i + 1,
    }));

    const updatedSections = currentApp.sections.map((sec, sIdx) =>
      sIdx === sectionIndex ? { ...sec, subItems: reorderedSubItems } : sec
    );

    try {
      const res = await fetch(`/api/apps/${currentApp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updatedSections }),
      });
      if (!res.ok) throw new Error('Failed to reorder sub-item');
      const data = await res.json();
      setCurrentApp(data.app);
      if (selectedTarget?.type === 'subitem' && selectedTarget.sectionIndex === sectionIndex) {
        if (selectedTarget.index === subItemIndex) {
          setSelectedTarget({ ...selectedTarget, index: targetSubItemIndex });
        } else if (selectedTarget.index === targetSubItemIndex) {
          setSelectedTarget({ ...selectedTarget, index: subItemIndex });
        }
      }
    } catch (err) {
      console.error('Error reordering sub-item:', err);
    }
  };

  // Remove Sub-item from a specific Section
  const handleRemoveSubItem = async (sectionIndex: number, subItemIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentApp || !currentApp.sections) return;
    if (!confirm(`Are you sure you want to remove this sub-item?`)) return;

    const currentSec = currentApp.sections[sectionIndex];
    if (!currentSec) return;

    const updatedSubItems = (currentSec.subItems || []).filter((_, i) => i !== subItemIndex);
    const updatedSections = currentApp.sections.map((sec, idx) =>
      idx === sectionIndex ? { ...sec, subItems: updatedSubItems } : sec
    );

    try {
      const res = await fetch(`/api/apps/${currentApp._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: updatedSections }),
      });
      if (!res.ok) throw new Error('Failed to remove sub-item');
      const data = await res.json();
      setCurrentApp(data.app);
      if (
        selectedTarget?.type === 'subitem' &&
        selectedTarget.sectionIndex === sectionIndex &&
        selectedTarget.index === subItemIndex
      ) {
        setSelectedTarget(null);
      }
    } catch (err) {
      console.error('Error removing sub-item:', err);
    }
  };

  // Save changes from Editor
  const handleSaveEditorTarget = async (updatedTarget: EditorTarget) => {
    if (!currentApp || !currentApp.sections) return;

    const { sectionIndex, index } = updatedTarget;
    if (sectionIndex === undefined || index === undefined) return;

    const updatedSections = currentApp.sections.map((sec, sIdx) => {
      if (sIdx !== sectionIndex) return sec;
      const subItems = [...(sec.subItems || [])];
      subItems[index] = updatedTarget.item as SubItem;
      return { ...sec, subItems };
    });

    const res = await fetch(`/api/apps/${currentApp._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: updatedSections }),
    });
    if (!res.ok) throw new Error('Failed to save sub-item');
    const data = await res.json();
    setCurrentApp(data.app);
    setSelectedTarget(updatedTarget);
  };

  // Delete sub-item from inside Editor
  const handleDeleteEditorTarget = async (targetToDelete: EditorTarget) => {
    if (!currentApp || !currentApp.sections) return;
    const { sectionIndex, index } = targetToDelete;
    if (sectionIndex === undefined || index === undefined) return;

    const currentSec = currentApp.sections[sectionIndex];
    if (!currentSec) return;

    const updatedSubItems = (currentSec.subItems || []).filter((_, i) => i !== index);
    const updatedSections = currentApp.sections.map((sec, idx) =>
      idx === sectionIndex ? { ...sec, subItems: updatedSubItems } : sec
    );

    const res = await fetch(`/api/apps/${currentApp._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sections: updatedSections }),
    });
    if (!res.ok) throw new Error('Failed to remove sub-item');
    const data = await res.json();
    setCurrentApp(data.app);
    setSelectedTarget(null);
  };

  // Render helper for any Section card
  const renderSectionCard = (sec: AppSection, secIdx: number) => {
    const isAdding = addingSubItemSectionIndex === secIdx;
    return (
      <section key={secIdx} className="section-card">
        <div className="section-header">
          <div className="section-header-title">
            <span className="section-icon">📋</span>
            <h3
              className="section-title-btn"
              title="Click to rename section"
              onClick={() => handleRenameSection(secIdx)}
            >
              {sec.name} <PenLine size={13} className="pen-icon" />
            </h3>
            <span className="count-pill">{(sec.subItems || []).length}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <button
              className="remove-icon-btn"
              title="Remove section"
              onClick={() => handleRemoveSection(secIdx)}
            >
              🗑️
            </button>
            <button
              className="add-subitem-btn"
              title="Add a page to this section"
              onClick={() => setAddingSubItemSectionIndex(isAdding ? null : secIdx)}
            >
              + Add page
            </button>
          </div>
        </div>

        {isAdding && (
          <div className="add-subitem-form">
            <input
              type="text"
              className="input-text"
              placeholder="Page name (e.g. System Overview)"
              value={newSubItemName}
              onChange={(e) => setNewSubItemName(e.target.value)}
              autoFocus
            />
            <select
              className="select-input"
              value={newSubItemType}
              onChange={(e) => setNewSubItemType(e.target.value as ContentType)}
            >
              <option value="rtf">Markdown / RTF</option>
              <option value="string">Plain String</option>
              <option value="object">Key-Value Pairs</option>
              <option value="table">Table</option>
            </select>
            <div className="form-actions">
              <button
                className="btn-secondary-sm"
                onClick={() => setAddingSubItemSectionIndex(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary-sm"
                onClick={() => handleAddSubItem(secIdx)}
              >
                Add & Edit
              </button>
            </div>
          </div>
        )}

        <div className="subitems-list">
          {(sec.subItems || []).length === 0 ? (
            <div className="subitems-empty">No pages in this section yet.</div>
          ) : (
            (sec.subItems || []).map((subItem, subIdx) => {
              const isSelected =
                selectedTarget?.type === 'subitem' &&
                selectedTarget.sectionIndex === secIdx &&
                selectedTarget.index === subIdx;
              return (
                <div
                  key={subIdx}
                  className={`subitem-row ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    // Page click opens READ-ONLY view
                    setSelectedTarget({
                      type: 'subitem',
                      sectionIndex: secIdx,
                      index: subIdx,
                      item: subItem,
                    });
                    setEditorMode('view');
                    setIsRightPaneCollapsed(false);
                  }}
                >
                  <div className="subitem-left">
                    <span className="subitem-name">{subItem.name}</span>
                    <span className={`content-badge badge-${subItem.contentType}`}>
                      {subItem.contentType}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {/* Explicit Edit action (Pen Icon) opens Editor mode directly */}
                    <button
                      className="reorder-subitem-btn"
                      title="Edit this page"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTarget({
                          type: 'subitem',
                          sectionIndex: secIdx,
                          index: subIdx,
                          item: subItem,
                        });
                        setEditorMode('edit');
                        setIsRightPaneCollapsed(false);
                      }}
                    >
                      <PenLine size={13} />
                    </button>

                    {/* Move Up */}
                    <button
                      className="reorder-subitem-btn"
                      title="Move page up"
                      disabled={subIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorderSubItem(secIdx, subIdx, 'up');
                      }}
                    >
                      ▲
                    </button>

                    {/* Move Down */}
                    <button
                      className="reorder-subitem-btn"
                      title="Move page down"
                      disabled={subIdx === (sec.subItems || []).length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorderSubItem(secIdx, subIdx, 'down');
                      }}
                    >
                      ▼
                    </button>

                    {/* Remove */}
                    <button
                      className="remove-icon-btn"
                      title="Remove page"
                      onClick={(e) => handleRemoveSubItem(secIdx, subIdx, e)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    );
  };

  const showRightPane = selectedTarget !== null && !isRightPaneCollapsed;
  const currentSectionName =
    selectedTarget?.sectionIndex !== undefined && currentApp?.sections
      ? currentApp.sections[selectedTarget.sectionIndex]?.name
      : undefined;

  return (
    <div className={`three-pane-layout ${!showRightPane ? 'right-collapsed' : ''}`}>
      {/* ========================================================================= */}
      {/* PANE 1: LEFT PANE - Line of Business Toggle & Apps List */}
      {/* ========================================================================= */}
      <aside className="pane pane-left">
        <div className="pane-header">
          <h3>Line of Business</h3>
          <div className="lob-toggle-group">
            <button
              className={`lob-btn ${selectedLoB === 'Health Apps' ? 'active' : ''}`}
              onClick={() => setSelectedLoB('Health Apps')}
            >
              Health Apps
            </button>
            <button
              className={`lob-btn ${selectedLoB === 'Enterprise Imaging' ? 'active' : ''}`}
              onClick={() => setSelectedLoB('Enterprise Imaging')}
            >
              Enterprise Imaging
            </button>
          </div>
        </div>

        <div className="apps-list-header">
          <span>Applications ({apps.length})</span>
          <button className="add-app-btn" onClick={() => setShowAddAppModal(true)}>
            + New App
          </button>
        </div>

        <div className="apps-list-body">
          {loadingApps ? (
            <div className="pane-loading">
              <span className="spinner"></span> Loading apps...
            </div>
          ) : apps.length === 0 ? (
            <div className="pane-empty">No apps found for {selectedLoB}.</div>
          ) : (
            apps.map((app) => {
              const idStr = app._id?.toString();
              const isSelected = idStr === selectedAppId;
              const sectionCount = app.sections?.length || 0;
              const totalItems = (app.sections || []).reduce(
                (sum, sec) => sum + (sec.subItems?.length || 0),
                0
              );
              return (
                <div
                  key={idStr}
                  className={`app-item-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedAppId(idStr || null);
                    setSelectedTarget(null);
                  }}
                >
                  <div className="app-item-title">{app.appName}</div>
                  <div className="app-item-meta">
                    <span>{sectionCount} Sections</span>
                    <span>•</span>
                    <span>{totalItems} Pages</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* PANE 2: MIDDLE PANE - App Title & 8 Template Sections */}
      {/* ========================================================================= */}
      <main className="pane pane-middle">
        {!selectedAppId || loadingAppDetail ? (
          <div className="pane-loading-center">
            {loadingAppDetail ? (
              <>
                <span className="spinner"></span>
                <p>Loading application data...</p>
              </>
            ) : (
              <p>Select an application from the left panel.</p>
            )}
          </div>
        ) : !currentApp ? (
          <div className="pane-empty">App not found.</div>
        ) : (
          <div className="middle-content-scroll">
            <header className="middle-app-header">
              <div className="app-header-title">
                <h2>{currentApp.appName}</h2>
                <span className="lob-badge">{currentApp.lineOfBusiness}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="add-app-btn" onClick={handleAddSection}>
                  + Add Section
                </button>
              </div>
            </header>

            <div className="sections-grid">
              {(currentApp.sections || []).map((sec, idx) => renderSectionCard(sec, idx))}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* PANE 3: RIGHT PANE - Read-Only Viewer / On-Demand Editor */}
      {/* (Only rendered when selectedTarget !== null) */}
      {/* ========================================================================= */}
      {showRightPane && (
        <aside className="pane pane-right">
          <SubItemEditor
            target={selectedTarget}
            mode={editorMode}
            sectionName={currentSectionName}
            onSave={handleSaveEditorTarget}
            onDelete={handleDeleteEditorTarget}
            onClose={() => setSelectedTarget(null)}
            onEdit={() => setEditorMode('edit')}
            onToggleCollapse={() => setIsRightPaneCollapsed(true)}
          />
        </aside>
      )}

      {/* MODAL: CREATE APP */}
      {showAddAppModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Create New Application</h3>
            <p className="modal-subtitle">Line of Business: <strong>{selectedLoB}</strong></p>
            <input
              type="text"
              className="input-text-lg"
              placeholder="Application Name (e.g. PACS Gateway)"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              autoFocus
            />
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAddAppModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleCreateApp}>
                Create App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
