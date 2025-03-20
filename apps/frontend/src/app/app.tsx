import { ClauseInfo } from '../utils/docxReader';
import { DocumentEditor } from './DocumentEditor';
import { createContext, useState } from 'react';


type DocumentContextType = {
  clauses: ClauseInfo[];
  setClauses: React.Dispatch<React.SetStateAction<ClauseInfo[]>>;
};

export const DocumentContext = createContext<DocumentContextType>({
  clauses: [],
  setClauses: () => {},
});

export function App() {
  const [clauses, setClauses] = useState<ClauseInfo[]>([]);
  return (
    <div>
      <DocumentContext.Provider value={{ clauses, setClauses }}>
        <DocumentEditor />
      </DocumentContext.Provider>
    </div>
  );
}

export default App;
