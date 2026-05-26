/* ─────────────────────────────────────────────
 *  CodeEditorModal — lightweight, uses <dialog>
 *
 *  Install:
 *    npm i @uiw/react-codemirror @codemirror/lang-python @uiw/codemirror-theme-tokyo-night
 * ───────────────────────────────────────────── */

import { useEffect, useRef, useState, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";

interface CodeEditorModalProps {
  title: string;
  value: string;
  placeholder?: string;
  onSave: (code: string) => void;
  onClose: () => void;
}

export function CodeEditorModal({
  title,
  value,
  placeholder,
  onSave,
  onClose,
}: CodeEditorModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState(value);
  const codeRef = useRef(value);
  codeRef.current = code;

  // Open as modal on mount, wire up native close
  useEffect(() => {
    const el = dialogRef.current!;
    el.showModal();
    el.addEventListener("close", onClose);
    return () => el.removeEventListener("close", onClose);
  }, [onClose]);

  // ⌘S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onSave(codeRef.current);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);

  // Close on backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === dialogRef.current) onClose();
    },
    [onClose]
  );

  return (
    <dialog ref={dialogRef} className="ce-dialog" onClick={handleBackdropClick}>
      <div className="ce-panel">
        <header className="ce-header">
          <span className="ce-title">
            <span className="ce-icon">λ</span>
            {title}
          </span>
          <div className="ce-actions">
            <button className="ce-btn" onClick={onClose}>Cancel</button>
            <button className="ce-btn primary" onClick={() => onSave(code)}>
              Save <kbd>⌘S</kbd>
            </button>
          </div>
        </header>

        <CodeMirror
          value={code}
          onChange={setCode}
          theme={tokyoNight}
          extensions={[python()]}
          placeholder={placeholder}
          autoFocus
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: true,
            bracketMatching: true,
            autocompletion: true,
            indentOnInput: true,
            tabSize: 4,
          }}
          style={{ fontSize: 13, minHeight: 260, maxHeight: "55vh", overflow: "auto" }}
        />

        <footer className="ce-footer">
          <span>Python fn of <code>t</code> (sec) → number</span>
          <span className="ce-hint">⌘S save · Esc close</span>
        </footer>
      </div>

      <style>{`
        .ce-dialog {
          padding: 0;
          border: none;
          background: transparent;
          max-width: min(600px, 94vw);
          max-height: 85vh;
          overflow: visible;
        }
        .ce-dialog::backdrop {
          background: rgba(0,0,0,.55);
          backdrop-filter: blur(6px);
        }
        .ce-panel {
          display: flex;
          flex-direction: column;
          background: #0d1117;
          border: 1px solid #1e2a3a;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,.6);
        }
        .ce-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }
        .ce-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font: 600 13px/1 system-ui, sans-serif;
          color: #e4e4e7;
        }
        .ce-icon {
          width: 24px; height: 24px;
          display: grid; place-items: center;
          border-radius: 6px;
          background: rgba(94,187,255,.1);
          color: #5ebbff;
          font: 700 14px/1 monospace;
        }
        .ce-actions { display: flex; gap: 6px; }
        .ce-btn {
          padding: 5px 12px;
          border-radius: 6px;
          font: 500 12px/1.4 system-ui, sans-serif;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,.08);
          background: transparent;
          color: #a1a1aa;
          display: flex; align-items: center; gap: 5px;
          transition: background .12s;
        }
        .ce-btn:hover { background: rgba(255,255,255,.06); }
        .ce-btn.primary {
          background: #3b82f6; color: #fff; border-color: transparent;
        }
        .ce-btn.primary:hover { background: #2563eb; }
        .ce-btn kbd {
          font: 500 9px/1 monospace;
          padding: 1px 4px; border-radius: 3px;
          background: rgba(255,255,255,.15);
        }
        .ce-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 14px;
          border-top: 1px solid rgba(255,255,255,.06);
          font: 11px/1 system-ui, sans-serif;
          color: #546677;
        }
        .ce-footer code {
          padding: 1px 4px; border-radius: 3px;
          background: rgba(94,187,255,.1); color: #5ebbff;
          font: 11px/1 monospace;
        }
        .ce-hint { opacity: .5; }
      `}</style>
    </dialog>
  );
}
