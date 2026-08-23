'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import { PenLine, PanelRightClose } from 'lucide-react';
import { SubItem, KeyValuePair, ContentType, TableData } from '@/lib/models';
import 'react-quill/dist/quill.snow.css';

// Dynamic import for ReactQuill to support Next.js App Router SSR
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export type SelectedItemType = 'subitem' | 'issue' | 'howto';
export type EditorMode = 'view' | 'edit';

export interface EditorTarget {
  type: SelectedItemType;
  sectionIndex?: number;
  index?: number;
  item: {
    _id?: string;
    name?: string;
    title?: string;
    contentType?: ContentType;
    value?: unknown;
    order?: number;
  };
}

interface SubItemEditorProps {
  target: EditorTarget | null;
  mode?: EditorMode;
  sectionName?: string;
  onSave: (updatedTarget: EditorTarget) => Promise<void>;
  onDelete?: (target: EditorTarget) => Promise<void>;
  onClose: () => void;
  onEdit?: () => void;
  onToggleCollapse?: () => void;
}

const sanitizeHtml = (html: string): string => {
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(html);
  }
  return html;
};

export default function SubItemEditor({
  target,
  mode = 'view',
  sectionName,
  onSave,
  onDelete,
  onClose,
  onEdit,
  onToggleCollapse,
}: SubItemEditorProps) {
  const [currentMode, setCurrentMode] = useState<EditorMode>(mode);
  const [saving, setSaving] = useState(false);

  // Local state for editing fields
  const [nameOrTitle, setNameOrTitle] = useState('');
  const [contentType, setContentType] = useState<ContentType>('rtf');
  const [stringValue, setStringValue] = useState('');
  const [objectPairs, setObjectPairs] = useState<KeyValuePair[]>([]);
  const [tableData, setTableData] = useState<TableData>({
    columns: ['Column 1', 'Column 2'],
    rows: [['', '']],
  });

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ['bold', 'italic', 'underline'],
        [{ color: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['clean'],
      ],
    }),
    []
  );

  // Sync internal mode with prop mode when prop mode changes
  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  useEffect(() => {
    if (!target) return;

    const item = target.item;
    setNameOrTitle(item.name || item.title || '');

    const subItem = item as SubItem;
    const type = subItem.contentType || 'rtf';
    setContentType(type);

    if (type === 'table') {
      const val = subItem.value as TableData | undefined;
      const cols =
        Array.isArray(val?.columns) && val!.columns.length > 0
          ? val!.columns
          : ['Column 1', 'Column 2'];
      const rws = Array.isArray(val?.rows) ? val!.rows : [['', '']];
      setTableData({ columns: cols, rows: rws });
    } else if (type === 'object') {
      setObjectPairs(Array.isArray(subItem.value) ? subItem.value : []);
    } else {
      setStringValue(typeof subItem.value === 'string' ? subItem.value : '');
    }
  }, [target]);

  // If no item is selected, render nothing (keep dashboard clean & calm)
  if (!target) {
    return null;
  }

  const handleEnterEdit = () => {
    setCurrentMode('edit');
    if (onEdit) onEdit();
  };

  // Key-value pair handlers for edit mode
  const handleAddPair = () => {
    setObjectPairs([...objectPairs, { key: '', value: '' }]);
  };

  const handleUpdatePair = (index: number, key: string, value: string) => {
    const updated = [...objectPairs];
    updated[index] = { key, value };
    setObjectPairs(updated);
  };

  const handleRemovePair = (index: number) => {
    setObjectPairs(objectPairs.filter((_, i) => i !== index));
  };

  // Table Editor Handlers
  const handleAddColumn = () => {
    if (tableData.columns.length >= 10) return;
    const newColName = `Column ${tableData.columns.length + 1}`;
    setTableData({
      columns: [...tableData.columns, newColName],
      rows: tableData.rows.map((row) => [...row, '']),
    });
  };

  const handleRemoveColumn = (colIndex: number) => {
    setTableData({
      columns: tableData.columns.filter((_, i) => i !== colIndex),
      rows: tableData.rows.map((row) => row.filter((_, i) => i !== colIndex)),
    });
  };

  const handleUpdateColumnHeader = (colIndex: number, name: string) => {
    const updatedCols = [...tableData.columns];
    updatedCols[colIndex] = name;
    setTableData({ ...tableData, columns: updatedCols });
  };

  const handleAddRow = () => {
    const newRow = new Array(tableData.columns.length).fill('');
    setTableData({
      columns: tableData.columns,
      rows: [...tableData.rows, newRow],
    });
  };

  const handleRemoveRow = (rowIndex: number) => {
    setTableData({
      ...tableData,
      rows: tableData.rows.filter((_, i) => i !== rowIndex),
    });
  };

  const handleUpdateCell = (rowIndex: number, colIndex: number, value: string) => {
    const updatedRows = tableData.rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const updatedRow = [...row];
      updatedRow[colIndex] = value;
      return updatedRow;
    });
    setTableData({ ...tableData, rows: updatedRows });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let constructedValue: string | KeyValuePair[] | TableData;
      if (contentType === 'table') {
        constructedValue = tableData;
      } else if (contentType === 'object') {
        constructedValue = objectPairs;
      } else {
        constructedValue = stringValue;
      }

      const updatedItem: Record<string, unknown> = {
        ...target.item,
        name: nameOrTitle,
        contentType,
        value: constructedValue,
      };

      await onSave({
        type: target.type,
        sectionIndex: target.sectionIndex,
        index: target.index,
        item: updatedItem,
      });

      // After successful save, return to read-only view
      setCurrentMode('view');
    } catch (err) {
      console.error('Error saving item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (confirm(`Are you sure you want to delete "${nameOrTitle}"?`)) {
      setSaving(true);
      try {
        await onDelete(target);
      } finally {
        setSaving(false);
      }
    }
  };

  // =========================================================================
  // 1. READ-ONLY VIEW
  // =========================================================================
  if (currentMode === 'view') {
    const isCleanEmpty =
      contentType === 'table'
        ? !tableData.columns || tableData.columns.length === 0
        : contentType === 'object'
        ? objectPairs.length === 0
        : !stringValue ||
          stringValue.trim().length === 0 ||
          stringValue === '<p><br></p>';

    return (
      <div className="read-only-container">
        <div className="read-only-header">
          <div className="read-only-title-group">
            {sectionName && <span className="read-only-section-tag">{sectionName}</span>}
            <h2 className="read-only-title">{nameOrTitle || 'Untitled Page'}</h2>
          </div>
          <div className="read-only-actions">
            <button className="btn-edit-mode" title="Edit Page Content" onClick={handleEnterEdit}>
              <PenLine size={14} />
              <span>Edit</span>
            </button>
            {onToggleCollapse && (
              <button className="toggle-pane-btn" title="Collapse Pane" onClick={onToggleCollapse}>
                <PanelRightClose size={15} />
              </button>
            )}
            <button className="editor-close-btn" title="Close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="read-only-body">
          {isCleanEmpty ? (
            <div className="read-only-empty">
              <p>This page is currently empty.</p>
              <button className="btn-edit-mode" onClick={handleEnterEdit}>
                <PenLine size={14} />
                <span>Add Content</span>
              </button>
            </div>
          ) : contentType === 'table' ? (
            <div className="table-responsive">
              <table className="read-only-table">
                <thead>
                  <tr>
                    {tableData.columns.map((col, idx) => (
                      <th key={idx}>{col || `Column ${idx + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {tableData.columns.map((_, cIdx) => (
                        <td key={cIdx}>{row[cIdx] ?? ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : contentType === 'object' ? (
            <table className="read-only-kv-table">
              <tbody>
                {objectPairs.map((pair, idx) => (
                  <tr key={idx}>
                    <td className="kv-key">{pair.key}</td>
                    <td className="kv-value">{String(pair.value ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              className="read-only-html-content ql-editor"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(stringValue) }}
            />
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. EDIT MODE (WYSIWYG RICH-TEXT EDITOR WITH HR DIVIDER BUTTON)
  // =========================================================================
  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="editor-title-group">
          {sectionName && <span className="read-only-section-tag">{sectionName}</span>}
          <input
            type="text"
            className="editor-title-input"
            value={nameOrTitle}
            onChange={(e) => setNameOrTitle(e.target.value)}
            placeholder="Page Name"
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {onToggleCollapse && (
            <button className="toggle-pane-btn" title="Collapse Pane" onClick={onToggleCollapse}>
              <PanelRightClose size={15} />
            </button>
          )}
          <button className="editor-close-btn" title="Close" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div className="editor-toolbar">
        <div className="content-type-selector">
          <label>Type:</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as ContentType)}
            className="select-input"
          >
            <option value="rtf">Rich Text (WYSIWYG)</option>
            <option value="string">Plain String</option>
            <option value="object">Key-Value Pairs (Object)</option>
            <option value="table">Table</option>
          </select>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="editor-body">
        {contentType === 'rtf' && (
          <div className="quill-editor-wrapper">
            <ReactQuill
              theme="snow"
              value={stringValue}
              onChange={setStringValue}
              modules={quillModules}
              placeholder="Type formatted page content..."
            />
          </div>
        )}

        {contentType === 'string' && (
          <div className="form-group">
            <label className="input-label">Plain Text Content:</label>
            <textarea
              className="editor-textarea"
              rows={14}
              value={stringValue}
              onChange={(e) => setStringValue(e.target.value)}
              placeholder="Enter plain text value..."
            />
          </div>
        )}

        {contentType === 'object' && (
          <div className="object-pairs-editor">
            <div className="pairs-header">
              <label className="input-label">Key-Value Pairs:</label>
              <button className="add-row-btn" onClick={handleAddPair}>
                + Add Pair
              </button>
            </div>

            {objectPairs.length === 0 ? (
              <div className="pairs-empty">
                No key-value pairs added. Click &quot;+ Add Pair&quot; to create rows.
              </div>
            ) : (
              <div className="pairs-list">
                {objectPairs.map((pair, idx) => (
                  <div key={idx} className="pair-row">
                    <input
                      type="text"
                      className="pair-key-input"
                      placeholder="Key"
                      value={pair.key}
                      onChange={(e) =>
                        handleUpdatePair(idx, e.target.value, String(pair.value ?? ''))
                      }
                    />
                    <span className="pair-colon">:</span>
                    <input
                      type="text"
                      className="pair-val-input"
                      placeholder="Value"
                      value={String(pair.value ?? '')}
                      onChange={(e) => handleUpdatePair(idx, pair.key, e.target.value)}
                    />
                    <button
                      className="remove-pair-btn"
                      onClick={() => handleRemovePair(idx)}
                      title="Remove Row"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {contentType === 'table' && (
          <div className="table-editor-container">
            <div className="table-editor-actions">
              <label className="input-label">Table Grid Editor:</label>
              <div className="table-btn-group">
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={handleAddColumn}
                  disabled={tableData.columns.length >= 10}
                  title={tableData.columns.length >= 10 ? 'Maximum 10 columns allowed' : 'Add Column'}
                >
                  + Add Column {tableData.columns.length >= 10 ? '(Max 10)' : ''}
                </button>
                <button
                  type="button"
                  className="btn-secondary-sm"
                  onClick={handleAddRow}
                  title="Add Row"
                >
                  + Add Row
                </button>
              </div>
            </div>

            <div className="table-editor-scroll">
              <table className="table-editor-grid">
                <thead>
                  <tr>
                    <th className="table-col-index">#</th>
                    {tableData.columns.map((col, cIdx) => (
                      <th key={cIdx} className="table-editor-th">
                        <div className="th-content">
                          <input
                            type="text"
                            className="table-editor-header-input"
                            value={col}
                            onChange={(e) => handleUpdateColumnHeader(cIdx, e.target.value)}
                            placeholder={`Column ${cIdx + 1}`}
                          />
                          <button
                            type="button"
                            className="remove-col-btn"
                            onClick={() => handleRemoveColumn(cIdx)}
                            title="Remove Column"
                          >
                            ✕
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="table-row-action-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={tableData.columns.length + 2} className="table-empty-td">
                        No rows added. Click &quot;+ Add Row&quot; to insert a row.
                      </td>
                    </tr>
                  ) : (
                    tableData.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="table-col-index">{rIdx + 1}</td>
                        {tableData.columns.map((_, cIdx) => (
                          <td key={cIdx} className="table-editor-td">
                            <input
                              type="text"
                              className="table-editor-input"
                              value={row[cIdx] ?? ''}
                              onChange={(e) => handleUpdateCell(rIdx, cIdx, e.target.value)}
                              placeholder="Cell value..."
                            />
                          </td>
                        ))}
                        <td className="table-row-action-td">
                          <button
                            type="button"
                            className="remove-row-btn"
                            onClick={() => handleRemoveRow(rIdx)}
                            title="Remove Row"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Editor Actions Footer */}
      <div className="editor-footer">
        {onDelete ? (
          <button className="btn-danger" onClick={handleDelete} disabled={saving}>
            Delete Page
          </button>
        ) : (
          <div />
        )}
        <div className="footer-right">
          <button
            className="btn-secondary"
            onClick={() => setCurrentMode('view')}
            disabled={saving}
          >
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner-small"></span> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
