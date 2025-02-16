import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { Card } from "@/components/ui/card";

interface CodeEditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
}

export function CodeEditor({ initialValue = "", onChange }: CodeEditorProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (val: string) => {
    setValue(val);
    onChange?.(val);
  };

  return (
    <Card className="p-4">
      <CodeMirror
        value={value}
        height="200px"
        extensions={[javascript()]}
        onChange={handleChange}
        theme="dark"
      />
    </Card>
  );
}
