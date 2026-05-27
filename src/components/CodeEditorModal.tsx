import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { tokyoNight } from "@uiw/codemirror-theme-tokyo-night";
import { Dialog } from "primereact/dialog";
import { Button } from "./buttons/Button";

// Example of how you would import your colors:
// import { colors } from "../utils/colors";

interface CodeEditorModalProps {
  title: string;
  value: string;
  placeholder?: string;
  bgColor?: string; // Add this prop to control the background
  onSave: (code: string) => void;
  onClose: () => void;
}

export function CodeEditorModal({
  title,
  value,
  placeholder,
  // Default to your original dark hex if nothing is passed, 
  // or pass it in from the parent like: bgColor={colors.panelBackground}
  bgColor = "#0d1117",
  onSave,
  onClose,
}: CodeEditorModalProps) {
  const [code, setCode] = useState(value);
  const codeRef = useRef(value);
  codeRef.current = code;

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

  const headerContent = (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ color: "#5ebbff", fontWeight: "bold", fontFamily: "monospace" }}>λ</span>
      <span style={{ fontWeight: "600", fontSize: "15px", color: "#e4e4e7" }}>{title}</span>
    </div>
  );

  const footerContent = (
    <div className="flex justify-end gap-3 mt-3 ml-2 p-2">
      {/* Native Cancel Button */}
      <Button
        onClick={onClose}
        severity="danger"
      >
        Cancel
      </Button>

      {/* Native Save Button */}
      <Button
        onClick={() => onSave(code)}
      // rounded-full forces the pill shape. px-6 py-2 adds the required breathing room.
      >
        <i className="pi pi-check"></i>
        Save
      </Button>
    </div>
  );

  return (
    <Dialog
      visible
      onHide={onClose}
      header={headerContent}
      footer={footerContent}
      style={{
        width: "min(600px, 94vw)",
        border: "1px solid #444c56",
        boxShadow: "0 16px 40px rgba(0,0,0,0.8)",
        borderRadius: "8px",
        backgroundColor: bgColor, // Ensures the base layer is opaque
      }}
    // Explicitly color the PrimeReact sub-sections to override any transparent theme defaults
    >
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
        style={{ fontSize: 14, minHeight: 260, maxHeight: "55vh", overflow: "auto" }}
      />
    </Dialog>
  );
}
