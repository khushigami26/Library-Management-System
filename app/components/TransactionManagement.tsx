"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Edit,
  Trash2,
  Search,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
} from "lucide-react";
import { addActivity } from "@/lib/activity";
import toast from "react-hot-toast";

type Transaction = {
  id: string;
  bookTitle: string;
  studentEmail: string;
  borrowDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  returnDate?: string; // YYYY-MM-DD
  status: "active" | "overdue" | "returned";
  fineAmount: number;
  finePaid?: boolean;
};

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState({
    bookTitle: "",
    studentEmail: "",
    borrowDate: "",
    dueDate: "",
  });

  // Load transactions from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("transactions");
      if (raw) setTransactions(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (next: Transaction[]) => {
    setTransactions(next);
    localStorage.setItem("transactions", JSON.stringify(next));
  };

  // Compute overdues for display (does not change original unless persisted)
  const withOverdue = useMemo(() => {
    const today = new Date();
    return transactions.map((t) => {
      if (t.status === "active") {
        const due = new Date(t.dueDate);
        if (today > due) {
          const daysLate = Math.ceil(
            (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            ...t,
            status: "overdue" as const,
            fineAmount: Math.max(t.fineAmount, daysLate * 0.5),
          };
        }
      }
      return t;
    });
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return withOverdue.filter(
      (t) =>
        t.bookTitle.toLowerCase().includes(q) ||
        t.studentEmail.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
    );
  }, [withOverdue, search]);

  const openAdd = () => {
    setForm({
      bookTitle: "",
      studentEmail: "",
      borrowDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    });
    setIsAddOpen(true);
  };

  const saveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTx: Transaction = {
      id: Date.now().toString(),
      bookTitle: form.bookTitle.trim(),
      studentEmail: form.studentEmail.trim().toLowerCase(),
      borrowDate: form.borrowDate,
      dueDate: form.dueDate,
      status: "active",
      fineAmount: 0,
    };
    const next = [newTx, ...transactions];
    persist(next);
    await addActivity(
      "Book borrowed",
      `${newTx.bookTitle} for ${newTx.studentEmail}`,
      "librarian",
      undefined,
      "book",
      undefined,
      newTx.bookTitle
    );
    setIsAddOpen(false);
    toast.success("Transaction added successfully!");
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setForm({
      bookTitle: tx.bookTitle,
      studentEmail: tx.studentEmail,
      borrowDate: tx.borrowDate,
      dueDate: tx.dueDate,
    });
    setIsEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const updated: Transaction = { ...editing, ...form } as Transaction;
    const next = transactions.map((t) => (t.id === editing.id ? updated : t));
    persist(next);
    await addActivity(
      "Book returned",
      `${updated.bookTitle} for ${updated.studentEmail}`,
      "librarian",
      undefined,
      "book",
      undefined,
      updated.bookTitle
    );
    setIsEditOpen(false);
    setEditing(null);
    toast.success("Transaction updated successfully!");
  };

  const removeTx = async (id: string) => {
    const tx = transactions.find((t) => t.id === id);
    if (!tx) return;
    if (!confirm("Remove this transaction?")) return;
    const next = transactions.filter((t) => t.id !== id);
    persist(next);
    await addActivity(
      "Book returned",
      `${tx.bookTitle} for ${tx.studentEmail}`,
      "librarian",
      undefined,
      "book",
      undefined,
      tx.bookTitle
    );
    toast.success("Transaction removed successfully!");
  };

  const statusPill = (status: Transaction["status"]) => {
    const map: Record<Transaction["status"], string> = {
      active: "bg-blue-100 text-blue-700",
      overdue: "bg-red-100 text-red-700",
      returned: "bg-gray-100 text-gray-700",
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${map[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Transaction Management
        </h2>
        <button
          onClick={openAdd}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          <span>New Borrow</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by book, student, or status..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="p-6 space-y-4">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                {tx.status === "overdue" ? (
                  <AlertCircle className="h-8 w-8 text-red-600" />
                ) : tx.status === "returned" ? (
                  <CheckCircle className="h-8 w-8 text-gray-600" />
                ) : (
                  <Clock className="h-8 w-8 text-blue-600" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {tx.bookTitle}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {tx.studentEmail} | Borrowed: {tx.borrowDate} | Due:{" "}
                    {tx.dueDate}
                    {tx.returnDate ? ` | Returned: ${tx.returnDate}` : ""}
                  </p>
                  {tx.status === "overdue" && (
                    <p className="text-xs text-red-600 font-medium">
                      Overdue! Fine: ${tx.fineAmount.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusPill(tx.status)}
                <button
                  onClick={() => openEdit(tx)}
                  className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeTx(tx.id)}
                  className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <div>No transactions</div>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Record New Borrow
            </h3>
            <form onSubmit={saveAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Book Title
                </label>
                <input
                  value={form.bookTitle}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, bookTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Email
                </label>
                <input
                  value={form.studentEmail}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, studentEmail: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Borrow Date
                  </label>
                  <input
                    type="date"
                    value={form.borrowDate}
                    onChange={(e) =>
                      setForm((v) => ({ ...v, borrowDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((v) => ({ ...v, dueDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditOpen && editing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit Transaction
            </h3>
            <form onSubmit={saveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Book Title
                </label>
                <input
                  value={form.bookTitle}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, bookTitle: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Email
                </label>
                <input
                  value={form.studentEmail}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, studentEmail: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Borrow Date
                  </label>
                  <input
                    type="date"
                    value={form.borrowDate}
                    onChange={(e) =>
                      setForm((v) => ({ ...v, borrowDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="input"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((v) => ({ ...v, dueDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus-border-transparent"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(false);
                    setEditing(null);
                  }}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
