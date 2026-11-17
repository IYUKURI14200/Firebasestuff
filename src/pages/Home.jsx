import { useEffect, useState } from "react";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Home() {
  const { user, logout } = useAuth();
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  // Listen only to THIS user's notes
  useEffect(() => {
    const q = query(collection(db, "notes"), where("uid", "==", user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // sort newest first (done here to avoid needing a Firestore index)
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setNotes(list);
      },
      (err) => setError(err.message)
    );
    return unsub;
  }, [user.uid]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;
    setError("");
    try {
      if (editingId) {
        await updateDoc(doc(db, "notes", editingId), { title, content });
      } else {
        await addDoc(collection(db, "notes"), {
          uid: user.uid,
          title,
          content,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(note) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setContent("");
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this note?")) return;
    await deleteDoc(doc(db, "notes", id));
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">My Notes</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button onClick={logout} className="bg-gray-800 text-white px-3 py-1 rounded">
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow space-y-3">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input
            className="w-full border p-2 rounded"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full border p-2 rounded h-28"
            placeholder="Write your note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex gap-2">
            <button className="bg-blue-600 text-white px-4 py-2 rounded">
              {editingId ? "Update note" : "Add note"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="border px-4 py-2 rounded">
                Cancel
              </button>
            )}
          </div>
        </form>

        {notes.length === 0 && <p className="text-gray-500 text-center">No notes yet.</p>}

        {notes.map((note) => (
          <div key={note.id} className="bg-white p-4 rounded-xl shadow">
            <h2 className="font-semibold text-lg">{note.title}</h2>
            <p className="text-gray-700 whitespace-pre-wrap mt-1">{note.content}</p>
            <div className="mt-3 flex gap-3 text-sm">
              <button onClick={() => startEdit(note)} className="text-blue-600">Edit</button>
              <button onClick={() => handleDelete(note.id)} className="text-red-600">Delete</button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}