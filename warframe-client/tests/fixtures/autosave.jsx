import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import useDebouncedField from '../../src/hooks/useDebouncedField';

// Local-only fixture: no Supabase imports or database writes.
export function Fixture() {
  const [external, setExternal] = useState('Original');
  const [revision, setRevision] = useState(1);
  const [mounted, setMounted] = useState(true);
  const [commits, setCommits] = useState([]);
  return <>
    <h1>Local autosave regression fixture</h1>
    <p>Fake commits only. No database connection.</p>
    <button onClick={() => setExternal('External refresh')}>External refresh</button>
    <button onClick={() => setRevision(r => r + 1)}>Change callback</button>
    <button onClick={() => setMounted(false)}>Unmount editor</button>
    <p>Callback revision: {revision}</p>
    {mounted && <Editor value={external} onCommit={value => setCommits(c => [...c, { value, revision }])} />}
    <pre aria-label="Commit log">{JSON.stringify(commits)}</pre>
  </>;
}
export function Editor({ value, onCommit }) {
  const [local, setLocal] = useDebouncedField(value, onCommit, 1500);
  return <label>Local value <input value={local} onChange={e => setLocal(e.target.value)} /></label>;
}
createRoot(document.getElementById('root')).render(<StrictMode><Fixture /></StrictMode>);
