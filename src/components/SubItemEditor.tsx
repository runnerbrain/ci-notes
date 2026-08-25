'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import DOMPurify from 'dompurify';
import { PenLine, PanelRightClose } from 'lucide-react';
import {
  SubItem,
  KeyValuePair,
  ContentType,
  TableData,
  KeyValueType,
  NormalizedKeyValuePair,
  normalizeKeyValuePair,
} from '@/lib/models';
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
  const [objectPairs, setObjectPairs] = useState<NormalizedKeyValuePair[]>([]);
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
      const rawPairs = Array.isArray(subItem.value) ? (subItem.value as KeyValuePair[]) : [];
      setObjectPairs(rawPairs.map(normalizeKeyValuePair));
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
    setObjectPairs([
      ...objectPairs,
      { key: '', value: { type: 'text', value: '' } },
    ]);
  };

  const handleRemovePair = (index: number) => {
    setObjectPairs(objectPairs.filter((_, i) => i !== index));
  };

  const handleUpdatePairKey = (index: number, key: string) => {
    const updated = [...objectPairs];
    updated[index] = { ...updated[index], key };
    setObjectPairs(updated);
  };

  const handleUpdatePairType = (index: number, type: KeyValueType) => {
    const updated = [...objectPairs];
    const currentVal = updated[index].value;
    if (currentVal.type === type) return;

    if (type === 'text') {
      updated[index] = {
        ...updated[index],
        value: { type: 'text', value: '' },
      };
    } else if (type === 'object') {
      updated[index] = {
        ...updated[index],
        value: { type: 'object', value: [{ key: '', value: '' }] },
      };
    } else if (type === 'array') {
      updated[index] = {
        ...updated[index],
        value: { type: 'array', value: [''] },
      };
    }
    setObjectPairs(updated);
  };

  const handleUpdatePairTextValue = (index: number, val: string) => {
    const updated = [...objectPairs];
    updated[index] = {
      ...updated[index],
      value: { type: 'text', value: val },
    };
    setObjectPairs(updated);
  };

  const handleAddChildPair = (parentIndex: number) => {
    const updated = [...objectPairs];
    const parentVal = updated[parentIndex].value;
    if (parentVal.type === 'object') {
      updated[parentIndex] = {
        ...updated[parentIndex],
        value: {
          type: 'object',
          value: [...parentVal.value, { key: '', value: '' }],
        },
      };
      setObjectPairs(updated);
    }
  };

  const handleUpdateChildPair = (
    parentIndex: number,
    childIndex: number,
    childKey: string,
    childVal: string
  ) => {
    const updated = [...objectPairs];
    const parentVal = updated[parentIndex].value;
    if (parentVal.type === 'object') {
      const newChildren = [...parentVal.value];
      newChildren[childIndex] = { key: childKey, value: childVal };
      updated[parentIndex] = {
        ...updated[parentIndex],
        value: { type: 'object', value: newChildren },
      };
      setObjectPairs(updated);
    }
  };

  const handleRemoveChildPair = (parentIndex: number, childIndex: number) => {
    const updated = [...objectPairs];
    const parentVal = updated[parentIndex].value;
    if (parentVal.type === 'object') {
      const newChildren = parentVal.value.filter((_, i) => i !== childIndex);
      updated[parentIndex] = {
        ...updated[parentIndex],
        value: { type: 'object', value: newChildren },
      };
      setObjectPairs(updated);
    }
  };

  const handleAddItem = (parentIndex: number) => {
    const updated = [...objectPairs];
    const parentVal = updated[parentIndex].value;
    if (parentVal.type === 'array') {
      updated[parentIndex] = {
        ...updated[parentIndex],
        value: {
          type: 'array',
          value: [...parentVal.value, ''],
        },
      };
      setObjectPairs(updated);
    }
  };

  const handleUpdateItem = (
    parentIndex: number,
    itemIndex: number,
    itemVal: string
  ) => {
    const updated = [...objectPairs];
    const parentVal = updated[parentIndex].value;
    if (parentVal.type === 'array') {
      const newItems = [...parentVal.value];
      newItems[itemIndex] = itemVal;
      updated[parentIndex] = {
        ...updated[parentIndex],
        value: { type: 'array', value: newItems },
      };
      setObjectPairs(updated);
    }
  };

  const handleRemoveItem = (parentIndex: number, itemIndex: number) => {
    const updated = [...objectPairs];
    const parentVal = updated[parentIndex].value;
    if (parentVal.type === 'array') {
      const newItems = parentVal.value.filter((_, i) => i !== itemIndex);
      updated[parentIndex] = {
        ...updated[parentIndex],
        value: { type: 'array', value: newItems },
      };
      setObjectPairs(updated);
    }
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
                {objectPairs.map((pair, idx) => {
                  const val = pair.value;
                  return (
                    <tr key={idx}>
                      <td className="kv-key">{pair.key}</td>
                      <td className="kv-value">
                        {val.type === 'text' && <span>{val.value}</span>}
                        {val.type === 'object' && (
                          <div className="kv-nested-object">
                            {val.value.length === 0 ? (
                              <span className="kv-empty-nested">(empty)</span>
                            ) : (
                              val.value.map((child, cIdx) => (
                                <div key={cIdx} className="kv-nested-row">
                                  <span className="kv-child-key">{child.key}</span>
                                  <span className="kv-colon">:</span>
                                  <span className="kv-child-value">{child.value}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                        {val.type === 'array' && (
                          <ul className="kv-nested-list">
                            {val.value.length === 0 ? (
                              <li className="kv-empty-nested">(empty list)</li>
                            ) : (
                              val.value.map((item, iIdx) => (
                                <li key={iIdx}>{item}</li>
                              ))
                            )}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
              <button type="button" className="add-row-btn" onClick={handleAddPair}>
                + Add Pair
              </button>
            </div>

            {objectPairs.length === 0 ? (
              <div className="pairs-empty">
                No key-value pairs added. Click &quot;+ Add Pair&quot; to create rows.
              </div>
            ) : (
              <div className="pairs-list">
                {objectPairs.map((pair, idx) => {
                  const valType = pair.value.type;
                  return (
                    <div key={idx} className="pair-card">
                      <div className="pair-row-header">
                        <input
                          type="text"
                          className="pair-key-input"
                          placeholder="Key"
                          value={pair.key}
                          onChange={(e) => handleUpdatePairKey(idx, e.target.value)}
                        />
                        <select
                          className="pair-type-select"
                          value={valType}
                          onChange={(e) =>
                            handleUpdatePairType(idx, e.target.value as KeyValueType)
                          }
                        >
                          <option value="text">Text</option>
                          <option value="object">Nested pairs</option>
                          <option value="array">List</option>
                        </select>

                        {valType === 'text' && (
                          <>
                            <span className="pair-colon">:</span>
                            <input
                              type="text"
                              className="pair-val-input"
                              placeholder="Value"
                              value={pair.value.value}
                              onChange={(e) =>
                                handleUpdatePairTextValue(idx, e.target.value)
                              }
                            />
                          </>
                        )}

                        <button
                          type="button"
                          className="remove-pair-btn"
                          onClick={() => handleRemovePair(idx)}
                          title="Remove Row"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Nested Pairs Option */}
                      {valType === 'object' && (
                        <div className="pair-nested-container">
                          {pair.value.value.map((child, cIdx) => (
                            <div key={cIdx} className="pair-child-row">
                              <input
                                type="text"
                                className="pair-key-input pair-child-input"
                                placeholder="Child Key"
                                value={child.key}
                                onChange={(e) =>
                                  handleUpdateChildPair(idx, cIdx, e.target.value, child.value)
                                }
                              />
                              <span className="pair-colon">:</span>
                              <input
                                type="text"
                                className="pair-val-input pair-child-input"
                                placeholder="Child Value"
                                value={child.value}
                                onChange={(e) =>
                                  handleUpdateChildPair(idx, cIdx, child.key, e.target.value)
                                }
                              />
                              <button
                                type="button"
                                className="remove-pair-btn"
                                onClick={() => handleRemoveChildPair(idx, cIdx)}
                                title="Remove Child Pair"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="btn-add-child"
                            onClick={() => handleAddChildPair(idx)}
                          >
                            + Add Child Pair
                          </button>
                        </div>
                      )}

                      {/* List Option */}
                      {valType === 'array' && (
                        <div className="pair-nested-container">
                          {pair.value.value.map((item, iIdx) => (
                            <div key={iIdx} className="pair-child-row">
                              <span className="pair-bullet">•</span>
                              <input
                                type="text"
                                className="pair-val-input pair-child-input"
                                placeholder="List item..."
                                value={item}
                                onChange={(e) =>
                                  handleUpdateItem(idx, iIdx, e.target.value)
                                }
                              />
                              <button
                                type="button"
                                className="remove-pair-btn"
                                onClick={() => handleRemoveItem(idx, iIdx)}
                                title="Remove Item"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            className="btn-add-child"
                            onClick={() => handleAddItem(idx)}
                          >
                            + Add Item
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
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
